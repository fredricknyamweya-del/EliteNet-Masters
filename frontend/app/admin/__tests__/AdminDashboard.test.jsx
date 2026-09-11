import { render, screen, fireEvent } from "@testing-library/react";
import AdminPage from "../page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Orbitron: () => ({ variable: "--font-orbitron" }),
}));

describe("Admin dashboard", () => {
  beforeEach(() => mockPush.mockClear());

  test("renders core KPI cards", () => {
    render(<AdminPage />);

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("Revenue This Month")).toBeInTheDocument();
    expect(screen.getByText("Bandwidth Usage")).toBeInTheDocument();
  });

  test("renders new operational sections", () => {
    render(<AdminPage />);

    expect(screen.getByText("Service Health")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Pending payments")).toBeInTheDocument();
  });

  test("quick action buttons navigate to expected routes", () => {
    render(<AdminPage />);

    fireEvent.click(screen.getByRole("button", { name: /Transactions/i }));
    fireEvent.click(screen.getByRole("button", { name: /Issue Voucher/i }));
    fireEvent.click(screen.getByRole("button", { name: /Manage Plans/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin/transactions");
    expect(mockPush).toHaveBeenCalledWith("/admin/vouchers");
    expect(mockPush).toHaveBeenCalledWith("/admin/plans");
  });

  test("Log out button navigates to packages", () => {
    render(<AdminPage />);

    fireEvent.click(screen.getByRole("button", { name: "← Log out" }));
    expect(mockPush).toHaveBeenCalledWith("/packages");
  });

  test("does not render Operations Overview button", () => {
    render(<AdminPage />);

    expect(screen.queryByText("Operations Overview")).not.toBeInTheDocument();
  });
});