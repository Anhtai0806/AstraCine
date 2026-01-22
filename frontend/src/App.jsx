import { BrowserRouter, Routes } from "react-router-dom";
import ClientRoutes from "./routes/ClientRoutes";
import AuthRoutes from "./routes/AuthRoutes";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {ClientRoutes()}
        {AuthRoutes()}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
