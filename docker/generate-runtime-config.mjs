import { renameSync, rmSync, writeFileSync } from "node:fs";
import { configFromEnvironment, SelfServiceConfigError } from "../src/lib/self-service-config.ts";

const output = process.argv[2] ?? "/usr/share/nginx/html/runtime-config.json";
try {
  // Deliberate allowlist; production never enables the local HTTP exception.
  const config = configFromEnvironment(process.env);
  writeFileSync(`${output}.tmp`, `${JSON.stringify(config)}\n`, { mode: 0o644 });
  renameSync(`${output}.tmp`, output);
} catch (error) {
  rmSync(output, { force: true });
  rmSync(`${output}.tmp`, { force: true });
  console.error(
    `[Self Service] ${error instanceof SelfServiceConfigError ? error.message : "Could not write runtime configuration."}`,
  );
  process.exitCode = 1;
}
