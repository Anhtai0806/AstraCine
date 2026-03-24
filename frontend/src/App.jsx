import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientRoutes from "./routes/ClientRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import AdminRoutes from "./routes/AdminRoutes";
import StaffRoutes from "./routes/StaffRoutes";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* ADMIN */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute>
                                <RoleRoute allowRoles={["ROLE_ADMIN"]}>
                                    <AdminRoutes />
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />

                    {/* STAFF */}
                    <Route
                        path="/staff/*"
                        element={
                            <ProtectedRoute>
                                <RoleRoute allowRoles={["ROLE_STAFF", "ROLE_ADMIN"]}>
                                    <StaffRoutes />
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />

                    {/* CLIENT & AUTH (catch-all, must be last) */}
                    <Route path="/*" element={<ClientRoutes />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;