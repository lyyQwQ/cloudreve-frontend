import { describe, expect, it } from "vitest";
import { toDirectShareDisplayLink } from "../ShareDialog.tsx";

describe("ShareDialog direct-link display", () => {
  it("converts /s/:token to /d/:token/ for UI display", () => {
    expect(toDirectShareDisplayLink("https://example.com/s/token123")).toBe("https://example.com/d/token123/");
  });
});
