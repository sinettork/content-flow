import React from "react";
import ReactDOM from "react-dom/client";

import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";
import "@/index.css";
import "@/stores/theme-store"; // side-effect: apply theme on load

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <RouteErrorBoundary>
        <AppRouter />
      </RouteErrorBoundary>
    </Providers>
  </React.StrictMode>
);
