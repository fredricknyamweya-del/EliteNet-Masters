import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PackagesPage from "../packages/page";

jest.mock("../../lib/api", () => ({
  triggerStkPush: jest.fn(),
  checkPaymentStatus: jest.fn(),
}));

import { triggerStkPush, checkPaymentStatus } from "../../lib/api";

describe("Payment flow integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("full happy path: select package → enter phone → pay → pending → success", async () => {
    triggerStkPush.mockResolvedValue({
      status: "pending",
      transaction_id: "mock-123",
    });
    checkPaymentStatus.mockResolvedValue({ status: "success" });

    render(<PackagesPage />);

    fireEvent.click(screen.getByText("30minutes"));

    const input = await screen.findByPlaceholderText(
      "Enter your phone number",
      {},
      { timeout: 3000 }
    );

    fireEvent.change(input, { target: { value: "0712345678" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Pay Now"));
    });

    expect(triggerStkPush).toHaveBeenCalledWith("0712345678", 1);

    await screen.findByText(
      "Waiting for M-Pesa confirmation",
      {},
      { timeout: 5000 }
    );

    await waitFor(
      () =>
        expect(screen.getByText("Payment confirmed!")).toBeInTheDocument(),
      { timeout: 10000 }
    );
  }, 20000);

  test("shows error when STK push fails", async () => {
    triggerStkPush.mockRejectedValue(new Error("Network error"));

    render(<PackagesPage />);
    fireEvent.click(screen.getByText("30minutes"));

    const input = await screen.findByPlaceholderText(
      "Enter your phone number",
      {},
      { timeout: 3000 }
    );
    fireEvent.change(input, { target: { value: "0712345678" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Pay Now"));
    });

    await screen.findByText("Payment failed", {}, { timeout: 5000 });
  }, 15000);

  test("shows error when payment callback returns failed", async () => {
    triggerStkPush.mockResolvedValue({
      status: "pending",
      transaction_id: "mock-123",
    });
    checkPaymentStatus.mockResolvedValue({ status: "failed" });

    render(<PackagesPage />);
    fireEvent.click(screen.getByText("30minutes"));

    const input = await screen.findByPlaceholderText(
      "Enter your phone number",
      {},
      { timeout: 3000 }
    );
    fireEvent.change(input, { target: { value: "0712345678" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Pay Now"));
    });

    await waitFor(
      () =>
        expect(screen.getByText("Payment failed")).toBeInTheDocument(),
      { timeout: 10000 }
    );
  }, 15000);

  test("Pay Now button is not visible without selecting a package", () => {
    render(<PackagesPage />);
    expect(screen.queryByText("Pay Now")).not.toBeInTheDocument();
  });

  test("Pay Now button does not trigger payment when phone is empty", async () => {
    render(<PackagesPage />);
    fireEvent.click(screen.getByText("30minutes"));
    await screen.findByPlaceholderText("Enter your phone number");

    // Phone is empty — clicking Pay Now should not call triggerStkPush
    const payBtn = screen.getByText("Pay Now").closest("button");
    expect(payBtn).toBeInTheDocument();
    fireEvent.click(payBtn);
    expect(triggerStkPush).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter phone number.")).toBeInTheDocument();
  }, 10000);

  test("Pay Now button is not rendered without selecting a package", () => {
    render(<PackagesPage />);
    expect(screen.queryByText("Pay Now")).not.toBeInTheDocument();
  });
});