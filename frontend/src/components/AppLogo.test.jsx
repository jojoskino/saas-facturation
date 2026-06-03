import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLogo from "./AppLogo";

describe("AppLogo", () => {
  it("affiche le wordmark LAFACTURE", () => {
    const { container } = render(<AppLogo />);
    expect(screen.getByText("FACTURE")).toBeInTheDocument();
    expect(container.querySelector(".app-logo__mark")).toHaveAttribute("src", "/favicon.svg");
  });

  it("peut masquer le texte", () => {
    render(<AppLogo showText={false} />);
    expect(screen.queryByText("FACTURE")).not.toBeInTheDocument();
  });
});
