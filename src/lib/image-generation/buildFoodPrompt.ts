import templateJson from "@/lib/foodPromptTemplate.json";
import type { ResolvedFoodPrompt } from "@/lib/image-generation/types";

const TOKEN_DISH_NAME = /\{\{DISH_NAME\}\}/g;
const TOKEN_OPTIONAL_PROMPT = /\{\{OPTIONAL_DISH_PROMPT\}\}/g;
const TOKEN_OPTIONAL_DESCRIPTION = /\{\{OPTIONAL_DISH_DESCRIPTION\}\}/g;

function replaceTokens(input: string, dishName: string, dishDescription: string): string {
  return input
    .replace(TOKEN_DISH_NAME, dishName)
    .replace(TOKEN_OPTIONAL_PROMPT, dishDescription)
    .replace(TOKEN_OPTIONAL_DESCRIPTION, dishDescription)
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFoodPrompt({
  dishName,
  dishDescription,
}: {
  dishName: string;
  dishDescription?: string;
}): ResolvedFoodPrompt {
  const cleanDishName = dishName.trim();
  const cleanDescription = (dishDescription ?? "").trim();

  const base =
    typeof templateJson.final_generation_prompt === "string"
      ? templateJson.final_generation_prompt
      : "";

  const resolvedPrompt = replaceTokens(base, cleanDishName, cleanDescription);

  return {
    resolvedPrompt,
    templateVersion: String(templateJson.version ?? "unknown"),
    templateTask: String(templateJson.task ?? "unknown"),
  };
}
