import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClientRoutes from "./routes/ClientRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import AdminRoutes from "./routes/AdminRoutes";
<<<<<<< HEAD

=======
>>>>>>> 9e86ed7ab229e096bde335ced0312381a6d208e9
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* CLIENT */}
          <Route path="/*">
            {ClientRoutes()}
          </Route>

<<<<<<< HEAD
          {/* ADMIN - TEMPORARY: No auth for testing */}
          <Route path="/admin/*" element={<AdminRoutes />} />
=======
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
>>>>>>> 9e86ed7ab229e096bde335ced0312381a6d208e9

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