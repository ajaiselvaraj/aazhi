import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
  console.warn("VITE_MAPBOX_ACCESS_TOKEN is not defined. Map visualizations will be disabled.");
}

import App from "./App";
import ComplaintTrackingPage from "./components/ComplaintTrackingPage";
import { OrientationProvider } from "./contexts/OrientationContext";
import { AriaLiveAnnouncer } from "./components/accessibility/AriaLiveAnnouncer";
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OrientationProvider>
      <AriaLiveAnnouncer>
        <BrowserRouter>
          <Routes>
            <Route path="/track/:complaintId" element={<ComplaintTrackingPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </AriaLiveAnnouncer>
    </OrientationProvider>
  </React.StrictMode>
);
