import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import esMX from "./locales/es-MX.json";
import enUS from "./locales/en-US.json";
import { I18nProvider, translate, translateWith, validationMessage } from "./index";

const missing = () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [];
const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(cleanup);

describe("catalogs", () => {
  const en = enUS.messages as Record<string, string>;
  const es = esMX.messages as Record<string, string>;

  it("have the same keys in both languages", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it("keep Spanish as the source text", () => {
    for (const [key, value] of Object.entries(es)) expect(value, key).toBe(key);
  });

  it("use the same placeholders in every translation", () => {
    for (const [key, value] of Object.entries(en))
      expect(placeholders(value), key).toEqual(placeholders(key));
  });

  it("have no empty translations", () => {
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe("");
  });
});

describe("translation fallback", () => {
  it("translates a known phrase and keeps the surrounding whitespace", () => {
    expect(translate("  Transferir ", "en-US")).toBe("  Transfer ");
    expect(translate("Transferir", "es-MX")).toBe("Transferir");
  });

  it("shows the Spanish source when an English translation is missing, and reports it", () => {
    expect(translate("Frase sin traducción del catálogo", "en-US")).toBe(
      "Frase sin traducción del catálogo",
    );
    expect(missing()).toContain("Frase sin traducción del catálogo");
  });

  it("does not report text that is not Spanish, such as brands and numbers", () => {
    translate("MIFOS 2048", "en-US");
    expect(missing()).not.toContain("MIFOS 2048");
  });

  it("leaves untranslated text as is in Spanish without reporting it", () => {
    expect(translate("Texto nuevo de prueba", "es-MX")).toBe("Texto nuevo de prueba");
    expect(missing()).not.toContain("Texto nuevo de prueba");
  });

  it("fills placeholders and does not report its own output when translated again", () => {
    const label = translateWith("Eliminar a {name}", { name: "Zoé Núñez" }, "en-US");
    expect(label).toBe("Remove Zoé Núñez");
    expect(translate(label, "en-US")).toBe(label);
    expect(missing()).not.toContain(label);
  });

  it("keeps an unknown placeholder visible instead of dropping it", () => {
    expect(translateWith("Para {name}", {}, "en-US")).toBe("To {name}");
  });
});

function field(html: string) {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.append(form);
  return form.elements[0] as HTMLInputElement;
}

describe("validation messages", () => {
  afterEach(() => document.body.replaceChildren());

  const cases: [string, string, string, string][] = [
    ["empty required field", `<input required>`, "Completa este campo.", "Fill in this field."],
    [
      "unchecked required checkbox",
      `<input type="checkbox" required>`,
      "Marca esta casilla para continuar.",
      "Check this box to continue.",
    ],
    [
      "malformed email",
      `<input type="email" value="correo">`,
      "Escribe un correo electrónico válido.",
      "Enter a valid email address.",
    ],
    [
      "wrong number of digits",
      `<input pattern="[0-9]{18}" value="123">`,
      "Escribe 18 dígitos.",
      "Enter 18 digits.",
    ],
    [
      "only whitespace",
      `<input pattern=".*\\S.*" value="   ">`,
      "Completa este campo.",
      "Fill in this field.",
    ],
    [
      "any other pattern",
      `<input pattern="[A-Z]+" value="abc">`,
      "Revisa el formato de este campo.",
      "Check the format of this field.",
    ],
    [
      "number below the minimum",
      `<input type="number" min="0.01" value="0">`,
      "Escribe un valor de al menos 0.01.",
      "Enter a value of at least 0.01.",
    ],
    [
      "number above the maximum",
      `<input type="number" max="50000" value="60000">`,
      "Escribe un valor de 50,000 como máximo.",
      "Enter a value of at most 50,000.",
    ],
  ];

  for (const [name, html, spanish, english] of cases)
    it(`explains a ${name} in both languages`, () => {
      const input = field(html);
      expect(input.checkValidity()).toBe(false);
      expect(validationMessage(input, "es-MX")).toBe(spanish);
      expect(validationMessage(input, "en-US")).toBe(english);
    });

  it("explains text that is too short or too long", () => {
    const flags = { valueMissing: false, typeMismatch: false, badInput: false };
    const short = {
      validity: { ...flags, tooShort: true },
      minLength: 2,
      value: "x",
      type: "text",
    };
    const long = { validity: { ...flags, tooLong: true }, maxLength: 40, value: "", type: "text" };
    expect(validationMessage(short as unknown as HTMLInputElement, "en-US")).toBe(
      "Use at least 2 characters; you have 1.",
    );
    expect(validationMessage(long as unknown as HTMLInputElement, "es-MX")).toBe(
      "Escribe como máximo 40 caracteres.",
    );
  });

  it("returns no message for a valid field", () => {
    expect(validationMessage(field(`<input required value="ok">`), "en-US")).toBe("");
  });
});

describe("validation messages in the app", () => {
  afterEach(() => window.localStorage.clear());

  function renderForm(locale: "es-MX" | "en-US", noValidate = false) {
    window.localStorage.setItem("mifos-locale", locale);
    const { container } = render(
      <I18nProvider>
        <form noValidate={noValidate}>
          <input name="concept" required />
          <button type="submit">ok</button>
        </form>
      </I18nProvider>,
    );
    return {
      input: container.querySelector("input")!,
      button: container.querySelector("button")!,
    };
  }

  it("replaces the browser's message with the app language", () => {
    const { input } = renderForm("en-US");
    input.checkValidity();
    expect(input.validationMessage).toBe("Fill in this field.");
  });

  it("clears the message when the user edits the field", () => {
    const { input } = renderForm("es-MX");
    input.checkValidity();
    input.value = "Renta";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(input.checkValidity()).toBe(true);
  });

  it("clears the message before a new submit when the value was set from code", () => {
    const { input, button } = renderForm("es-MX");
    input.checkValidity();
    input.value = "Renta";
    expect(input.validity.customError).toBe(true);
    let blocked = false;
    input.addEventListener("invalid", () => (blocked = true));
    // Stop at the capture listeners: what matters is the state native validation will see next.
    button.addEventListener("click", (event) => event.preventDefault());
    button.click();
    expect(input.validity.customError).toBe(false);
    expect(input.checkValidity()).toBe(true);
    expect(blocked).toBe(false);
  });

  it("leaves forms that do their own validation alone", () => {
    const { input } = renderForm("en-US", true);
    input.checkValidity();
    expect(input.validity.customError).toBe(false);
  });
});
