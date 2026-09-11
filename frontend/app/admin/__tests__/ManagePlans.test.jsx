// frontend/app/admin/__tests__/ManagePlans.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManagePlansPage from "../plans/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("Manage Plans page", () => {
  test("renders all 6 packages", () => {
    render(<ManagePlansPage />);
    expect(screen.getByText("30 Minutes")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  test("shows edit input when Edit is clicked", () => {
    render(<ManagePlansPage />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    expect(
      screen.getByPlaceholderText("New price (KSh)")
    ).toBeInTheDocument();
  });

  test("updates price after saving", async () => {
    render(<ManagePlansPage />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    const input = screen.getByPlaceholderText("New price (KSh)");
    await userEvent.clear(input);
    await userEvent.type(input, "15");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("KSh 15")).toBeInTheDocument()
    );
  });

  test("shows Saved confirmation after saving", async () => {
    render(<ManagePlansPage />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    const input = screen.getByPlaceholderText("New price (KSh)");
    await userEvent.clear(input);
    await userEvent.type(input, "15");
    fireEvent.click(screen.getByText("Save"));
    await screen.findByText("Saved ✓");
  });

  test("cancels edit without saving when X is clicked", () => {
    render(<ManagePlansPage />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByText("✕"));
    expect(
      screen.queryByPlaceholderText("New price (KSh)")
    ).not.toBeInTheDocument();
  });
});