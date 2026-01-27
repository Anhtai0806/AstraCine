import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientRoutes from "./routes/ClientRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* CLIENT */}
          <Route path="/*">
            {ClientRoutes()}
          </Route>

          {/* ADMIN */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <RoleRoute allowRoles={["ROLE_ADMIN"]}>
                  <AdminLayout />
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