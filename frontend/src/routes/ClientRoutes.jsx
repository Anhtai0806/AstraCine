// routes/ClientRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import { useAuth } from "../contexts/AuthContext";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import ComboMenu from "../pages/ComboMenu/ComboMenu";
import ProfilePage from "../pages/Profile/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";
import ShowtimeBrowser from "../pages/Booking/ShowtimeBrowser";
import SeatSelection from "../pages/Booking/SeatSelection";
import TicketResult from "../pages/Booking/TicketResult";
import InvoiceSummary from "../pages/InvoiceSummary/InvoiceSummary";
import PaymentSuccess from "../pages/Payment/PaymentSuccess";
import PaymentCancel from "../pages/Payment/PaymentCancel";

import MoviesPage from "../pages/Movies/MoviesPage";
import MovieDetailPage from "../pages/MovieDetail/MovieDetailPage";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword";
import ResetPassword from "../pages/ResetPassword/ResetPassword";
import OrderHistory from "../pages/OrderHistory/OrderHistory";
import MemberPage from "../pages/Member/MemberPage";

export default function ClientRoutes() {
  const { user } = useAuth();
  const isStaffUser = user?.roles?.includes("ROLE_STAFF");

  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<ComboMenu />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              {isStaffUser ? (
                <Navigate to="/staff/profile" replace />
              ) : (
                <ProfilePage />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="order-history"
          element={
            <ProtectedRoute>
              {isStaffUser ? (
                <Navigate to="/staff/profile" replace />
              ) : (
                <OrderHistory />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="member"
          element={
            <ProtectedRoute>
              {isStaffUser ? (
                <Navigate to="/staff/profile" replace />
              ) : (
                <MemberPage />
              )}
            </ProtectedRoute>
          }
        />

        {/* Booking */}
        <Route path="booking" element={<ShowtimeBrowser />} />
        <Route path="booking/movies/:movieId" element={<ShowtimeBrowser />} />
        <Route
          path="booking/showtimes/:showtimeId"
          element={<SeatSelection />}
        />
        <Route
          path="booking/showtimes/:showtimeId/combo"
          element={<ComboMenu />}
        />
        <Route
          path="booking/showtimes/:showtimeId/invoice"
          element={<InvoiceSummary />}
        />

        {/* Movies Page */}
        <Route path="movies" element={<MoviesPage />} />
        <Route path="movies/:movieId" element={<MovieDetailPage />} />

        <Route path="ticket" element={<TicketResult />} />

        {/* ===== FORGOT / RESET PASSWORD (public) ===== */}
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* PayOS Callbacks */}
        <Route path="payment/success" element={<PaymentSuccess />} />
        <Route path="payment/cancel" element={<PaymentCancel />} />

        {/* Movies Page */}
        <Route path="movies" element={<MoviesPage />} />
        <Route path="movies/:movieId" element={<MovieDetailPage />} />
      </Route>
    </Routes>
  );
}
