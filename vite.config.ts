import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { configFromEnvironment, SelfServiceConfigError } from "./src/lib/self-service-config.ts";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      name: "self-service-development-config",
      // Production gets this resource from the container entrypoint, never the bundle.
      configureServer(server) {
        const env = loadEnv(mode, server.config.envDir, "");
        server.middlewares.use((request, response, next) => {
          if (request.url?.split("?")[0] !== "/runtime-config.json") return next();
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          try {
            response.end(JSON.stringify(configFromEnvironment(env, { allowLocalHttp: true })));
          } catch (error) {
            response.statusCode = 503;
            response.end(
              JSON.stringify({
                error:
                  error instanceof SelfServiceConfigError
                    ? error.message
                    : "Invalid Self Service configuration.",
              }),
            );
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
