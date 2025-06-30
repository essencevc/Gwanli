import type { SuggestIssuesInput, SaveTaskExampleInput, SearchNotionInput } from "../schemas.js";
import { generate_plan } from "./plan.js";
import type { TaskExampleStorage } from "./storage-interface.js";
import { convertNotionPageToMarkdown } from "./notion-to-markdown.js";
import { Client } from '@notionhq/client';

// Tool implementation functions with dependencies passed in

export async function handleSuggestIssues(
  args: SuggestIssuesInput,
  taskStore: TaskExampleStorage
) {
  // Fetch relevant examples based on the task description
  const examples = await taskStore.searchSimilarExamples(args.taskDescription, 3);
  
  const plan = await generate_plan(args.taskDescription, args.context, examples);

  if (plan.needsClarification) {
    return {
      content: [{ type: "text" as const, text: plan.clarification_message }],
    };
  }

  if (plan.suggested_issues.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Unable to generate issues. Please try again.",
        },
      ],
    };
  }

  const issuesText = plan.suggested_issues
    .map((issue: string, i: number) => `${i + 1}. ${issue}`)
    .join("\n");

  return {
    content: [{ type: "text" as const, text: issuesText }],
  };
}

export async function handleSaveTaskExample(
  args: SaveTaskExampleInput,
  taskStore: TaskExampleStorage
) {
  const id = await taskStore.addExample(args);

  return {
    content: [
      {
        type: "text" as const,
        text: `Task example saved successfully with ID: ${id}`,
      },
    ],
  };
}

export async function handleSearchNotion(args: SearchNotionInput) {
  // For now, throw an error indicating that no Notion index exists
  // In the future, this will check if an index exists and create one if not
  throw new Error("No Notion index found. Index creation not yet implemented. Please run index creation first.");
}
