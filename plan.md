# FRE-23: Implement Structured Outputs for Plan Generation

## Issue Description
Replace the current plain text response format in the plan generation functionality with Anthropic's structured output format. This will provide better error handling and more reliable parsing of suggested issues.

Current behavior: Returns plain text from Claude
New behavior: Returns structured JSON with `{ hasError: bool, errorMessage: str, suggested_issues: list[str] }`

## Libraries Touched
- `@anthropic-ai/sdk` - Update API call to use structured output format
- `packages/mcp/src/lib/plan.ts` - Main file requiring changes
- Zod (to be added) - For schema validation of structured response

## Sequential Checklist

1. **Add Zod dependency**
   - [x] Install Zod in packages/mcp for schema validation
   - [x] Update package.json

2. **Define response schema**
   - [x] Create Zod schema for the structured response format
   - [x] Include hasError (boolean), errorMessage (string), suggested_issues (array of strings)

3. **Update Anthropic API call**
   - [ ] Modify the anthropic.messages.create call to use structured output
   - [ ] Add response_format parameter with the defined schema
   - [ ] Update model call to support structured outputs

4. **Update function signature and return type**
   - [ ] Change generate_plan return type from string to structured object
   - [ ] Update error handling to use the new format
   - [ ] Ensure backwards compatibility or update calling code

5. **Update prompt if needed**
   - [ ] Review existing prompt to ensure it works with structured output
   - [ ] Modify prompt to explicitly request structured format if necessary

6. **Test the changes**
   - [ ] Verify structured output works correctly
   - [ ] Test error cases return proper hasError: true format
   - [ ] Ensure suggested_issues array is properly populated
