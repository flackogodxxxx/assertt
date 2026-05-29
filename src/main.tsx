import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./app";
import "./styles/tailwind.css";
import { AuthProvider } from "./contexts/AuthContext";
import { DemandProvider } from "./contexts/DemandContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { CrmLayout } from "./layouts/CrmLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Demandas } from "./pages/Demandas";
import { Clientes } from "./pages/Clientes";
import { ClientProfile } from "./pages/ClientProfile";
import { Calendario } from "./pages/Calendario";
import { Equipe } from "./pages/Equipe";
import { Unauthorized } from "./pages/Unauthorized";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./ErrorBoundary";

import { Settings } from "./pages/Settings";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

document.documentElement.style.scrollBehavior = "auto";
window.scrollTo(0, 0);
requestAnimationFrame(() => {
  document.documentElement.style.scrollBehavior = "";
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento root não encontrado.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <DemandProvider>
            <BrowserRouter>
              <Routes>
                {/* Rota Pública da Landing Page */}
                <Route path="/" element={<App />} />
                
                {/* Login do CRM */}
                <Route path="/login" element={<Login />} />
                
                {/* Rotas Protegidas do CRM */}
                <Route path="/crm" element={<ProtectedRoute />}>
                  <Route element={<CrmLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="demandas" element={<Demandas />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="clientes/:clientName" element={<ClientProfile />} />
                    <Route path="calendario" element={<Calendario />} />
                    <Route path="equipe" element={<Equipe />} />
                    <Route path="unauthorized" element={<Unauthorized />} />
                    {/* Rotas genéricas de preenchimento */}
                    <Route path="videos" element={<Demandas />} />
                    <Route path="artes" element={<Demandas />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </DemandProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
