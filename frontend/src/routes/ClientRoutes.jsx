// routes/ClientRoutes.jsx
import { Routes, Route } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import ComboMenu from "../pages/ComboMenu/ComboMenu"
import ProfilePage from "../pages/Profile/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";
import ShowtimeBrowser from "../pages/Booking/ShowtimeBrowser";
import SeatSelection from "../pages/Booking/SeatSelection";

import MoviesPage from "../pages/Movies/MoviesPage";
import MovieDetailPage from "../pages/MovieDetail/MovieDetailPage";

export default function ClientRoutes() {
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
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="booking" element={<ShowtimeBrowser />} />
      <Route path="booking/showtimes/:showtimeId" element={<SeatSelection />} />

      {/* Movies Page */}
      <Route path="movies" element={<MoviesPage />} />
      <Route path="movies/:movieId" element={<MovieDetailPage />} />
    </Route>
    </Routes>
  );
}
