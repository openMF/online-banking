import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createServer } from "node:http";
import viteConfig from "../vite.config.ts";
import {
  buildSelfServiceUrl,
  configFromEnvironment,
  createSelfServiceConfigLoader,
  SelfServiceConfigError,
  validateSelfServiceConfig,
} from "../src/lib/self-service-config.ts";

const valid = {
  baseUrl: "https://bank.example/fineract-provider/api/v1/self",
  tenantId: "tenant_01-test",
};
const validate = (baseUrl, options) => validateSelfServiceConfig({ ...valid, baseUrl }, options);

for (const baseUrl of [
  valid.baseUrl,
  "https://bank.example/v1/self",
  "https://bank.example/gateway/banking/api/v1/self/",
  "https://[::1]:8443/fineract-provider/api/v1/self///",
]) {
  test(`valid HTTPS endpoint: ${baseUrl}`, () => {
    const config = validate(baseUrl);
    assert.equal(config.baseUrl, baseUrl.replace(/\/+$/, ""));
    assert.equal(config.tenantId, valid.tenantId);
    assert.ok(Object.isFrozen(config));
    assert.deepEqual(validateSelfServiceConfig(config), config);
    assert.equal(
      buildSelfServiceUrl(config, "clients/123/accounts").href,
      `${config.baseUrl}/clients/123/accounts`,
    );
  });
}

for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
  test(`loopback HTTP is development-only: ${host}`, () => {
    const baseUrl = `http://${host}:8080/proxy/api/v1/self`;
    assert.throws(() => validate(baseUrl), SelfServiceConfigError);
    assert.equal(validate(baseUrl, { allowLocalHttp: true }).baseUrl, baseUrl);
  });
}

for (const [label, value] of Object.entries({
  missing: undefined,
  empty: "",
  malformed: "not a URL",
  relative: "/api/v1/self",
  missingAuthority: "https:bank.example/api/v1/self",
  emptyCredentials: "https://@bank.example/api/v1/self",
  emptyQuery: `${valid.baseUrl}?`,
  emptyFragment: `${valid.baseUrl}#`,
  ftp: "ftp://bank.example/api/v1/self",
  credentials: "https://admin:private-password@bank.example/api/v1/self",
  username: "https://admin@bank.example/api/v1/self",
  remoteHttp: "http://bank.example/api/v1/self",
  misleadingLocalhost: "http://localhost.example/api/v1/self",
  localSuffix: "http://bank.localhost/api/v1/self",
  privateNetwork: "http://192.168.1.2/api/v1/self",
  ipv6NonLoopback: "http://[::2]/api/v1/self",
  query: `${valid.baseUrl}?key=secret`,
  fragment: `${valid.baseUrl}#secret`,
  whitespace: `${valid.baseUrl} `,
  backslash: "https://bank.example\\api/v1/self",
  missingSelf: "https://bank.example/fineract-provider/api",
  duplicate: `${valid.baseUrl}/api/v1/self`,
  nestedResource: `${valid.baseUrl}/clients`,
  doubleSlash: "https://bank.example/proxy//api/v1/self",
  scriptPath: 'https://bank.example/prefix"</script>/api/v1/self',
  encodedSlash: "https://bank.example/proxy%2Fapi/v1/self",
  traversal: "https://bank.example/proxy/../api/v1/self",
  encodedTraversal: "https://bank.example/proxy/%2e%2e/api/v1/self",
})) {
  test(`reject invalid endpoint: ${label}`, () => {
    assert.throws(() => validate(value, { allowLocalHttp: true }), SelfServiceConfigError);
  });
}

for (const tenantId of [
  undefined,
  "",
  " ",
  "tenant name",
  "-tenant",
  "bad\r\nHeader: value",
  "default\n",
  "default\r",
  "default\u2028",
  "a".repeat(101),
  "<script>",
  12,
]) {
  test(`reject invalid tenant: ${JSON.stringify(tenantId)}`, () => {
    assert.throws(() => validateSelfServiceConfig({ ...valid, tenantId }), SelfServiceConfigError);
  });
}
test("missing configuration never falls back to a shared instance", () => {
  for (const value of [undefined, null, {}, { tenantId: "default" }]) {
    assert.throws(() => validateSelfServiceConfig(value), SelfServiceConfigError);
  }
  assert.equal(configFromEnvironment({}), null);
  assert.equal(
    configFromEnvironment({ SELF_SERVICE_BASE_URL: "", SELF_SERVICE_TENANT_ID: "" }),
    null,
  );
  assert.throws(
    () => configFromEnvironment({ SELF_SERVICE_TENANT_ID: "default" }),
    SelfServiceConfigError,
  );
  assert.throws(
    () => configFromEnvironment({ SELF_SERVICE_BASE_URL: valid.baseUrl }),
    SelfServiceConfigError,
  );
});

test("resource paths cannot reset the origin, traverse, or duplicate API prefixes", () => {
  for (const resource of [
    "",
    "/clients",
    "//evil.example",
    "https://evil.example",
    "../clients",
    "clients/../loans",
    "clients?x=1",
    "clients#x",
    "clients\n",
    "clients/%2e%2e",
    "v1/self/clients",
    "api/v1/self/clients",
  ]) {
    assert.throws(() => buildSelfServiceUrl(valid, resource), SelfServiceConfigError);
  }
  const url = buildSelfServiceUrl(valid, "clients/123/accounts");
  url.searchParams.set("type", "savings");
  assert.equal(url.href, `${valid.baseUrl}/clients/123/accounts?type=savings`);
});

test("every consumer awaits the same validated config before constructing an endpoint", async () => {
  let release;
  let calls = 0;
  let constructed = false;
  const getConfig = createSelfServiceConfigLoader({}, async (url, options) => {
    calls++;
    assert.equal(url, "/runtime-config.json");
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  const first = getConfig();
  assert.equal(getConfig(), first);
  const consumer = getConfig().then((config) => {
    constructed = true;
    return buildSelfServiceUrl(config, "clients");
  });
  await Promise.resolve();
  assert.equal(constructed, false);
  release(Response.json(valid));
  assert.equal((await consumer).href, `${valid.baseUrl}/clients`);
  assert.deepEqual(await first, valid);
  assert.equal(calls, 1);
});

for (const [label, fetcher, message] of [
  [
    "network",
    async () => {
      throw new Error("secret network details");
    },
    /Could not load/,
  ],
  [
    "timeout",
    async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
    /Could not load/,
  ],
  ["HTTP", async () => new Response(null, { status: 503 }), /HTTP 503/],
  ["disabled", async () => Response.json(null), /configuration is disabled/],
  ["SPA HTML", async () => new Response("<html>SPA fallback</html>"), /valid configuration JSON/],
  [
    "invalid settings",
    async () => Response.json({ baseUrl: "", tenantId: "default" }),
    /SELF_SERVICE_BASE_URL/,
  ],
]) {
  test(`explicit loader failure: ${label}`, async () => {
    const getConfig = createSelfServiceConfigLoader({}, fetcher);
    await assert.rejects(getConfig(), message);
    await assert.rejects(getConfig(), SelfServiceConfigError);
  });
}

test("startup JSON supports demo-only mode, allowlists public settings, and rejects invalid configuration", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "mx453-"));
  try {
    mkdirSync(path.join(directory, "docker"));
    mkdirSync(path.join(directory, "src/lib"), { recursive: true });
    for (const file of [
      "package.json",
      "docker/generate-runtime-config.mjs",
      "src/lib/self-service-config.ts",
    ]) {
      copyFileSync(file, path.join(directory, file));
    }
    const output = path.join(directory, "runtime-config.json");
    const generate = (env) =>
      spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          path.join(directory, "docker/generate-runtime-config.mjs"),
          output,
        ],
        { encoding: "utf8", env },
      );
    for (const port of [8443, 9443]) {
      const env = {
        SELF_SERVICE_BASE_URL: `https://localhost:${port}/fineract-provider/api/v1/self/`,
        SELF_SERVICE_TENANT_ID: `tenant-${port}`,
        FINERACT_ADMIN_PASSWORD: "private-sentinel",
        SELF_SERVICE_API_KEY: "private-sentinel",
        VITE_SELF_SERVICE_API_KEY: "private-sentinel",
      };
      const result = generate(env);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), {
        baseUrl: env.SELF_SERVICE_BASE_URL.replace(/\/$/, ""),
        tenantId: env.SELF_SERVICE_TENANT_ID,
      });
      assert.equal(readFileSync(output, "utf8").includes("private-sentinel"), false);
      assert.equal(result.stdout, "");
    }
    // Switching an already-configured deployment back to demo must clear the old endpoint.
    for (const env of [{}, { SELF_SERVICE_BASE_URL: "", SELF_SERVICE_TENANT_ID: "" }]) {
      writeFileSync(output, JSON.stringify(valid));
      const result = generate(env);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(readFileSync(output, "utf8")), null);
    }
    for (const env of [
      { SELF_SERVICE_BASE_URL: valid.baseUrl },
      { SELF_SERVICE_TENANT_ID: "default" },
      { SELF_SERVICE_BASE_URL: " ", SELF_SERVICE_TENANT_ID: " " },
      { SELF_SERVICE_BASE_URL: "http://localhost/api/v1/self", SELF_SERVICE_TENANT_ID: "default" },
      {
        SELF_SERVICE_BASE_URL: "https://admin:private-sentinel@localhost/api/v1/self",
        SELF_SERVICE_TENANT_ID: "default",
      },
      {
        SELF_SERVICE_BASE_URL: valid.baseUrl,
        SELF_SERVICE_TENANT_ID: '"</script>private-sentinel',
      },
    ]) {
      writeFileSync(output, JSON.stringify(valid));
      const result = generate(env);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\[Self Service\]/);
      assert.equal(result.stderr.includes("private-sentinel"), false);
      assert.throws(() => readFileSync(output), { code: "ENOENT" });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Nginx configuration keeps runtime JSON uncached and separate from SPA fallback", () => {
  const nginx = readFileSync("nginx.conf", "utf8");
  const location = nginx.match(/location = \/runtime-config\.json \{([^}]+)\}/)?.[1];
  assert.ok(location);
  assert.match(location, /default_type application\/json/);
  assert.match(location, /add_header Cache-Control "no-store" always/);
  assert.match(location, /try_files \$uri =404/);
  assert.match(location, /X-Content-Type-Options "nosniff"/);
  assert.match(nginx, /Cache-Control "public, immutable"/);
  assert.match(nginx, /try_files \$uri \$uri\/ \/index.html/);
});

test("Vite development middleware serves the same public contract and safe errors without exposing the environment", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "mx453-vite-"));
  const originalEnvironment = {
    SELF_SERVICE_BASE_URL: process.env.SELF_SERVICE_BASE_URL,
    SELF_SERVICE_TENANT_ID: process.env.SELF_SERVICE_TENANT_ID,
  };
  delete process.env.SELF_SERVICE_BASE_URL;
  delete process.env.SELF_SERVICE_TENANT_ID;
  try {
    for (const [env, status] of [
      [
        "SELF_SERVICE_BASE_URL=http://[::1]:8443/proxy/api/v1/self/\nSELF_SERVICE_TENANT_ID=local\nPRIVATE_KEY=private-sentinel\n",
        200,
      ],
      [
        "SELF_SERVICE_BASE_URL=http://localhost.evil/api/v1/self\nSELF_SERVICE_TENANT_ID=local\n",
        503,
      ],
      ["", 200],
      ["SELF_SERVICE_TENANT_ID=default\n", 503],
    ]) {
      writeFileSync(path.join(directory, ".env"), env);
      const plugin = viteConfig({ mode: "development" }).plugins.find(
        (plugin) => plugin.name === "self-service-development-config",
      );
      let middleware;
      plugin.configureServer({
        config: { envDir: directory },
        middlewares: {
          use: (handler) => {
            middleware = handler;
          },
        },
      });
      const server = createServer((request, response) =>
        middleware(request, response, () => {
          response.statusCode = 404;
          response.end();
        }),
      );
      try {
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const response = await fetch(
          `http://127.0.0.1:${server.address().port}/runtime-config.json`,
        );
        assert.equal(response.status, status);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const body = await response.text();
        assert.equal(body.includes("private-sentinel"), false);
        if (!env) {
          assert.equal(JSON.parse(body), null);
        } else if (status === 200) {
          assert.deepEqual(JSON.parse(body), {
            baseUrl: "http://[::1]:8443/proxy/api/v1/self",
            tenantId: "local",
          });
        } else {
          assert.match(JSON.parse(body).error, /SELF_SERVICE_/);
        }
      } finally {
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    }
  } finally {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const pagePath of ["/", "/index.html"]) {
  test(`root-hosted configuration loads at ${pagePath}`, async () => {
    const getConfig = createSelfServiceConfigLoader(
      {},
      async (resource) => {
        assert.equal(resource, "/runtime-config.json");
        return Response.json(valid);
      },
      pagePath,
    );
    assert.deepEqual(await getConfig(), valid);
  });
}

for (const pagePath of [
  "/online-banking/",
  "/online-banking",
  "/online-banking/index.html",
  "//evil.example/",
  "https://evil.example/",
  "/nested/route",
]) {
  test(`unsupported deployment path rejects before fetching: ${pagePath}`, async () => {
    let requested = false;
    const getConfig = createSelfServiceConfigLoader(
      {},
      async () => {
        requested = true;
        return Response.json(valid);
      },
      pagePath,
    );
    await assert.rejects(getConfig(), /Subpath deployments are unsupported/);
    assert.equal(requested, false);
  });
}
