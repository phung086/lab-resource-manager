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
// New LAB Design System (Modern Academic)
import "./styles/lab-design-system.css";
import "./styles/lab-app-shell.css";
import "./styles/lab-workspace.css";
import "./styles/lab-landing.css";
// Legacy styles for backwards compatibility
import "./styles.css";
import "./styles/light-redesign.css";
import "./styles/workspace-shell.css";
import "./styles/project-shell.css";
import "./styles/final-workspace.css";
import "./styles/catalog-profile.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
