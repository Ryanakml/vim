const FUNCTION_BLOCK_TAG_REGEX =
  /<function(?:\s*=\s*["']?[^>"'\s]*["']?)?\s*>[\s\S]*?<\/function>/gi;
const FUNCTION_SELF_CLOSING_TAG_REGEX =
  /<function(?:\s*=\s*["']?[^>"'\s]*["']?)?\s*\/>/gi;
const FUNCTION_OPEN_CLOSE_TAG_REGEX =
  /<\/?function(?:\s*=\s*["']?[^>"'\s]*["']?)?\s*>/gi;
const TOOL_NAME_LEAK_REGEX = /\btrigger_escalation\b/gi;

export function sanitizeAssistantMessage(rawContent: string): string {
  return rawContent
    .replace(FUNCTION_BLOCK_TAG_REGEX, "")
    .replace(FUNCTION_SELF_CLOSING_TAG_REGEX, "")
    .replace(FUNCTION_OPEN_CLOSE_TAG_REGEX, "")
    .replace(TOOL_NAME_LEAK_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
