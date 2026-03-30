import type {
  ProviderGenerateInput,
  ProviderGenerateResult,
} from "@/lib/image-generation/types";

function extractB64(
  data: { data?: Array<{ b64_json?: string }> },
): string | undefined {
  return data?.data?.[0]?.b64_json;
}

function dalle2Size(
  imageSize: ProviderGenerateInput["config"]["imageSize"],
): "256x256" | "512x512" | "1024x1024" {
  if (imageSize === "512x512") return "512x512";
  return "1024x1024";
}

/** Multi-image style edits (sommige API-keys / regio’s ondersteunen dit). */
async function openaiImageEditsGptMultiRef(
  input: ProviderGenerateInput,
  apiKey: string,
): Promise<ProviderGenerateResult> {
  const form = new FormData();
  form.set("model", input.config.model);
  form.set("prompt", input.prompt);
  form.set("size", input.config.imageSize);
  form.set("response_format", "b64_json");

  input.references.forEach((ref) => {
    const uint8 = new Uint8Array(ref.bytes);
    form.append(
      "image[]",
      new Blob([uint8], { type: ref.mimeType }),
      ref.fileName,
    );
  });

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI images/edits (gpt) faalde (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = extractB64(json);
  if (!b64) {
    throw new Error("OpenAI edits (gpt): geen b64_json in antwoord.");
  }

  return {
    provider: "openai",
    model: input.config.model,
    mimeType: "image/png",
    imageBase64: b64,
  };
}

/**
 * Text-to-image voor gpt-image-*; werkt op accounts waar /edits geen gpt-model accepteert.
 */
async function openaiImageGenerationsGpt(
  input: ProviderGenerateInput,
  apiKey: string,
): Promise<ProviderGenerateResult> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.config.model,
      prompt: input.prompt,
      size: input.config.imageSize,
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OpenAI images/generations faalde (${res.status}): ${text}`,
    );
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = extractB64(json);
  if (!b64) {
    throw new Error("OpenAI generations: geen b64_json in antwoord.");
  }

  return {
    provider: "openai",
    model: input.config.model,
    mimeType: "image/png",
    imageBase64: b64,
  };
}

/** Laatste redmiddel: /edits met dall-e-2 en één referentie-PNG. */
async function openaiImageEditsDalle2SingleRef(
  input: ProviderGenerateInput,
  apiKey: string,
): Promise<ProviderGenerateResult> {
  const ref = input.references[0];
  if (!ref) {
    throw new Error("DALL·E 2 edits vereisen minstens één referentiebeeld.");
  }

  const form = new FormData();
  form.set("model", "dall-e-2");
  form.set("prompt", input.prompt.slice(0, 1000));
  form.set("size", dalle2Size(input.config.imageSize));
  form.set("response_format", "b64_json");

  const uint8 = new Uint8Array(ref.bytes);
  form.append(
    "image",
    new Blob([uint8], { type: ref.mimeType }),
    ref.fileName,
  );

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI images/edits (dall-e-2) faalde (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = extractB64(json);
  if (!b64) {
    throw new Error("OpenAI edits (dall-e-2): geen b64_json in antwoord.");
  }

  return {
    provider: "openai",
    model: "dall-e-2",
    mimeType: "image/png",
    imageBase64: b64,
  };
}

/**
 * Sommige sleutels/regio’s laten alleen dall-e-2 toe op /images/edits.
 * We proberen: gpt-image-1 generations → dall-e-2 edits als fallback.
 */
export async function generateWithOpenAI(
  input: ProviderGenerateInput,
): Promise<ProviderGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt op de server.");
  }

  const errors: string[] = [];

  try {
    return await openaiImageGenerationsGpt(input, apiKey);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  try {
    return await openaiImageEditsDalle2SingleRef(input, apiKey);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  throw new Error(
    `Alle OpenAI image-pogingen faalden:\n${errors.join("\n\n---\n\n")}`,
  );
}
