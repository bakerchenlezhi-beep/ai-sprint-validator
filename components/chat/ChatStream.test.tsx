// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChatStream } from "@/components/chat/ChatStream";
import { MOCK_PERSONAS } from "@/lib/sim/mock";
import type { ChatMessage } from "@/types";

beforeAll(() => {
  // jsdom doesn't implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

const msg = (over: Partial<ChatMessage>): ChatMessage => ({
  id: "m1",
  role: "persona",
  personaId: MOCK_PERSONAS[0].id,
  content: "Hello there",
  round: 0,
  status: "complete",
  createdAt: 0,
  ...over,
});

describe("ChatStream", () => {
  it("shows the empty state", () => {
    render(<ChatStream messages={[]} personas={MOCK_PERSONAS} />);
    expect(screen.getByText("The conversation will appear here.")).toBeInTheDocument();
  });

  it("labels persona and user bubbles", () => {
    render(
      <ChatStream
        messages={[msg({}), msg({ id: "m2", role: "user", personaId: undefined, content: "My question" })]}
        personas={MOCK_PERSONAS}
      />,
    );
    const log = screen.getByRole("log", { name: "Discussion" });
    expect(within(log).getByText(MOCK_PERSONAS[0].name)).toBeInTheDocument();
    expect(within(log).getByText("You")).toBeInTheDocument();
    expect(within(log).getByText("My question")).toBeInTheDocument();
  });

  it("shows a typing cursor only on streaming messages", () => {
    const { rerender } = render(<ChatStream messages={[msg({ status: "streaming" })]} personas={MOCK_PERSONAS} />);
    expect(screen.getByText("▍")).toBeInTheDocument();
    rerender(<ChatStream messages={[msg({ status: "complete" })]} personas={MOCK_PERSONAS} />);
    expect(screen.queryByText("▍")).not.toBeInTheDocument();
  });

  it("offers Retry only on the last, failed message", async () => {
    const onRetry = vi.fn();
    render(<ChatStream messages={[msg({ status: "error" }), msg({ id: "m2", status: "error" })]} personas={MOCK_PERSONAS} onRetry={onRetry} />);
    expect(screen.getAllByText("This reply failed.")).toHaveLength(2);
    const retry = screen.getAllByRole("button", { name: "Retry" });
    expect(retry).toHaveLength(1);
    await userEvent.click(retry[0]);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
