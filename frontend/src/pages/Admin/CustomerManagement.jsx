import React, { useEffect, useState } from "react";
import { customerManagementAPI } from "../../api/adminApi";
import "./CustomerManagement.css";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // 🔥 Fetch API
  const fetchCustomers = async (searchValue = "") => {
    try {
      setLoading(true);
      setIsSearching(!!searchValue);

      const res = await customerManagementAPI.getAll(searchValue);
      setCustomers(res.data || []);
    } catch (err) {
      console.error("ERROR:", err);
      alert(err.response?.data?.message || "Lỗi load user");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Load lần đầu
  useEffect(() => {
    fetchCustomers();
  }, []);

  // 🔥 Debounce search (gõ là search)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(keyword);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [keyword]);

  // 🔥 Enter search ngay
  const handleSearch = () => {
    fetchCustomers(keyword);
  };

  // 🔒 Lock user
  const openLockModal = (user) => {
  setSelectedUser(user);
  setReason("");
  setError("");
  setShowModal(true);
};

const handleConfirmLock = async () => {
  if (!reason.trim()) {
    setError("⚠️ Vui lòng nhập lý do khóa!");
    return;
  }

  try {
    await customerManagementAPI.lock(selectedUser.id, reason);
    setShowModal(false);
    fetchCustomers(keyword);
  } catch (err) {
    setError(err.response?.data?.message || "Lỗi khóa user");
  }
};

  // 🔓 Unlock user
  const handleUnlock = async (id) => {
    try {
      await customerManagementAPI.unlock(id);
      alert("Đã mở khóa user");
      fetchCustomers(keyword);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi mở khóa");
    }
  };

  return (
    <div className="customer-page">
      <h2>Quản lý Customer</h2>

      {/* 🔍 Search */}
      <div className="search-box">
        <div className="search-input-wrapper">
          <span className="icon">🔍</span>
          <input
            placeholder="Tìm theo username/sđt/tên/email"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <button onClick={handleSearch} disabled={loading}>
            Tìm
          </button>
        </div>
      </div>

      {/* 🔄 Loading */}
      {loading && <p style={{ marginTop: "10px" }}>⏳ Đang tìm...</p>}

      {/* ❌ Không có kết quả */}
      {!loading && customers.length === 0 && isSearching && (
        <p style={{ marginTop: "10px", color: "red" }}>
          ❌ Không tìm thấy khách hàng nào
        </p>
      )}

      {/* 📭 Không có data */}
      {!loading && customers.length === 0 && !isSearching && (
        <p>Chưa có khách hàng nào</p>
      )}

      {/* 📊 Table */}
      {!loading && customers.length > 0 && (
        <table className="customer-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Trạng thái</th>
              <th>Lý do khóa</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.phone || "-"}</td>

                <td>
                  {user.enabled ? (
                    <span className="active">Hoạt động</span>
                  ) : (
                    <span className="locked">Đã khóa</span>
                  )}
                </td>

                <td>{user.lockReason || "-"}</td>

                <td>
                  {user.enabled ? (
                    <button
                      className="btn-lock"
                      onClick={() => openLockModal(user)}
                    >
                      Khóa
                    </button>
                  ) : (
                    <button
                      className="btn-unlock"
                      onClick={() => handleUnlock(user.id)}
                    >
                      Mở khóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 🔎 Hiển thị keyword */}
      {!loading && isSearching && customers.length > 0 && (
        <p style={{ marginTop: "10px" }}>
          Kết quả cho: <b>{keyword}</b>
        </p>
      )}

      {showModal && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>🔒 Khóa tài khoản</h3>

      <p>
        User: <b>{selectedUser?.username}</b>
      </p>

      <textarea
        placeholder="Nhập lý do khóa..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <div className="modal-actions">
        <button onClick={() => setShowModal(false)}>Hủy</button>
        <button className="confirm" onClick={handleConfirmLock}>
          Xác nhận
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default CustomerManagement;
