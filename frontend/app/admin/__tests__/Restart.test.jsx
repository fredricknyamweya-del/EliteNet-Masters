import { render, screen, fireEvent, act } from "@testing-library/react";
import RestartHotspotPage from "../restart/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("Restart hotspot page", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("reboot button is disabled before router selection", () => {
    render(<RestartHotspotPage />);

    expect(screen.getByRole("button", { name: "Reboot Router" })).toBeDisabled();
  });

  test("shows success after reboot flow", () => {
    render(<RestartHotspotPage />);

    fireEvent.click(screen.getByText("Main Router"));
    fireEvent.click(screen.getByRole("button", { name: "Reboot Router" }));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Router rebooted successfully")).toBeInTheDocument();
  });

  test("dashboard footer button navigates to admin", () => {
    render(<RestartHotspotPage />);

    fireEvent.click(screen.getByRole("button", { name: "← Dashboard" }));
    expect(mockPush).toHaveBeenCalledWith("/admin");
  });
});