import { describe, expect, it } from "vitest";
import {
  contactHref,
  detectContactType,
  displayUrl,
  headerContacts,
  renderContact,
  urlHref,
} from "./contacts";

describe("contact links", () => {
  it("recognises a network from a pasted URL, with or without scheme or www", () => {
    expect(detectContactType("https://www.linkedin.com/in/ada")).toBe("linkedin");
    expect(detectContactType("github.com/ada")).toBe("github");
    expect(detectContactType("https://twitter.com/ada")).toBe("x");
    expect(detectContactType("ada.substack.com")).toBe("substack");
    expect(detectContactType("https://www.behance.net/ada")).toBe("behance");
    expect(detectContactType("ada.dev")).toBeNull();
    expect(detectContactType("not a url")).toBeNull();
  });

  it("does not mistake a lookalike host for the network", () => {
    expect(detectContactType("https://notgithub.com/ada")).toBeNull();
  });

  it("expands bare handles into profile URLs", () => {
    expect(contactHref("github", "ada")).toBe("https://github.com/ada");
    expect(contactHref("github", "@ada")).toBe("https://github.com/ada");
    expect(contactHref("medium", "ada")).toBe("https://medium.com/@ada");
    expect(contactHref("whatsapp", "+212 600 000 000")).toBe("https://wa.me/212600000000");
  });

  it("treats a dotted bare word in a network field as a handle", () => {
    expect(contactHref("github", "ada.lovelace")).toBe("https://github.com/ada.lovelace");
    expect(contactHref("orcid", "0000-0002-1825-0097")).toBe("https://orcid.org/0000-0002-1825-0097");
    expect(contactHref("substack", "ada.substack.com")).toBe("https://ada.substack.com");
  });

  it("turns an email address into a mailto link", () => {
    expect(urlHref("jane@acme.com")).toBe("mailto:jane@acme.com");
  });

  it("completes schemeless URLs and keeps full ones", () => {
    expect(contactHref("linkedin", "linkedin.com/in/ada")).toBe("https://linkedin.com/in/ada");
    expect(contactHref("portfolio", "https://ada.design/work")).toBe("https://ada.design/work");
    expect(urlHref("acme.com")).toBe("https://acme.com");
    expect(urlHref("Acme Corp")).toBeNull();
  });

  it("never makes a script or data URL clickable", () => {
    expect(urlHref("javascript://%0aalert(1)")).toBeNull();
    expect(urlHref("javascript:alert(1)")).toBeNull();
    expect(urlHref("data:text/html,<script>")).toBeNull();
    expect(contactHref("link", "javascript:alert(1)")).toBeNull();
  });

  it("never links a personal detail", () => {
    expect(contactHref("nationality", "Moroccan")).toBeNull();
  });

  it("prints URLs without scheme, www or trailing slash", () => {
    expect(displayUrl("https://www.linkedin.com/in/ada/")).toBe("linkedin.com/in/ada");
  });

  it("prints the address by default and the name on request", () => {
    const data = { type: "github", value: "github.com/ada", label: "" };
    expect(renderContact(data, { locale: "en", linkText: "url" })?.text).toBe("github.com/ada");
    expect(renderContact(data, { locale: "en", linkText: "name" })?.text).toBe("GitHub");
    expect(renderContact({ ...data, label: "Code" }, { locale: "en", linkText: "name" })?.text).toBe("Code");
  });

  it("labels details in the CV's language, not the app's", () => {
    const data = { type: "nationality", value: "Marocaine", label: "" };
    expect(renderContact(data, { locale: "fr", linkText: "url" })).toMatchObject({
      prefix: "Nationalité",
      text: "Marocaine",
      href: null,
    });
  });

  it("skips empty contacts", () => {
    expect(renderContact({ type: "github", value: "  ", label: "" }, { locale: "en", linkText: "url" })).toBeNull();
  });
});

describe("header contact line", () => {
  const header = {
    data: { email: "ada@example.com", phone: "+1 555 0100", location: "London", website: "https://ada.dev/" },
    children: [
      { id: "c1", kind: "contact", data: { type: "linkedin", value: "linkedin.com/in/ada", label: "" } },
      { id: "c2", kind: "contact", data: { type: "nationality", value: "British", label: "" } },
      { id: "b1", kind: "bullet", data: { text: "not a contact" } },
    ],
  };

  it("lists the fixed fields first, then contacts in order", () => {
    const items = headerContacts(header, { locale: "en", linkText: "url" });
    expect(items.map((i) => i.kind)).toEqual(["email", "phone", "location", "website", "linkedin", "nationality"]);
    expect(items[0].href).toBe("mailto:ada@example.com");
    expect(items[1].href).toBe("tel:+15550100");
    expect(items[3].text).toBe("ada.dev");
  });

  it("pins addresses and numbers left-to-right", () => {
    const items = headerContacts(header, { locale: "ar", linkText: "url" });
    expect(items.find((i) => i.kind === "phone")?.dir).toBe("ltr");
    expect(items.find((i) => i.kind === "linkedin")?.dir).toBe("ltr");
    expect(items.find((i) => i.kind === "location")?.dir).toBe("auto");
  });
});
