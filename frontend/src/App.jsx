import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import SeatSelection from "./pages/Booking/SeatSelection";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* CLIENT LAYOUT */}
                <Route element={<ClientLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/showtimes/:showtimeId/seats" element={<SeatSelection />} />
                </Route>

                {/* AUTH PAGES */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
