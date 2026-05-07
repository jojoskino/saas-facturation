import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/app/ClientsPage";
import DevisPage from "./pages/app/DevisPage";
import FacturesPage from "./pages/app/FacturesPage";
import ProfilePage from "./pages/app/ProfilePage";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/clients" element={<ClientsPage />} />
          <Route path="/app/profil" element={<ProfilePage />} />
          <Route path="/app/devis" element={<DevisPage />} />
          <Route path="/app/factures" element={<FacturesPage />} />
          <Route path="/app/*" element={<NotFound inApp />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;