import type { ProviderConfig } from "@/lib/image-generation/types";

export type PricingConfig = {
  baseBySize: Record<ProviderConfig["imageSize"], number>;
  referenceImageCost: number;
};

const DEFAULT_PRICING: PricingConfig = {
  // Conservatieve schatting voor v1 UI feedback.
  baseBySize: {
    "512x512": 0.02,
    "768x768": 0.035,
    "1024x1024": 0.05,
  },
  referenceImageCost: 0.0015,
};

export function estimateCost({
  config,
  referenceImageCount,
  pricing = DEFAULT_PRICING,
}: {
  config: ProviderConfig;
  referenceImageCount: number;
  pricing?: PricingConfig;
}): number {
  const base = pricing.baseBySize[config.imageSize] ?? 0;
  const refs = Math.max(0, referenceImageCount) * pricing.referenceImageCost;
  return Number((base + refs).toFixed(4));
}
