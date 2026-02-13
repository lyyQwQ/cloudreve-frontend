import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Test Infrastructure", () => {
  it("renders a simple element", () => {
    render(<div data-testid="test-element">Hello Test</div>);
    expect(screen.getByTestId("test-element")).toHaveTextContent("Hello Test");
  });
});
