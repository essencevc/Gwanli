import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Define the structured response schema
const PlanResponseSchema = z.object({
  hasError: z.boolean(),
  errorMessage: z.string(),
  suggested_issues: z.array(z.string()),
});

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

// Function to import prompts from .txt files in the prompts folder
export function loadPrompt(promptName: string): string {
  try {
    const promptPath = join(__dirname, "../prompts", `${promptName}.txt`);
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to load prompt "${promptName}": ${error}`);
  }
}

// Create Anthropic client instance
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generate_plan(
  taskDescription: string,
  context?: string
): Promise<string> {
  const planPrompt = loadPrompt("plan");
  const contextStr = context || "";

  const fullPrompt = planPrompt
    .replace("{task}", taskDescription)
    .replace("{context}", contextStr);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    });

    for (const content of response.content) {
      if (content.type === "text") {
        return content.text;
      }
    }

    throw new Error("No text content found in response");
  } catch (error) {
    throw new Error(`Failed to generate plan: ${error}`);
  }
}
