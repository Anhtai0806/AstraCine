import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";

// Import các trang Admin vừa tạo
import Dashboard from "./pages/Admin/Dashboard";
import ComboManager from "./pages/Admin/Combo";
import MovieManager from "./pages/Admin/Movie";

import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* CLIENT */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="combos" element={<ComboManager />} />
          <Route path="movies" element={<MovieManager />} />
          
          {/* Những trang chưa làm thì để tạm h2 */}
          <Route path="showtimes" element={<h2>Quản lý Lịch Chiếu</h2>} />
          <Route path="rooms" element={<h2>Quản lý Phòng & Ghế</h2>} />
          <Route path="users" element={<h2>Quản lý Người Dùng</h2>} />
        </Route>

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;