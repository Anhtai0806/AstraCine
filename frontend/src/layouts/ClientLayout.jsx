import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./ClientLayout.css";

function ClientLayout() {
    const { user } = useAuth();
    const isStaffOnlyUser = user?.roles?.includes("ROLE_STAFF") && !user?.roles?.includes("ROLE_ADMIN");

    if (isStaffOnlyUser) {
        return (
            <div className="client-layout">
                <main className="client-container">
                    <Outlet />
                </main>
            </div>
        );
    }

    return (
        <div className="client-layout">
            <Header />
            <main className="client-container">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default ClientLayout;
