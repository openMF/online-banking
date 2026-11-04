import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
plugins: [react()],
resolve: {
alias: {
"@": path.resolve(__dirname, "src"),
},
},
test: {
environment: "jsdom",
environmentOptions: {
jsdom: {
url: "http://localhost",
},
},
setupFiles: ["./src/test-setup.ts"],
include: ["src/**/*.test.{ts,tsx}"],
restoreMocks: true,
unstubGlobals: true,
unstubEnvs: true,
},
});
