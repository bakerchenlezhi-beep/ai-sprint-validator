// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonaPanel } from "@/components/personas/PersonaPanel";
import { MOCK_PERSONAS } from "@/lib/sim/mock";

describe("PersonaPanel", () => {
  it("renders all three personas", () => {
    render(<PersonaPanel personas={MOCK_PERSONAS} activePersonaId={null} />);
    for (const p of MOCK_PERSONAS) expect(screen.getByText(p.name)).toBeInTheDocument();
    expect(screen.queryByText("Speaking")).not.toBeInTheDocument();
  });

  it("marks only the active speaker", () => {
    render(<PersonaPanel personas={MOCK_PERSONAS} activePersonaId={MOCK_PERSONAS[1].id} />);
    expect(screen.getAllByText("Speaking")).toHaveLength(1);
  });

  it("renders skeletons before personas exist", () => {
    const { container } = render(<PersonaPanel personas={[]} activePersonaId={null} />);
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });
});
