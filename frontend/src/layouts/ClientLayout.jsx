import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Outlet } from "react-router-dom";
import "./ClientLayout.css";

function ClientLayout() {
  return (
    <div className="client-layout">
      <Header />
      <main className="client-container">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default ClientLayout;
