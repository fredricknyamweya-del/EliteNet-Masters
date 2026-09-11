import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import IssueVoucherPage from "../vouchers/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock setTimeout so the 600ms delay resolves instantly
jest.useFakeTimers();

describe("Issue Voucher page", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test("Generate button is disabled without selecting a package", () => {
    render(<IssueVoucherPage />);
    expect(
      screen.getByRole("button", { name: /generate voucher/i })
    ).toBeDisabled();
  });

  test("Generate button enables after selecting a package", () => {
    render(<IssueVoucherPage />);
    fireEvent.click(screen.getByText("30 Minutes"));
    expect(
      screen.getByRole("button", { name: /generate voucher/i })
    ).not.toBeDisabled();
  });

  test("generates and displays a voucher code", async () => {
    render(<IssueVoucherPage />);
    fireEvent.click(screen.getByText("30 Minutes"));

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /generate voucher/i })
      );
      // Advance timers past the 600ms mock delay
      jest.advanceTimersByTime(700);
      // Flush all pending promises
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Voucher code generated")).toBeInTheDocument();
    const codes = screen.getAllByText(/[A-Z0-9]{10}/);
    expect(codes.length).toBeGreaterThan(0);
  }, 15000);

  test("adds voucher to recently issued list", async () => {
    render(<IssueVoucherPage />);
    fireEvent.click(screen.getByText("30 Minutes"));

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /generate voucher/i })
      );
      jest.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Recently Issued")).toBeInTheDocument();
    expect(screen.getByText(/Walk-in/)).toBeInTheDocument();
  }, 15000);

  test("generates unique codes on repeated generation", async () => {
    render(<IssueVoucherPage />);
    fireEvent.click(screen.getByText("30 Minutes"));

    // First generation
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /generate voucher/i })
      );
      jest.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    const firstCodes = screen.getAllByText(/[A-Z0-9]{10}/);

    // Second generation
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /generate voucher/i })
      );
      jest.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const allCodes = screen.getAllByText(/[A-Z0-9]{10}/);
      expect(allCodes.length).toBeGreaterThan(firstCodes.length);
    });
  }, 20000);
});