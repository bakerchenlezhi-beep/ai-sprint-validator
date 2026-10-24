// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InterjectionInput } from "@/components/chat/InterjectionInput";

const input = () => screen.getByLabelText("Message to the personas");
const send = () => screen.getByRole("button", { name: "Send" });

describe("InterjectionInput", () => {
  it("disables Send while empty or whitespace", async () => {
    render(<InterjectionInput disabled={false} maxLength={500} onSend={vi.fn()} />);
    expect(send()).toBeDisabled();
    await userEvent.type(input(), "   ");
    expect(send()).toBeDisabled();
  });

  it("sends the text and clears the field", async () => {
    const onSend = vi.fn();
    render(<InterjectionInput disabled={false} maxLength={500} onSend={onSend} />);
    await userEvent.type(input(), "What about pricing?{Enter}");
    expect(onSend).toHaveBeenCalledWith("What about pricing?");
    expect(input()).toHaveValue("");
  });

  it("is fully disabled when asked", () => {
    render(<InterjectionInput disabled maxLength={500} onSend={vi.fn()} />);
    expect(input()).toBeDisabled();
    expect(send()).toBeDisabled();
  });

  it("exposes maxLength to the browser", () => {
    render(<InterjectionInput disabled={false} maxLength={5} onSend={vi.fn()} />);
    expect(input()).toHaveAttribute("maxlength", "5");
  });
});
