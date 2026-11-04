import { NextResponse } from "next/server";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { loadReferenceImages } from "@/lib/image-generation/referenceImages";
import { transparentRecipePlate } from "@/lib/image-generation/transparent-recipe-plate";
import {
  choosePlateColor,
  geminiImageCost,
  GEMINI_RECIPE_IMAGE_MODEL,
  imageRecordId,
  recipeImagePrompt,
  type ImageUsage,
} from "@/lib/image-generation/gemini-recipe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
class PhotoError extends Error {}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function metadata(value?: string) {
  try {
    return JSON.parse(value || "{}") as {
      recipeId?: string;
      requestId?: string;
      plateColor?: string;
      state?: string;
      usage?: ImageUsage;
    };
  } catch {
    return {};
  }
}
async function sourceBytes(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  const match = /^data:image\/(?:webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(
    url,
  );
  if (match)
    return match[1].length < 8_000_000 ? Buffer.from(match[1], "base64") : null;
  // Fetch only our own public image storage, never arbitrary recipe/source URLs.
  const parsed = new URL(url, "https://shoppinglist-azure.vercel.app");
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
    parsed.username ||
    parsed.password
  )
    return null;
  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (
    !response.ok ||
    Number(response.headers.get("content-length") || 0) > 6_000_000
  )
    return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length <= 6_000_000 ? bytes : null;
}

export async function POST(request: Request) {
  const admin = getInstantAdminDb();
  if (!admin || !process.env.GEMINI_API_KEY)
    return json(
      { error: "Foto’s maken is nog niet ingesteld op de server." },
      503,
    );
  const ownerId = await verifiedUserId(request);
  if (!ownerId)
    return json({ error: "Meld je opnieuw aan om een foto te maken." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "Ongeldige oorsprong." }, 403);
  const body = await request.json().catch(() => null);
  if (!UUID.test(body?.recipeId || "") || !UUID.test(body?.requestId || ""))
    return json({ error: "Ongeldig recept of fotovraag." }, 400);
  const { recipeId, requestId } = body as {
    recipeId: string;
    requestId: string;
  };
  const generationId = imageRecordId(
    `gemini-photo:${ownerId}:${recipeId}:${requestId}`,
  );
  const lockId = imageRecordId(`gemini-photo-lock:${ownerId}:${recipeId}`);
  const originalId = imageRecordId(
    `gemini-photo-original:${ownerId}:${recipeId}`,
  );
  let locked = false,
    started = false;
  let cost = 0;
  let meta: Record<string, unknown> = { recipeId, requestId, state: "pending" };
  try {
    const existing = (
      await admin.query({ foodImages: { $: { where: { id: generationId } } } })
    ).foodImages[0];
    if (existing) {
      if (existing.ownerId !== ownerId)
        return json({ error: "Deze foto is niet van jou." }, 403);
      if (metadata(existing.dishDescription).state === "completed")
        return json({
          imageUrl: existing.imageUrl,
          estimatedCost: existing.estimatedCost,
          generationId,
          replayed: true,
        });
      return json(
        {
          error:
            metadata(existing.dishDescription).state === "failed"
              ? "De vorige poging is mislukt. Je kunt bewust een nieuwe foto aanvragen."
              : "Deze fotoaanvraag is al gestart. Je foto verschijnt zodra ze klaar is. Er wordt geen tweede generatie gestart.",
          retrySameRequest:
            metadata(existing.dishDescription).state !== "failed",
        },
        409,
      );
    }
    const recipe = (
      await admin.query({
        recipes: { ingredients: {}, $: { where: { id: recipeId } } },
      })
    ).recipes[0];
    if (!recipe || recipe.ownerId !== ownerId)
      return json({ error: "Recept niet gevonden." }, 404);
    if (recipe.category !== "nog_te_testen")
      return json(
        { error: "Deze knop is alleen voor recepten onder Nog te testen." },
        409,
      );
    const refs = await loadReferenceImages();
    if (refs.length !== 4)
      throw new PhotoError("De vier stijlvoorbeelden ontbreken.");
    const base = {
      ownerId,
      dishName: recipe.name,
      provider: "gemini",
      model: GEMINI_RECIPE_IMAGE_MODEL,
      referenceImageCount: 4,
      estimatedCost: 0,
      imageBase64: "",
      imageMimeType: "image/webp",
      createdAtIso: new Date().toISOString(),
    };
    // Strict create is atomic across server instances: only one paid request per recipe at a time.
    try {
      await admin.transact(
        admin.tx.foodImages[lockId].create({
          ...base,
          provider: "gemini-lock",
          dishDescription: JSON.stringify(meta),
        }),
      );
      locked = true;
    } catch {
      return json(
        {
          error:
            "Er wordt al een foto voor dit gerecht gemaakt. Wacht tot die klaar is.",
          retrySameRequest: true,
        },
        409,
      );
    }
    const previous = (
      await admin.query({
        foodImages: {
          $: {
            where: { ownerId },
            fields: ["id", "provider", "dishDescription", "createdAtIso"],
          },
        },
      })
    ).foodImages;
    const recent = previous
      .filter(
        (r) =>
          r.provider === "gemini" &&
          metadata(r.dishDescription).state === "completed",
      )
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
    const priorColor = recent.find(
      (r) => metadata(r.dishDescription).recipeId === recipeId,
    );
    const plateColor = choosePlateColor(
      metadata(priorColor?.dishDescription).plateColor,
      recent
        .slice(0, 24)
        .map((r) => metadata(r.dishDescription).plateColor || ""),
    );
    meta = {
      ...meta,
      plateColor,
      sourceUrl: recipe.link,
      pricingCheckedAt: "2026-11-04",
    };
    const original = previous.some((r) => r.id === originalId)
      ? (
          await admin.query({
            foodImages: {
              $: { where: { id: originalId }, fields: ["id", "imageUrl"] },
            },
          })
        ).foodImages[0]
      : undefined;
    if (!original)
      await admin.transact(
        admin.tx.foodImages[originalId].create({
          ...base,
          provider: "recipe-photo-original",
          imageUrl: recipe.photoUrl || "",
          dishDescription: JSON.stringify({ recipeId }),
        }),
      );
    const source = await sourceBytes(original?.imageUrl || recipe.photoUrl);
    const ingredients = [...recipe.ingredients]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((i) => ({ name: i.name, quantity: i.quantity }));
    const prompt = recipeImagePrompt(
      {
        name: recipe.name,
        steps: (recipe.steps || "").slice(0, 24000),
        ingredients: ingredients.slice(0, 100),
      },
      plateColor,
      Boolean(source),
    );
    const parts: (
      { text: string } | { inlineData: { mimeType: string; data: string } }
    )[] = [{ text: prompt }];
    for (const ref of refs)
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: (
            await sharp(ref.bytes)
              .resize(768, 768, { fit: "inside" })
              .png()
              .toBuffer()
          ).toString("base64"),
        },
      });
    if (source)
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: (
            await sharp(source)
              .resize(768, 768, { fit: "inside" })
              .png()
              .toBuffer()
          ).toString("base64"),
        },
      });
    await admin.transact(
      admin.tx.foodImages[generationId].create({
        ...base,
        dishDescription: JSON.stringify(meta),
      }),
    );
    started = true;
    // One call, no SDK retries or automatic paid regeneration on errors.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_RECIPE_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            candidateCount: 1,
            maxOutputTokens: 8192,
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
          },
        }),
        signal: AbortSignal.timeout(180000),
      },
    );
    if (!response.ok)
      throw new PhotoError(
        response.status === 429
          ? "Gemini is tijdelijk te druk. Probeer het later opnieuw."
          : "Gemini kon de foto niet maken. Je huidige foto blijft behouden.",
      );
    const payload = (await response.json()) as {
      usageMetadata?: ImageUsage;
      candidates?: {
        content?: {
          parts?: {
            thought?: boolean;
            inlineData?: { mimeType: string; data: string };
          }[];
        };
      }[];
    };
    const images = (payload.candidates || [])
      .flatMap((c) => c.content?.parts || [])
      .filter(
        (p) => p.inlineData?.mimeType?.startsWith("image/") && !p.thought,
      );
    cost = geminiImageCost(payload.usageMetadata || {}, images.length);
    meta = { ...meta, usage: payload.usageMetadata || {}, state: "generated" };
    // Persist usage and raw bytes before local processing; paid work remains auditable if finishing fails.
    await admin.transact(
      admin.tx.foodImages[generationId].update({
        estimatedCost: cost,
        dishDescription: JSON.stringify(meta),
        imageBase64: images[0]?.inlineData?.data || "",
        imageMimeType: images[0]?.inlineData?.mimeType || "image/webp",
      }),
    );
    if (images.length !== 1)
      throw new PhotoError(
        "Gemini leverde geen bruikbare gerechtfoto. Je huidige foto blijft behouden.",
      );
    let image: Buffer;
    try {
      image = await transparentRecipePlate(
        Buffer.from(images[0].inlineData!.data, "base64"),
      );
    } catch {
      throw new PhotoError(
        "De achtergrond kon niet veilig transparant gemaakt worden. Je huidige foto blijft behouden.",
      );
    }
    let imageUrl = `data:image/webp;base64,${image.toString("base64")}`;
    if (process.env.BLOB_READ_WRITE_TOKEN)
      imageUrl = (
        await put(
          `user-images/${ownerId}/generated-recipe-photo/${generationId}.webp`,
          image,
          { access: "public", contentType: "image/webp" },
        )
      ).url;
    const current = (
      await admin.query({ recipes: { $: { where: { id: recipeId } } } })
    ).recipes[0];
    if (
      !current ||
      current.ownerId !== ownerId ||
      current.category !== "nog_te_testen" ||
      current.link !== recipe.link ||
      current.photoUrl !== recipe.photoUrl
    )
      throw new PhotoError(
        "Het recept of de foto is intussen gewijzigd. De gemaakte foto is bewaard; je huidige foto is niet overschreven.",
      );
    await admin.transact([
      admin.tx.foodImages[generationId].update({
        imageUrl,
        imageBase64: process.env.BLOB_READ_WRITE_TOKEN
          ? ""
          : image.toString("base64"),
        imageMimeType: "image/webp",
        imageSize: image.length,
        dishDescription: JSON.stringify({ ...meta, state: "completed" }),
      }),
      admin.tx.recipes[recipeId].update(
        { photoUrl: imageUrl },
        { upsert: false },
      ),
    ]);
    return json({ imageUrl, generationId, estimatedCost: cost, plateColor });
  } catch (error) {
    if (started)
      await admin
        .transact(
          admin.tx.foodImages[generationId].update({
            estimatedCost: cost,
            dishDescription: JSON.stringify({ ...meta, state: "failed" }),
          }),
        )
        .catch(() => {});
    // Do not expose provider payloads, prompts, tokens or configuration in responses/logs.
    const message =
      error instanceof PhotoError
        ? error.message
        : "De foto kon niet worden opgeslagen. Je huidige foto blijft behouden.";
    return json({ error: message, estimatedCost: cost }, 502);
  } finally {
    if (locked)
      await admin
        .transact(admin.tx.foodImages[lockId].delete())
        .catch(() => {});
  }
}
