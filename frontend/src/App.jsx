import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RouteFallback from "./components/RouteFallback";
import AppLayout from "./layout/AppLayout";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LegalMentions = lazy(() => import("./pages/LegalMentions"));
const LegalPrivacy = lazy(() => import("./pages/LegalPrivacy"));
const ClientsPage = lazy(() => import("./pages/app/ClientsPage"));
const DevisPage = lazy(() => import("./pages/app/DevisPage"));
const FacturesPage = lazy(() => import("./pages/app/FacturesPage"));
const ProfilePage = lazy(() => import("./pages/app/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));
const RapportsPage = lazy(() => import("./pages/app/RapportsPage"));
const BillingPage = lazy(() => import("./pages/app/BillingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LazyPage({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <LazyPage>
              <Home />
            </LazyPage>
          }
        />
        <Route
          path="/login"
          element={
            <LazyPage>
              <Login />
            </LazyPage>
          }
        />
        <Route
          path="/register"
          element={
            <LazyPage>
              <Register />
            </LazyPage>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <LazyPage>
              <ForgotPassword />
            </LazyPage>
          }
        />
        <Route
          path="/reset-password"
          element={
            <LazyPage>
              <ResetPassword />
            </LazyPage>
          }
        />
        <Route
          path="/legal/mentions"
          element={
            <LazyPage>
              <LegalMentions />
            </LazyPage>
          }
        />
        <Route
          path="/legal/confidentialite"
          element={
            <LazyPage>
              <LegalPrivacy />
            </LazyPage>
          }
        />
        <Route element={<AppLayout />}>
          <Route
            path="/app"
            element={
              <LazyPage>
                <Dashboard />
              </LazyPage>
            }
          />
          <Route
            path="/app/clients"
            element={
              <LazyPage>
                <ClientsPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/profil"
            element={
              <LazyPage>
                <ProfilePage />
              </LazyPage>
            }
          />
          <Route
            path="/app/abonnement"
            element={
              <LazyPage>
                <BillingPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/parametres"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/devis"
            element={
              <LazyPage>
                <DevisPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/factures"
            element={
              <LazyPage>
                <FacturesPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/rapports"
            element={
              <LazyPage>
                <RapportsPage />
              </LazyPage>
            }
          />
          <Route
            path="/app/*"
            element={
              <LazyPage>
                <NotFound inApp />
              </LazyPage>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <LazyPage>
              <NotFound />
            </LazyPage>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
