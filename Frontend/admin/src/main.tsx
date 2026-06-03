import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
  throw new Error("Missing Mapbox token");
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
