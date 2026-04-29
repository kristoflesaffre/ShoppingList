export type ImageProvider = "openai" | "mock";

export type ProviderConfig = {
  provider: ImageProvider;
  model: string;
  imageSize: "512x512" | "768x768" | "1024x1024";
};

export type FoodImageGenerationInput = {
  ownerId: string;
  dishName: string;
  dishDescription?: string;
};

export type ResolvedFoodPrompt = {
  resolvedPrompt: string;
  templateVersion: string;
  templateTask: string;
};

export type ReferenceImageInput = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

export type ProviderGenerateInput = {
  prompt: string;
  references: ReferenceImageInput[];
  config: ProviderConfig;
};

export type ProviderGenerateResult = {
  provider: ImageProvider;
  model: string;
  mimeType: string;
  imageBase64: string;
};

export type FoodImageGenerationResult = {
  generationId: string | null;
  imageUrl: string;
  estimatedCost: number;
  provider: ImageProvider;
  model: string;
  mock: boolean;
  /** Alleen gezet bij mock-fallback: server-side fout (kort, voor troubleshooting). */
  mockDetail?: string;
};

export type FoodImageGenerationStoredRecord = {
  id: string;
  ownerId: string;
  dishName: string;
  dishDescription?: string;
  provider: ImageProvider;
  model: string;
  referenceImageCount: number;
  estimatedCost: number;
  imageBase64: string;
  imageMimeType: string;
  imageUrl?: string;
  storageKey?: string;
  imageSize?: number;
  createdAtIso: string;
};
