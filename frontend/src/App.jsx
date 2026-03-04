import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientRoutes from "./routes/ClientRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import AdminRoutes from "./routes/AdminRoutes";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* CLIENT & AUTH - Đã bao gồm /login, /register và /menu */}
                    <Route path="/*" element={<ClientRoutes />} />


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
                                <RoleRoute allowRoles={["STAFF"]}>
                                    {/* Component cho Staff sẽ thêm sau */}
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;