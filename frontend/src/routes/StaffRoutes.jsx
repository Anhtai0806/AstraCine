import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import StaffLayout from "../layouts/StaffLayout";
import StaffDashboard from "../pages/Staff/StaffDashboard";
import StaffCounterCheckout from "../pages/Staff/StaffCounterCheckout";
import StaffTicketScanner from "../pages/Staff/StaffTicketScanner";
import StaffComboSale from "../pages/Staff/StaffComboSale";
import ShowtimeBrowser from "../pages/Booking/ShowtimeBrowser";
import SeatSelection from "../pages/Booking/SeatSelection";
import ComboMenu from "../pages/ComboMenu/ComboMenu";
import ProfilePage from "../pages/Profile/ProfilePage";

export default function StaffRoutes() {
    const { user } = useAuth();

    const roles = user?.roles || [];
    const rawPosition = user?.staffPosition || "";
    const position = rawPosition.toUpperCase().trim();

    const effectivePosition = position || (roles.includes("ROLE_ADMIN") ? "MULTI" : "");

    const canCounter = effectivePosition === "COUNTER" || effectivePosition === "MULTI";
    const canCheckin = effectivePosition === "CHECKIN" || effectivePosition === "MULTI";
    const canConcession =
        effectivePosition === "CONCESSION" || effectivePosition === "MULTI" || effectivePosition === "COUNTER";

    return (
        <Routes>
            <Route element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="profile" element={<ProfilePage />} />

                <Route
                    path="booking"
                    element={canCounter ? <ShowtimeBrowser /> : <Navigate to="/staff" replace />}
                />
                <Route
                    path="showtimes/:showtimeId"
                    element={canCounter ? <SeatSelection /> : <Navigate to="/staff" replace />}
                />
                <Route
                    path="showtimes/:showtimeId/combo"
                    element={canCounter ? <ComboMenu /> : <Navigate to="/staff" replace />}
                />
                <Route
                    path="showtimes/:showtimeId/checkout"
                    element={canCounter ? <StaffCounterCheckout /> : <Navigate to="/staff" replace />}
                />
                <Route
                    path="combo-sales"
                    element={canConcession ? <StaffComboSale /> : <Navigate to="/staff" replace />}
                />
                <Route
                    path="ticket-checkin"
                    element={canCheckin ? <StaffTicketScanner /> : <Navigate to="/staff" replace />}
                />

                <Route path="*" element={<Navigate to="/staff" replace />} />
            </Route>
        </Routes>
    );
}
