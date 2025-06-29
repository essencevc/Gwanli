import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

// Define the structured response schema
const PlanResponseSchema = z.object({
  needsClarification: z.boolean(),
  clarification_message: z.string(),
  suggested_issues: z.array(z.string()),
});

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

// Function to import prompts from .txt files in the prompts folder
export function loadPrompt(promptName: string): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
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
  context?: string,
  examples?: import("./types.js").SearchResult[]
): Promise<PlanResponse> {
  const planPrompt = loadPrompt("plan");
  const contextStr = context || "";
  
  // Format examples if provided
  const examplesStr = examples && examples.length > 0 
    ? examples.map(example => example.document).join("\n\n---\n\n")
    : "";

  let fullPrompt = planPrompt
    .replace("{task}", taskDescription)
    .replace("{context}", contextStr);

  // Handle conditional examples section
  if (examplesStr) {
    fullPrompt = fullPrompt.replace("{examples:if_not_empty}", "").replace("{/examples:if_not_empty}", "").replace("{examples}", examplesStr);
  } else {
    // Remove the entire examples section if no examples
    fullPrompt = fullPrompt.replace(/\{examples:if_not_empty\}[\s\S]*?\{\/examples:if_not_empty\}/g, "");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [
      {
        name: "return_plan_response",
        description:
          "Return the structured plan response with error handling and suggested issues",
        //@ts-ignore
        input_schema: z.toJSONSchema(PlanResponseSchema),
      },
    ],
    tool_choice: { type: "tool", name: "return_plan_response" },
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
  });

  for (const content of response.content) {
    if (
      content.type === "tool_use" &&
      content.name === "return_plan_response"
    ) {
      return PlanResponseSchema.parse(content.input);
    }
  }

  throw new Error("No tool use content found in response");
}
