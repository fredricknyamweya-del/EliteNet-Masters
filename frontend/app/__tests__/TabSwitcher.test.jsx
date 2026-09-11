import { render, screen, fireEvent } from "@testing-library/react";
import PackagesPage from "../packages/page";

jest.mock("../../lib/api", () => ({
  triggerStkPush: jest.fn(),
  checkPaymentStatus: jest.fn(),
}));

describe("Tab switcher", () => {
  test("shows packages tab by default", () => {
    render(<PackagesPage />);
    expect(screen.getByText("How to Purchase")).toBeInTheDocument();
  });

  test("switches to login tab when Login is clicked", () => {
    render(<PackagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Enter your username and password to login.")).toBeInTheDocument();
  });

  test("switches back to packages tab using Packages tab button", () => {
    render(<PackagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    fireEvent.click(screen.getByRole("button", { name: "Packages" }));

    expect(screen.getByText("How to Purchase")).toBeInTheDocument();
  });

  test("Login arrow button in reconnect section switches to login tab", () => {
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Login →"));

    expect(screen.getByText("Enter your username and password to login.")).toBeInTheDocument();
  });

  test("voucher footer button switches to login tab", () => {
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("Have a voucher code instead?"));

    expect(screen.getByText("Enter your username and password to login.")).toBeInTheDocument();
  });
});