import { render, screen, fireEvent } from "@testing-library/react";
import AdminTransactionsPage from "../transactions/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("Transactions page", () => {
  beforeEach(() => mockPush.mockClear());

  test("renders transactions table and filters", () => {
    render(<AdminTransactionsPage />);

    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort transactions")).toBeInTheDocument();
  });

  test("navigates back to dashboard from footer", () => {
    render(<AdminTransactionsPage />);

    fireEvent.click(screen.getByRole("button", { name: "← Dashboard" }));
    expect(mockPush).toHaveBeenCalledWith("/admin");
  });

  test("filters by failed status", () => {
    render(<AdminTransactionsPage />);

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "failed" },
    });

    expect(screen.getByText("TXN-1003")).toBeInTheDocument();
    expect(screen.queryByText("TXN-1001")).not.toBeInTheDocument();
  });
});