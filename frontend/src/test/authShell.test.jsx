import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import AuthShell from "../components/AuthShell.jsx";

// AuthShell wraps the sign-in, forgot-password and reset-password pages.
function renderShell() {
  return render(
    <MemoryRouter>
      <AuthShell><p>form</p></AuthShell>
    </MemoryRouter>,
  );
}

describe("sign-in card", () => {
  test("the sign-in card shows no live badge or invented city figures", () => {
    const { container } = renderShell();
    expect(container.textContent).not.toMatch(/\bLIVE\b/);
    for (const figure of ["128", "4.8k", "Ideas in motion", "Active neighbors"]) {
      expect(container.textContent).not.toContain(figure);
    }
  });

  test("the sign-in card labels itself synthetic and states the prototype's facts", () => {
    renderShell();
    expect(screen.getByText("SYNTHETIC DATA")).toBeInTheDocument();
    expect(screen.getByText("ABOUT THIS PROTOTYPE")).toBeInTheDocument();
    expect(screen.getByText("Vehicles per scenario")).toBeInTheDocument();
    expect(screen.getByText("Processing facility")).toBeInTheDocument();
    expect(screen.getByText("Test scenarios")).toBeInTheDocument();
  });
});
