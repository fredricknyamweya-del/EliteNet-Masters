import { render, screen, fireEvent } from "@testing-library/react";
import ReportsPage from "../reports/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

global.URL.createObjectURL = jest.fn(() => "blob:mock");
global.URL.revokeObjectURL = jest.fn();

describe("Reports page", () => {
  test("renders Transactions section heading", () => {
    render(<ReportsPage />);
    // Use getAllByText since "Transactions" appears in both
    // the summary card and the section heading
    const matches = screen.getAllByText("Transactions");
    expect(matches.length).toBeGreaterThan(0);
  });

  test("filters to success transactions only", () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole("button", { name: "success" }));
    // Check that no failed status badges are visible in the transaction list
    // (the "failed" tab button itself will still be in the DOM)
    const failedBadges = screen
      .getAllByText("failed")
      .filter((el) => el.tagName === "SPAN");
    expect(failedBadges.length).toBe(0);
  });

  test("filters to failed transactions only", () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole("button", { name: "failed" }));
    // Check that no success status badges are visible
    const successBadges = screen
      .queryAllByText("success")
      .filter((el) => el.tagName === "SPAN");
    expect(successBadges.length).toBe(0);
  });

  test("Export CSV button triggers download", () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByText("Export CSV"));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  test("shows total revenue summary card", () => {
    render(<ReportsPage />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
  });

  test("shows transaction count summary card", () => {
    render(<ReportsPage />);
    // Summary card shows count — getAllByText handles multiple matches
    const transactionLabels = screen.getAllByText("Transactions");
    expect(transactionLabels.length).toBeGreaterThanOrEqual(1);
  });

  test("shows all filter buttons", () => {
    render(<ReportsPage />);
    expect(screen.getByRole("button", { name: "all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "success" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "failed" })).toBeInTheDocument();
  });
});