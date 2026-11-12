import React from "react";
import { createRoot } from "react-dom/client";

// Weight entries include unicode ranges, so VI/Latin subsets load as needed.
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import App from "./App.jsx";
import { ThemeProvider } from "./providers/ThemeProvider";
// Structural styles retained for existing business screens.
import "./styles/global.css"; // single global layer: order of the former 10 files is preserved inside
import "./styles/spectrum.css";
import "./styles/liquid-glass.css";
import "./styles/lab-motion.css"; // shared kinetic vocabulary, wins the motion namespace
import "./styles/feedback-visibility.css";
import "./styles/lab-workflows.css"; // Scoped directory, workflow board and image navigation only
import "./styles/lab-studio.css";
import "./styles/system-consistency.css";
import "./styles/workspace-popovers.css";
import "./styles/studio-theme.css";
import "./styles/lab-contact.css";
// The shared system owns the final presentation, after structural styles.

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider><App /></ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
