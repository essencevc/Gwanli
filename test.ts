// import { generate_plan } from "./packages/mcp/src/lib/plan";

// const result = await generate_plan(
//   "I'd like to build out the frontend interface for a todo app. I want to first scaffold out the main layout. Ideally we should install shadcn, build out the initial input and submits and then build out a simple header for people to see the todo list.",
//   "This is currently a NextJS app which is built out using the simple NextJS app template."
// );

// console.log(result);
import { z } from "zod/v4";
import { toJSONSchema } from "zod/v4";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const PlanResponseSchema = z.object({
  needsClarification: z.boolean(),
  clarification_message: z.string(),
  suggested_issues: z.array(z.string()),
});

console.log(toJSONSchema(PlanResponseSchema));

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4000,
  tools: [
    {
      name: "return_plan_response",
      description:
        "Return the structured plan response with error handling and suggested issues",
      //@ts-ignore
      input_schema: toJSONSchema(PlanResponseSchema),
    },
  ],
  tool_choice: { type: "tool", name: "return_plan_response" },
  messages: [
    {
      role: "user",
      content:
        "suggest issues based off the user's task description - I'd like to build out the frontend interface for a todo app. I want to first scaffold out the main layout. Ideally we should install shadcn, build out the initial input and submits and then build out a simple header for people to see the todo list. if more clarification is needed, please ask for it.",
    },
  ],
});

console.log(JSON.stringify(response.content));
