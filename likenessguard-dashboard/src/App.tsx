import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Home } from "./pages/Home";
import { Registration } from "./pages/Registration";
import { ConsentPolicyPage as ConsentPolicy } from "./pages/ConsentPolicy";
import { ConsentCheck } from "./pages/ConsentCheck";
import { PromptPlayground } from "./pages/PromptPlayground";
import { FutureVision } from "./pages/FutureVision";
import { ActivityLogs } from "./pages/ActivityLogs";
import { Violations } from "./pages/Violations";
import { ImpactDashboard } from "./pages/ImpactDashboard";
import { FederatedRegistry } from "./pages/FederatedRegistry";
import { theme } from "./styles/theme";
import "./styles/global.css";

export const AppContent: React.FC = () => (
  <div style={{ display: "flex", minHeight: "100vh", background: theme.backgrounds.primary, color: theme.text.primary }}>
    <Sidebar />
    <main style={{ flex: 1, marginLeft: "280px", padding: theme.spacing.xl, transition: "margin-left 0.3s ease" }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/consent-policy" element={<ConsentPolicy />} />
        <Route path="/consent-check" element={<ConsentCheck />} />
        <Route path="/prompt-playground" element={<PromptPlayground />} />
        <Route path="/future-vision" element={<FutureVision />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/violations" element={<Violations />} />
        <Route path="/impact" element={<ImpactDashboard />} />
        <Route path="/federation" element={<FederatedRegistry />} />
      </Routes>
    </main>
  </div>
);

export const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

