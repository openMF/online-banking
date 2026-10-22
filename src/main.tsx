import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { I18nProvider } from "./i18n";
import { getSelfServiceConfig } from "./lib/self-service";

// Preload configuration independently of the in-memory demo. Future API consumers
// must await getSelfServiceConfig()/selfServiceUrl() before making requests.
void getSelfServiceConfig().catch((error: Error) => {
  console.warn(
    `[Self Service] ${error.message} Demo remains available; no backend connection is established.`,
  );
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
