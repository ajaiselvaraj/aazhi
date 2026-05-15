import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
          <Route path="/track/*" element={<TrackingApp />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </OrientationProvider>
  </React.StrictMode>
);
