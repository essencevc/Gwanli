export function generate_plan(
  taskDescription: string,
  context?: string
): string {
  const contextStr = context || "";
  return `Plan for: ${taskDescription}\nContext: ${contextStr}\nPlan steps:\n1. Analyze requirements\n2. Break down into tasks\n3. Execute implementation`;
}
