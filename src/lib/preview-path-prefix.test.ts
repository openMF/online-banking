import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prefixRewrite, previewPathPrefix } from "./preview-path-prefix.ts";

const PORT = "/hds-up68yqz8egcm-6014-7b575";

describe("previewPathPrefix", () => {
  it("reads the port id segment on path-based preview hosts", () => {
    assert.equal(previewPathPrefix("preview.grokgsac.com", `${PORT}/`), PORT);
    assert.equal(previewPathPrefix("Preview.Grok.GenAI.mil", `${PORT}/about`), PORT);
    assert.equal(previewPathPrefix("preview.grok.mil", PORT), PORT);
  });

  it("ignores other hosts and paths without a port id", () => {
    assert.equal(previewPathPrefix("abc.grok-sandbox.com", `${PORT}/`), undefined);
    assert.equal(previewPathPrefix("localhost", `${PORT}/`), undefined);
    assert.equal(previewPathPrefix("preview.grokgsac.com", "/about"), undefined);
    assert.equal(previewPathPrefix("preview.grokgsac.com", "/hds-abc-web-x1/"), undefined);
    assert.equal(previewPathPrefix("preview.grokgsac.com", `${PORT}.js`), undefined);
  });
});

describe("prefixRewrite", () => {
  const rewrite = prefixRewrite(PORT);
  const run = (fn: typeof rewrite.input, href: string) =>
    String(fn?.({ url: new URL(href, "https://preview.grokgsac.com") }));

  it("strips the prefix on input", () => {
    assert.equal(run(rewrite.input, PORT), "https://preview.grokgsac.com/");
    assert.equal(run(rewrite.input, `${PORT}/a?b=1#c`), "https://preview.grokgsac.com/a?b=1#c");
    assert.equal(run(rewrite.input, "/other"), "https://preview.grokgsac.com/other");
  });

  it("adds the prefix on output", () => {
    assert.equal(run(rewrite.output, "/a?b=1"), `https://preview.grokgsac.com${PORT}/a?b=1`);
    assert.equal(run(rewrite.output, "/"), `https://preview.grokgsac.com${PORT}/`);
  });
});
