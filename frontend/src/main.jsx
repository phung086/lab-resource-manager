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
import "./styles.css";
import "./styles/light-redesign.css";
import "./styles/project-shell.css";
import "./styles/final-workspace.css";
// S1b: workspace-shell.css after light-redesign.css so violet token overrides win cascade
import "./styles/workspace-shell.css";
import "./styles/catalog-profile.css";
// The shared system owns the final presentation, after structural styles.
import "./styles/lab-design-system.css";
import "./styles/lab-app-shell.css";
import "./styles/lab-workspace.css";
import "./styles/lab-landing.css";
import "./styles/staff-workspace.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
