import { NextResponse } from "next/server";
import { init } from "@instantdb/admin";
import schema from "../../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";
import type {
  FoodImageGenerationInput,
  FoodImageGenerationResult,
  FoodImageGenerationStoredRecord,
} from "@/lib/image-generation/types";
import { buildFoodPrompt } from "@/lib/image-generation/buildFoodPrompt";
import { loadReferenceImages } from "@/lib/image-generation/referenceImages";
import { estimateCost } from "@/lib/image-generation/cost";
import { generateWithProvider } from "@/lib/image-generation/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminDb() {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  return init({
    appId: INSTANT_APP_ID,
    adminToken,
    schema,
  });
}

function toPayload(input: unknown): FoodImageGenerationInput {
  if (!input || typeof input !== "object") {
    throw new Error("Ongeldige aanvraagpayload.");
  }

  const dishName =
    "dishName" in input && typeof input.dishName === "string"
      ? input.dishName.trim()
      : "";

  const dishDescription =
    "dishDescription" in input && typeof input.dishDescription === "string"
      ? input.dishDescription.trim()
      : "";

  const ownerId =
    "ownerId" in input && typeof input.ownerId === "string"
      ? input.ownerId.trim()
      : "";

  if (!ownerId) throw new Error("ownerId is verplicht.");
  if (!dishName) throw new Error("dishName is verplicht.");

  return {
    ownerId,
    dishName,
    dishDescription,
  };
}

function toImageUrl(generationId: string, ownerId: string): string {
  return `/api/food-image/${encodeURIComponent(generationId)}?ownerId=${encodeURIComponent(ownerId)}`;
}

export async function POST(req: Request) {
  const provider = "openai" as const;
  const model = "gpt-image-1";

  try {
    const body = await req.json();
    const input = toPayload(body);

    const prompt = buildFoodPrompt({
      dishName: input.dishName,
      dishDescription: input.dishDescription,
    });

    const references = await loadReferenceImages();

    const estimatedCost = estimateCost({
      config: {
        provider,
        model,
        // gpt-image-1 edits ondersteunen geen 768x768; zie OpenAI image-generation guide.
        imageSize: "1024x1024",
      },
      referenceImageCount: references.length,
    });

    console.info("[generate-food-image] start", {
      dishName: input.dishName,
      provider,
      model,
      referenceImageCount: references.length,
      estimatedCost,
    });

    const adminDb = getAdminDb();
    if (!adminDb) {
      throw new Error(
        "Server mist INSTANT_APP_ADMIN_TOKEN en kan het beeld niet opslaan.",
      );
    }

    let providerResult;
    try {
      providerResult = await generateWithProvider({
        prompt: prompt.resolvedPrompt,
        references,
        config: {
          provider,
          model,
          imageSize: "1024x1024",
        },
      });
    } catch (err) {
      console.error("[generate-food-image] provider failure, using mock fallback", {
        dishName: input.dishName,
        provider,
        model,
        referenceImageCount: references.length,
        estimatedCost,
        error: err instanceof Error ? err.message : "unknown",
      });

      const detail =
        err instanceof Error ? err.message.slice(0, 500) : "Onbekende fout";
      const fallback: FoodImageGenerationResult = {
        generationId: null,
        imageUrl: "/images/reference_images/reference_image_1.png",
        estimatedCost,
        provider: "mock",
        model,
        mock: true,
        mockDetail: detail,
      };
      return NextResponse.json(fallback, { status: 200 });
    }

    const generationId = crypto.randomUUID();
    const createdAtIso = new Date().toISOString();

    const record: FoodImageGenerationStoredRecord = {
      id: generationId,
      ownerId: input.ownerId,
      dishName: input.dishName,
      dishDescription: input.dishDescription?.trim() || undefined,
      provider: providerResult.provider,
      model: providerResult.model,
      referenceImageCount: references.length,
      estimatedCost,
      imageBase64: providerResult.imageBase64,
      imageMimeType: providerResult.mimeType,
      createdAtIso,
    };

    await adminDb.transact(
      adminDb.tx.foodImages[generationId].update(record),
    );

    const response: FoodImageGenerationResult = {
      generationId,
      imageUrl: toImageUrl(generationId, input.ownerId),
      estimatedCost,
      provider: providerResult.provider,
      model: providerResult.model,
      mock: false,
    };

    console.info("[generate-food-image] success", {
      dishName: input.dishName,
      provider: response.provider,
      model: response.model,
      referenceImageCount: references.length,
      estimatedCost,
      generationId,
      status: "success",
    });

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[generate-food-image] error", {
      provider,
      model,
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    });

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Food image generatie is mislukt.",
      },
      { status: 500 },
    );
  }
}
