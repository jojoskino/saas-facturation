import { describe, it, expect } from "vitest";
import { APP_NAME, CONTACT_EMAIL, PRIVACY_EMAIL } from "./brand";

describe("brand constants", () => {
  it("expose le nom et les e-mails LAFACTURE", () => {
    expect(APP_NAME).toBe("LAFACTURE");
    expect(CONTACT_EMAIL).toBe("contact@lafacture.app");
    expect(PRIVACY_EMAIL).toBe("privacy@lafacture.app");
  });
});
