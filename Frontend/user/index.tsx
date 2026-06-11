import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
  console.warn("VITE_MAPBOX_ACCESS_TOKEN is not defined. Map visualizations will be disabled.");
}


import App from "./App";
import TrackingApp from "./TrackingApp";
import { OrientationProvider } from "./contexts/OrientationContext";
import './index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OrientationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/track/:complaintId" element={<TrackingApp />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </OrientationProvider>
  </React.StrictMode>
);
