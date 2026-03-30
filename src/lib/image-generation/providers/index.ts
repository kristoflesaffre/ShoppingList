import type {
  ProviderGenerateInput,
  ProviderGenerateResult,
} from "@/lib/image-generation/types";
import { generateWithOpenAI } from "@/lib/image-generation/providers/openai";

export async function generateWithProvider(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateResult> {
  if (input.config.provider === "openai") {
    return generateWithOpenAI(input);
  }

  throw new Error(`Niet-ondersteunde image provider: ${input.config.provider}`);
}
