import React, { useEffect, useState } from "react";
import { userAPI } from "../../api/adminApi";
import "./AdminUsers.css";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [lockReason, setLockReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getAll(page);
      setUsers(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleLock = async (id) => {
    if (!lockReason.trim()) {
      alert("Vui lòng nhập lý do khóa tài khoản!");
      return;
    }

    try {
      await userAPI.lock(id, { reason: lockReason });
      setLockReason("");
      setSelectedUserId(null);
      fetchUsers();
    } catch (error) {
      console.error("Error locking user:", error);
    }
  };

  const handleUnlock = async (id) => {
    try {
      await userAPI.unlock(id);
      fetchUsers();
    } catch (error) {
      console.error("Error unlocking user:", error);
    }
  };

  return (
    <div className="admin-users">
      <h2>User Management</h2>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Lock Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  {user.enabled ? (
                    <span className="status-active">Active</span>
                  ) : (
                    <span className="status-locked">Locked</span>
                  )}
                </td>
                <td>{user.lockReason || "-"}</td>
                <td>
                  {user.enabled ? (
                    <>
                      {selectedUserId === user.id ? (
                        <>
                          <input
                            type="text"
                            placeholder="Enter lock reason"
                            value={lockReason}
                            onChange={(e) =>
                              setLockReason(e.target.value)
                            }
                            className="lock-input"
                          />
                          <button
                            className="btn-confirm"
                            onClick={() => handleLock(user.id)}
                          >
                            Confirm Lock
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-lock"
                          onClick={() =>
                            setSelectedUserId(user.id)
                          }
                        >
                          Lock
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn-unlock"
                      onClick={() => handleUnlock(user.id)}
                    >
                      Unlock
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-wrapper">
        <button
          className="pagination-btn"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>

        <button
          className="pagination-btn"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminUsers;