"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { ShareListModal } from "@/components/share_list_modal";
import { useIngredientPhotoUrl } from "@/lib/ingredient-photos";
import type { SavedRecipe } from "@/lib/recipe_library";

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
    if (!open) setPdfError(null);
  }, [open]);

  /* Deellink: bestaand token, of één aanmaken zodra het blad opent (zoals bij lijstjes). */
  const [token, setToken] = React.useState<string | null>(existingShareToken ?? null);
  React.useEffect(() => {
    if (existingShareToken) setToken(existingShareToken);
  }, [existingShareToken]);
  React.useEffect(() => {
    if (!open || token) return;
    const next = iid();
    setToken(next);
    void db.transact(db.tx.recipes[recipe.id].update({ shareToken: next }));
  }, [open, token, recipe.id]);
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);
  const shareUrl = token && origin ? `${origin}/deel/recept/${encodeURIComponent(token)}` : "";

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

  /* Canvas «19 · Recept delen»: zelfde deelblad als lijstjes, met het bord in de kop en de receptkaart eronder. */
  return (
    <>
      <ShareListModal
        open={open}
        onClose={onClose}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
        title=""
        heading={`${recipe.name} delen`}
        description="Wie de link opent, kan het recept in de app bewaren."
        shareMessage={`Bekijk het recept «${recipe.name}» in Shopping list:`}
        emailSubject={`Recept: ${recipe.name}`}
        headerMedia={
          <span className="mx-auto block size-[104px] overflow-hidden rounded-full bg-[var(--white)] shadow-[0_14px_26px_-14px_rgba(16,17,48,0.45)]">
            {recipe.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
              <img src={recipe.photoUrl} alt="" className="size-full scale-[1.08] object-cover" />
            ) : null}
          </span>
        }
        extra={
          <>
            <div aria-hidden className="h-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-3.5 rounded-[20px] bg-[var(--white)] py-3.5 pl-4 pr-3.5 shadow-[0_0_0_1px_var(--border-subtle)]">
              <RecipeCardPreview recipe={recipe} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-5 text-[var(--text-primary)]">Als receptkaart</p>
                <p className="mb-2.5 mt-0.5 text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                  Een mooie afbeelding met foto, ingrediënten en stappen.
                </p>
                <button
                  type="button"
                  onClick={() => void handlePngShare()}
                  disabled={generating}
                  className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3.5 text-[13.5px] font-bold text-[var(--blue-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-60 [@media(hover:hover)]:hover:bg-[var(--blue-100)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                    {isLg ? <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /> : <path d="M12 3v12M8 7l4-4 4 4M6 11v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8" />}
                  </svg>
                  {generating ? "Afbeelding maken…" : isLg ? "Downloaden" : "Afbeelding delen"}
                </button>
                {pdfError ? (
                  <p role="alert" className="mt-2 text-xs text-[var(--error-600)]">
                    {pdfError}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        }
      />

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

/** Kleine voorvertoning van de receptkaart-afbeelding (licht gekanteld). */
function RecipeCardPreview({ recipe }: { recipe: SavedRecipe }) {
  return (
    <span
      aria-hidden
      className="flex h-[98px] w-[74px] shrink-0 -rotate-[4deg] flex-col items-center gap-1 rounded-[12px] bg-[linear-gradient(180deg,#fbf3df,#fffaf0)] px-2 pt-2 shadow-[0_8px_16px_-10px_rgba(16,17,48,0.35),inset_0_0_0_1px_rgba(16,17,48,0.06)]"
    >
      <span className="block size-[38px] overflow-hidden rounded-full bg-[var(--white)]">
        {recipe.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL uit InstantDB
          <img src={recipe.photoUrl} alt="" className="size-full scale-[1.08] object-cover" />
        ) : null}
      </span>
      <span className="w-full truncate text-center text-[7px] font-extrabold text-[#16181a]">{recipe.name}</span>
      <span className="flex w-full flex-col gap-[3px]">
        <span className="block h-1 w-[90%] rounded-sm bg-[#e7d9c4]" />
        <span className="block h-1 w-[70%] rounded-sm bg-[#e7d9c4]" />
        <span className="block h-1 w-[80%] rounded-sm bg-[#e7d9c4]" />
      </span>
    </span>
  );
}
