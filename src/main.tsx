import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/tailwind.css";
import { AuthProvider } from "./contexts/AuthContext";
import { DemandProvider } from "./contexts/DemandContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { PresenceProvider } from "./contexts/PresenceContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./ErrorBoundary";

const App = lazy(() =>
  import("./app").then((module) => ({ default: module.App }))
);
const CrmLayout = lazy(() =>
  import("./layouts/CrmLayout").then((module) => ({ default: module.CrmLayout }))
);
const Login = lazy(() =>
  import("./pages/Login").then((module) => ({ default: module.Login }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard }))
);
const Demandas = lazy(() =>
  import("./pages/Demandas").then((module) => ({ default: module.Demandas }))
);
const Clientes = lazy(() =>
  import("./pages/Clientes").then((module) => ({ default: module.Clientes }))
);
const ClientProfile = lazy(() =>
  import("./pages/ClientProfile").then((module) => ({ default: module.ClientProfile }))
);
const Calendario = lazy(() =>
  import("./pages/Calendario").then((module) => ({ default: module.Calendario }))
);
const Equipe = lazy(() =>
  import("./pages/Equipe").then((module) => ({ default: module.Equipe }))
);
const Unauthorized = lazy(() =>
  import("./pages/Unauthorized").then((module) => ({ default: module.Unauthorized }))
);
const IaAssert = lazy(() =>
  import("./pages/IaAssert").then((module) => ({ default: module.IaAssert }))
);
const Settings = lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.Settings }))
);
const DemandWorkspace = lazy(() =>
  import("./features/demands/DemandWorkspace").then((module) => ({
    default: module.DemandWorkspace
  }))
);
const ReviewInbox = lazy(() =>
  import("./features/reviews/ReviewInbox").then((module) => ({
    default: module.ReviewInbox
  }))
);

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

document.documentElement.style.scrollBehavior = "auto";
window.scrollTo(0, 0);
requestAnimationFrame(() => {
  document.documentElement.style.scrollBehavior = "";
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento root não encontrado.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PresenceProvider>
          <NotificationProvider>
            <DemandProvider>
              <BrowserRouter>
                <Suspense
                  fallback={
                    <div className="grid min-h-dvh place-items-center bg-carbon-950 text-sm font-bold text-carbon-300">
                      Carregando WORKOS...
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/login" element={<Login />} />

                    <Route path="/crm" element={<ProtectedRoute />}>
                      <Route element={<CrmLayout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="demandas" element={<Demandas />} />
                        <Route path="demandas/:demandId" element={<DemandWorkspace />} />
                        <Route path="revisoes" element={<ReviewInbox />} />
                        <Route path="clientes" element={<Clientes />} />
                        <Route path="clientes/:clientName" element={<ClientProfile />} />
                        <Route path="calendario" element={<Calendario />} />
                        <Route path="equipe" element={<Equipe />} />
                        <Route path="unauthorized" element={<Unauthorized />} />
                        <Route path="ia" element={<IaAssert />} />
                        <Route path="videos" element={<Demandas />} />
                        <Route path="artes" element={<Demandas />} />
                        <Route path="settings" element={<Settings />} />
                      </Route>
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </DemandProvider>
          </NotificationProvider>
        </PresenceProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
