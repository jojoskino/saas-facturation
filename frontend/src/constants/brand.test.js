import { describe, it, expect } from "vitest";
import { APP_NAME, CONTACT_EMAIL, LOGO_ALT, LOGO_SRC } from "./brand";

describe("brand constants", () => {
  it("expose le logo et le contact développeur", () => {
    expect(LOGO_SRC).toBe("/logo.png");
    expect(LOGO_ALT).toBe("La Facture");
    expect(APP_NAME).toBe("La Facture");
    expect(CONTACT_EMAIL).toBe("essev2030@gmail.com");
  });
});
