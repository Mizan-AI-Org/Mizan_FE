import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from "react";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import './i18n';
import { initSentry } from "./sentry";

initSentry();

// When a new deployment replaces content-hashed JS chunks, any lazy import
// that references the old chunk URL will fail. Vite emits this event in that
// case — reload the page so the browser picks up the latest build.
window.addEventListener('vite:preloadError', () => {
    window.location.reload();
});

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <ErrorBoundary>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ErrorBoundary>
    </BrowserRouter>
);
