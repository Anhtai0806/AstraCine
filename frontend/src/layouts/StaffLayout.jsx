import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./StaffLayout.css";

const positionLabels = {
    COUNTER: "Nhân viên quầy vé",
    CHECKIN: "Nhân viên soát vé",
    CONCESSION: "Nhân viên quầy combo",
    MULTI: "Nhân viên đa nhiệm",
};

export default function StaffLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const roles = user?.roles || [];
    const rawPosition = user?.staffPosition || "";
    const position = rawPosition.toUpperCase().trim();

    const effectivePosition = position || (roles.includes("ROLE_ADMIN") ? "MULTI" : "");
    const hasAssignedPosition = Boolean(effectivePosition);

    const canCounter = effectivePosition === "COUNTER" || effectivePosition === "MULTI";
    const canCheckin = effectivePosition === "CHECKIN" || effectivePosition === "MULTI";
    const canConcession =
        effectivePosition === "CONCESSION" || effectivePosition === "MULTI" || effectivePosition === "COUNTER";

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="staff-layout">
            <aside className="staff-sidebar">
                <div className="staff-brand">
                    Astra<span>Cine</span> Staff
                </div>

                <div className="staff-user-box">
                    <div className="staff-user-name">{user?.fullName || user?.username}</div>
                    <div className="staff-user-role">
                        {positionLabels[effectivePosition] || "Chưa gán vị trí"}
                    </div>
                </div>

                <nav className="staff-nav">
                    <NavLink
                        to="/staff"
                        end
                        className={({ isActive }) =>
                            isActive ? "staff-nav-link active" : "staff-nav-link"
                        }
                    >
                        🏠 Tổng quan
                    </NavLink>

                    <NavLink
                        to="/staff/profile"
                        className={({ isActive }) =>
                            isActive ? "staff-nav-link active" : "staff-nav-link"
                        }
                    >
                        👤 Thông tin cá nhân
                    </NavLink>

                    <NavLink
                        to="/staff/schedule"
                        className={({ isActive }) =>
                            isActive ? "staff-nav-link active" : "staff-nav-link"
                        }
                    >
                        🗓️ Lịch làm việc
                    </NavLink>


                    <NavLink
                        to="/staff/attendance"
                        className={({ isActive }) =>
                            isActive ? "staff-nav-link active" : "staff-nav-link"
                        }
                    >
                        ⏱️ Chấm công
                    </NavLink>

                    <NavLink
                        to="/staff/payroll"
                        className={({ isActive }) =>
                            isActive ? "staff-nav-link active" : "staff-nav-link"
                        }
                    >
                        💰 Lương tạm tính
                    </NavLink>

                    {hasAssignedPosition && canCounter && (
                        <NavLink
                            to="/staff/booking"
                            className={({ isActive }) =>
                                isActive ? "staff-nav-link active" : "staff-nav-link"
                            }
                        >
                            🎟️ Bán vé tại quầy
                        </NavLink>
                    )}

                    {hasAssignedPosition && canConcession && (
                        <NavLink
                            to="/staff/combo-sales"
                            className={({ isActive }) =>
                                isActive ? "staff-nav-link active" : "staff-nav-link"
                            }
                        >
                            🍿 Bán combo riêng
                        </NavLink>
                    )}

                    {hasAssignedPosition && canCheckin && (
                        <NavLink
                            to="/staff/ticket-checkin"
                            className={({ isActive }) =>
                                isActive ? "staff-nav-link active" : "staff-nav-link"
                            }
                        >
                            ✅ Soát vé QR
                        </NavLink>
                    )}

                    {!hasAssignedPosition && (
                        <div className="staff-nav-hint">
                            Tài khoản này chưa được admin gán vị trí làm việc nên chưa thể dùng các chức năng nghiệp vụ.
                        </div>
                    )}
                </nav>

                <div className="staff-sidebar-footer">
                    <button className="staff-danger-btn" onClick={handleLogout}>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            <main className="staff-main">
                <Outlet />
            </main>
        </div>
    );
}
