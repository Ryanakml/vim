export const KB_SYSTEM_INSTRUCTIONS = `Knowledge Base Instructions

You have access to a curated knowledge base with verified information about the business or service. When responding to user queries:

1. Primary Source: Refer to the knowledge base content provided in your context first.
2. Accuracy: Only state facts that are explicitly in the knowledge base.
3. No Hallucinations: Do not invent information, prices, policies, or features.
4. Escalation: If the answer is not in the knowledge base, direct the user to support.
5. Attribution: You may reference where information comes from (e.g., "According to our policy...").

When knowledge base content is provided, it will appear in the CONTEXT section below.`;

export function buildSystemPromptWithKB(
  userSystemPrompt: string,
  knowledgeContext: string | null,
  documentCount: number,
): string {
  if (!knowledgeContext || documentCount === 0) {
    return userSystemPrompt;
  }

  return `${userSystemPrompt}

${KB_SYSTEM_INSTRUCTIONS}

Knowledge Base Context (${documentCount} document${
    documentCount !== 1 ? "s" : ""
  }):

${knowledgeContext}`;
}

export function generateKBInstructions(documentCount: number): string {
  if (documentCount === 0) {
    return "No knowledge base documents yet. Add inline text snippets to guide the bot.";
  }

  return `Knowledge base active: ${documentCount} document${
    documentCount !== 1 ? "s" : ""
  } available for answers.`;
}

export interface KBCompleteness {
  complete: boolean;
  score: number;
  warnings: string[];
  suggestions: string[];
}

export function analyzeKBCompleteness(
  userSystemPrompt: string,
  documents: { text: string }[],
): KBCompleteness {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (documents.length === 0) {
    warnings.push("No knowledge base documents added");
    suggestions.push("Add 5-10 inline text snippets covering key topics");
    score -= 30;
  } else if (documents.length < 5) {
    warnings.push("Knowledge base is sparse");
    suggestions.push("Add more documents for better coverage");
    score -= 15;
  }

  if (!userSystemPrompt.toLowerCase().includes("knowledge")) {
    suggestions.push(
      "Reference the knowledge base in your system prompt to ensure it is used",
    );
    score -= 10;
  }

  const totalWords = documents.reduce(
    (sum, doc) => sum + doc.text.split(/\s+/).length,
    0,
  );
  if (totalWords < 500) {
    warnings.push("Knowledge base has very little content");
    suggestions.push("Add more detailed information to documents");
    score -= 15;
  }

  return {
    complete: score >= 70 && documents.length > 0,
    score: Math.max(0, score),
    warnings,
    suggestions,
  };
}
