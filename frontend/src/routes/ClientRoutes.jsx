import { Route } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import Home from "../pages/Home/Home";

export default function ClientRoutes() {
  return (
    <Route element={<ClientLayout />}>
      <Route path="/" element={<Home />} />
      {/* sau này thêm */}
      {/* <Route path="/movies" element={<MovieList />} /> */}
      {/* <Route path="/movies/:id" element={<MovieDetail />} /> */}
    </Route>
  );
}
