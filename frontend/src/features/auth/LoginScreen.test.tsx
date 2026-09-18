import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginScreen } from "./LoginScreen";

const registerMock = vi.fn();
const loginMock = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ login: loginMock, register: registerMock, error: null }),
}));

describe("LoginScreen", () => {
  it("logs in with an email in the default tab", () => {
    const { container } = render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "coach@example.com" } });
    fireEvent.click(container.querySelector('button[type="submit"]')!);
    expect(loginMock).toHaveBeenCalledWith("coach@example.com");
  });

  it("switches to the register tab and creates a club", () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Créer un club" }));
    fireEvent.change(screen.getByLabelText("Nom du club"), { target: { value: "BC Spartak" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("Votre nom"), { target: { value: "Owner" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le club" }));
    expect(registerMock).toHaveBeenCalledWith("BC Spartak", "owner@example.com", "Owner");
  });
});
