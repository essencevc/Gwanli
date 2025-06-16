import { describe, it, expect } from "vitest";
import { generate_plan } from "./lib/plan";

describe("generate_plan", () => {
  it("should return a string plan with task description", () => {
    const taskDescription = "Build a todo app";
    const result = generate_plan(taskDescription);

    expect(typeof result).toBe("string");
    expect(result).toContain(taskDescription);
    expect(result).toContain("Plan for:");
  });
});
