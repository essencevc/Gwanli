import { describe, it, expect } from "vitest";
import { generate_plan } from "./lib/plan";

describe("generate_plan", () => {
  it("should ask for more clarification with a broad scope", async () => {
    const taskDescription = "Build a todo app";
    const result = await generate_plan(taskDescription);

    expect(result).toContain("<error>");
    expect(result).not.toContain("<issues>");
  }, 20000);
});
