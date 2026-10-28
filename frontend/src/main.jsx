import React from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/vietnamese-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/vietnamese-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/vietnamese-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-sans/vietnamese-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/vietnamese-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/vietnamese-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/vietnamese-600.css";

import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import App from "./App.jsx";
// Structural styles retained for existing business screens.
import "./styles/global.css"; // single global layer: order of the former 10 files is preserved inside
import "./styles/spectrum.css";
import "./styles/liquid-glass.css"; // landing liquid-glass layer, last so its hero/section overrides win
// The shared system owns the final presentation, after structural styles.

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
