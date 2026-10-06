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

// Shared token API. Page-specific rules remain with their owning surfaces.
import "./styles/lab-design-system.css";
import "./styles/lab-workspace.css";
// Legacy styles for backwards compatibility
import "./styles.css";
import "./styles/light-redesign.css";
import "./styles/workspace-shell.css";
import "./styles/project-shell.css";
import "./styles/final-workspace.css";
import "./styles/catalog-profile.css";

// Surface imports follow the shared foundation so scoped styles win equally
// specific legacy selectors in both Vite development and production builds.
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
