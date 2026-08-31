import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLogo from "./AppLogo";
import { LOGO_ALT, LOGO_SRC } from "../constants/brand";

describe("AppLogo", () => {
  it("affiche le logo image", () => {
    render(<AppLogo />);
    const img = screen.getByRole("img", { name: LOGO_ALT });
    expect(img).toHaveAttribute("src", LOGO_SRC);
    expect(img).toHaveClass("app-logo__img");
  });

  it("applique la taille demandée", () => {
    render(<AppLogo size="lg" />);
    expect(screen.getByRole("img", { name: LOGO_ALT })).toHaveAttribute("height", "50");
  });
});
