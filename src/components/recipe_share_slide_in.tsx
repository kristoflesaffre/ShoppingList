"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { SelectTile } from "@/components/ui/select_tile";
import { Snackbar } from "@/components/ui/snackbar";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";
import type { SavedRecipe } from "@/lib/recipe_library";

// ─── Icons (mask-image van /icons/*.svg, kleur via CSS) ───────────────────────

function MaskIcon({ src, ariaLabel }: { src: string; ariaLabel: string }) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="inline-block size-10 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Replaces near-white pixels (all channels > 235) with the given hex bg color.
 * Used to remove the white JPEG background from AI-generated recipe photos so
 * they blend into the export's colored background.
 */
async function replaceWhiteWithBg(src: string, bgHex: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const bgR = parseInt(bgHex.slice(1, 3), 16);
      const bgG = parseInt(bgHex.slice(3, 5), 16);
      const bgB = parseInt(bgHex.slice(5, 7), 16);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function preloadImages(urls: (string | null | undefined)[]): Promise<void> {
  const valid = urls.filter(Boolean) as string[];
  await Promise.all(
    valid.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
}

// ─── PDF layout (off-screen, captured by html2canvas) ─────────────────────────

const FONT = '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif';
const BG = "#edeefe";
const TEXT_PRIMARY = "#16181a";
const TEXT_SECONDARY = "#595f6a";
const BORDER_LIGHT = "#e8e8ec";
// A4 at 96 dpi = 794 × 1123 px
const PAGE_W = 794;
const COLS = 6;
const SIDE_PAD = 40;
const CONTENT_W = PAGE_W - SIDE_PAD * 2; // 714px
const COL_GAP = 10;
const COL_W = (CONTENT_W - COL_GAP * (COLS - 1)) / COLS; // ~109px

const SHADOW = "0 8px 28px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.16)";

function RecipePdfLayout({
  recipe,
  ingredientPhotoUrls,
  photoUrlOverride,
}: {
  recipe: SavedRecipe;
  ingredientPhotoUrls: (string | null)[];
  photoUrlOverride?: string | null;
}) {
  const recipeSteps = (recipe.steps ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ""))
    .filter((s) => s.length > 0);

  // Pad to full rows of COLS so flex alignment is clean
  const ingredients = recipe.ingredients;
  const remainder = ingredients.length % COLS;
  const paddedIngredients: (typeof ingredients[0] | null)[] = [
    ...ingredients,
    ...(remainder > 0 ? Array(COLS - remainder).fill(null) : []),
  ];
  const paddedPhotoUrls: (string | null)[] = [
    ...ingredientPhotoUrls,
    ...(remainder > 0 ? Array(COLS - remainder).fill(null) : []),
  ];

  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        backgroundColor: BG,
        fontFamily: FONT,
        boxSizing: "border-box",
        padding: `48px ${SIDE_PAD}px 56px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: TEXT_PRIMARY,
      }}
    >
      {/* ── Header pill — exact Figma scaling: radius=208.587/2100×794≈79px,
           padding=49.53/2100×794≈19px vertical, 62.576/2100×794≈24px horizontal
           RECEPT: 29.932/2100×794≈11px medium, name: 62.402/2100×794≈24px bold ── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "79px",
          padding: "19px 24px",
          textAlign: "center",
          marginBottom: "36px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: "500",
            color: TEXT_SECONDARY,
            margin: "0 0 2px 0",
            letterSpacing: "0px",
            fontFamily: FONT,
            lineHeight: "normal",
          }}
        >
          RECEPT
        </p>
        <p
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: TEXT_PRIMARY,
            margin: 0,
            lineHeight: "normal",
            fontFamily: FONT,
          }}
        >
          {recipe.name}
        </p>
      </div>

      {/* ── Recipe photo ── */}
      {(photoUrlOverride ?? recipe.photoUrl) && (
        <div
          style={{
            width: "210px",
            height: "210px",
            borderRadius: "50%",
            overflow: "hidden",
            backgroundColor: BG,
            flexShrink: 0,
            marginBottom: "40px",
            boxShadow: SHADOW,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(photoUrlOverride ?? recipe.photoUrl)!}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      )}

      {/* ── Ingredients ── */}
      {ingredients.length > 0 && (
        <div style={{ width: "100%", marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: `${COL_GAP}px`,
            }}
          >
            {paddedIngredients.map((ing, i) => {
              const photoUrl = paddedPhotoUrls[i];
              const invisible = ing === null;
              return (
                <div
                  key={i}
                  style={{
                    width: `${COL_W}px`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    boxSizing: "border-box",
                    visibility: invisible ? "hidden" : "visible",
                  }}
                >
                  {!invisible && (
                    <>
                      {/* Square image */}
                      <div
                        style={{
                          width: `${COL_W}px`,
                          height: `${COL_W}px`,
                          overflow: "hidden",
                          backgroundColor: BG,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: SHADOW,
                          borderRadius: "8px",
                        }}
                      >
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt=""
                            crossOrigin="anonymous"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: BORDER_LIGHT,
                            }}
                          />
                        )}
                      </div>
                      {/* Name + quantity */}
                      <div style={{ textAlign: "center", width: "100%" }}>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: TEXT_PRIMARY,
                            margin: "0 0 2px 0",
                            lineHeight: "1.3",
                            fontFamily: FONT,
                          }}
                        >
                          {ing!.name}
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: TEXT_SECONDARY,
                            margin: 0,
                            fontFamily: FONT,
                          }}
                        >
                          {ing!.quantity}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Steps (white rounded card) ── */}
      {recipeSteps.length > 0 && (
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            padding: "32px 40px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recipeSteps.map((step, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "flex-start",
                    padding: "16px 0",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: "28px",
                      fontSize: "22px",
                      fontWeight: "700",
                      color: TEXT_PRIMARY,
                      lineHeight: "1.4",
                      fontFamily: FONT,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      color: TEXT_SECONDARY,
                      margin: 0,
                      lineHeight: "1.7",
                      flex: 1,
                      paddingTop: "4px",
                      fontFamily: FONT,
                    }}
                  >
                    {step}
                  </p>
                </div>
                {i < recipeSteps.length - 1 && (
                  <div style={{ height: "1px", backgroundColor: BORDER_LIGHT }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface RecipeShareSlideInProps {
  open: boolean;
  onClose: () => void;
  recipe: SavedRecipe;
  existingShareToken?: string | null;
}

export function RecipeShareSlideIn({
  open,
  onClose,
  recipe,
  existingShareToken,
}: RecipeShareSlideInProps) {
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);
  const [linkHint, setLinkHint] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [exportPhotoUrl, setExportPhotoUrl] = React.useState<string | null>(null);
  const [isLg, setIsLg] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const getIngredientPhotoUrl = useIngredientPhotoUrl(240);

  const ingredientPhotoUrls = React.useMemo(
    () => recipe.ingredients.map((ing) => getIngredientPhotoUrl(ing.name, ing.quantity)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipe.ingredients, getIngredientPhotoUrl],
  );

  React.useEffect(() => {
    if (!open) {
      setLinkHint(null);
      setPdfError(null);
    }
  }, [open]);

  const handleLinkShare = React.useCallback(async () => {
    try {
      let token = existingShareToken ?? null;
      if (!token) {
        token = iid();
        await db.transact(
          db.tx.recipes[recipe.id].update({ shareToken: token }),
        );
      }
      const url = `${window.location.origin}/deel/recept/${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(url);
      setLinkHint("Link gekopieerd");
      window.setTimeout(() => setLinkHint(null), 2500);
    } catch {
      setLinkHint("Kopiëren mislukt");
      window.setTimeout(() => setLinkHint(null), 2500);
    }
  }, [existingShareToken, recipe.id]);

  const handlePngShare = React.useCallback(async () => {
    setGenerating(true);
    setPdfError(null);
    try {
      await preloadImages([recipe.photoUrl, ...ingredientPhotoUrls]);
      // Replace white background of recipe photo so it blends into the BG color
      if (recipe.photoUrl) {
        const processed = await replaceWhiteWithBg(recipe.photoUrl, BG);
        setExportPhotoUrl(processed);
      }
      // Allow React to re-render with the processed photo before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));

      const { default: html2canvas } = await import("html2canvas");

      const element = pdfContainerRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: BG,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const safeName = recipe.name.replace(/[^a-z0-9\u00C0-\u024F\s]/gi, "").trim() || "recept";
      const fileName = `${safeName}.png`;

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob mislukt"))), "image/png"),
      );
      const file = new File([blob], fileName, { type: "image/png" });

      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (
        isMobileDevice &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: recipe.name });
      } else {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setPdfError("Afbeelding genereren mislukt. Probeer opnieuw.");
        console.error("PNG generation error:", err);
      }
    } finally {
      setGenerating(false);
      setExportPhotoUrl(null);
    }
  }, [recipe, ingredientPhotoUrls]);

  return (
    <>
      {linkHint ? (
        <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[70] flex justify-center px-4 pointer-events-none">
          <Snackbar message={linkHint} actionLabel={null} />
        </div>
      ) : null}

      <SlideInModal open={open} onClose={onClose} title="Recept delen">
        <div className="flex w-full flex-col gap-4 pb-[calc(45px+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={() => void handleLinkShare()}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Link delen"
              subtitle="om het recept toe te voegen in de app"
              icon={<MaskIcon src="/icons/link.svg" ariaLabel="Link" />}
            />
          </button>

          <button
            type="button"
            onClick={() => void handlePngShare()}
            disabled={generating}
            className="w-full bg-transparent p-0 text-left disabled:opacity-50"
          >
            <SelectTile
              title={isLg ? "Afbeelding downloaden" : "Afbeelding delen"}
              subtitle={generating ? "Afbeelding genereren…" : "Genereer een PNG die je kan delen"}
              icon={<MaskIcon src="/icons/image.svg" ariaLabel="Afbeelding" />}
              state={generating ? "disabled" : "default"}
            />
          </button>
          {pdfError ? (
            <p className="text-center text-xs text-[var(--error-600)]" role="alert">
              {pdfError}
            </p>
          ) : null}
        </div>
      </SlideInModal>

      {/* Off-screen layout captured by html2canvas */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div ref={pdfContainerRef}>
          <RecipePdfLayout
            recipe={recipe}
            ingredientPhotoUrls={ingredientPhotoUrls}
            photoUrlOverride={exportPhotoUrl}
          />
        </div>
      </div>
    </>
  );
}
