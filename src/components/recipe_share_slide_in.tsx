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
const BLUE = "#4f55f1";
const TEXT_PRIMARY = "#16181a";
const TEXT_SECONDARY = "#595f6a";
const TEXT_TERTIARY = "#8c929d";
const BORDER = "#e2e4e6";
const BORDER_LIGHT = "#f1f1f3";
// A4 at 96 dpi = 794 × 1123 px; usable width with 52px side padding = 690px
const PAGE_W = 794;
const COLS = 5;
const SIDE_PAD = 52;
const CONTENT_W = PAGE_W - SIDE_PAD * 2; // 690px
const COL_GAP = 16;
const COL_W = (CONTENT_W - COL_GAP * (COLS - 1)) / COLS; // 218px

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: "22px",
        fontWeight: "700",
        color: TEXT_PRIMARY,
        margin: "0 0 20px 0",
        letterSpacing: "-0.2px",
        fontFamily: FONT,
      }}
    >
      {title}
    </h2>
  );
}

function RecipePdfLayout({
  recipe,
  ingredientPhotoUrls,
}: {
  recipe: SavedRecipe;
  ingredientPhotoUrls: (string | null)[];
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
        backgroundColor: "#ffffff",
        fontFamily: FONT,
        boxSizing: "border-box",
        padding: `56px ${SIDE_PAD}px 56px`,
        display: "flex",
        flexDirection: "column",
        color: TEXT_PRIMARY,
      }}
    >
      {/* ── Title ── */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: "800",
            color: TEXT_PRIMARY,
            margin: 0,
            lineHeight: "1.15",
            letterSpacing: "-0.8px",
            fontFamily: FONT,
          }}
        >
          {recipe.name}
        </h1>
      </div>

      {/* Persons + photo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          marginBottom: "44px",
        }}
      >
        {recipe.persons > 0 && (
          <p
            style={{
              fontSize: "16px",
              color: TEXT_TERTIARY,
              margin: 0,
              fontWeight: "400",
              letterSpacing: "0.1px",
            }}
          >
            {recipe.persons} {recipe.persons === 1 ? "persoon" : "personen"}
          </p>
        )}
        {recipe.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.photoUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: "240px",
              height: "240px",
              objectFit: "cover",
              borderRadius: "50%",
              boxShadow: "0 6px 32px rgba(0,0,0,0.13)",
              display: "block",
            }}
          />
        )}
      </div>

      {/* ── Ingredients ── */}
      {ingredients.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <SectionHeader title="Ingrediënten" />
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
                    gap: "10px",
                    padding: "16px 12px",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                    visibility: invisible ? "hidden" : "visible",
                  }}
                >
                  {!invisible && (
                    <>
                      {/* Image container — white bg, object-contain */}
                      <div
                        style={{
                          width: "88px",
                          height: "88px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          backgroundColor: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt=""
                            crossOrigin="anonymous"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          /* Placeholder dot when no image */
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
                      <div style={{ textAlign: "center" }}>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: TEXT_PRIMARY,
                            margin: "0 0 3px 0",
                            lineHeight: "1.35",
                            fontFamily: FONT,
                          }}
                        >
                          {ing!.name}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: "400",
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

      {/* ── Steps ── */}
      {recipeSteps.length > 0 && (
        <>
          <div style={{ height: "1px", backgroundColor: BORDER, marginBottom: "36px" }} />
          <div>
            <SectionHeader title="Bereiding" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recipeSteps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                    paddingTop: i === 0 ? "0" : "14px",
                    paddingBottom: i < recipeSteps.length - 1 ? "14px" : "0",
                    borderBottom:
                      i < recipeSteps.length - 1
                        ? `1px solid ${BORDER_LIGHT}`
                        : "none",
                  }}
                >
                  {/* Step number — grote vette tekst, zoals in de app */}
                  <span
                    style={{
                      flexShrink: 0,
                      width: "32px",
                      fontSize: "24px",
                      fontWeight: "800",
                      color: TEXT_PRIMARY,
                      lineHeight: "1",
                      paddingTop: "3px",
                      fontFamily: FONT,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p
                    style={{
                      fontSize: "14px",
                      color: TEXT_PRIMARY,
                      margin: 0,
                      lineHeight: "1.65",
                      flex: 1,
                      paddingTop: "5px",
                      fontFamily: FONT,
                    }}
                  >
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: "48px",
          borderTop: `1px solid ${BORDER_LIGHT}`,
          paddingTop: "14px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "11px", color: TEXT_TERTIARY, margin: 0, fontFamily: FONT }}>
          Shopping List App
        </p>
      </div>
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

  const handlePdfShare = React.useCallback(async () => {
    setGenerating(true);
    setPdfError(null);
    try {
      await preloadImages([recipe.photoUrl, ...ingredientPhotoUrls]);
      // Small tick so the browser can render the loaded images
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const element = pdfContainerRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const pdfW = 210; // A4 mm
      const pdfH = 297;
      // Aspect ratio of captured content
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Always fill full A4 width; split into pages at whitespace rows so text is never cut.
      const pageHeightPx = Math.floor(canvas.width * (pdfH / pdfW));

      // Find the last mostly-white row at or before `fromY` (search back up to `rangePx`).
      const lastWhiteRow = (fromY: number, rangePx: number): number => {
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) return fromY;
        const step = Math.max(1, Math.floor(canvas.width / 80));
        for (let y = fromY; y > Math.max(0, fromY - rangePx); y--) {
          const row = ctx2d.getImageData(0, y, canvas.width, 1).data;
          let white = true;
          for (let x = 0; x < row.length; x += step * 4) {
            if (row[x] < 238) { white = false; break; }
          }
          if (white) return y;
        }
        return Math.max(0, fromY - rangePx);
      };

      // Build page slices: [startPx, endPx]
      const slices: [number, number][] = [];
      let curY = 0;
      while (curY < canvas.height) {
        const ideal = curY + pageHeightPx;
        if (ideal >= canvas.height) {
          slices.push([curY, canvas.height]);
          break;
        }
        // Search back up to 12% of a page height for a safe whitespace break
        const safeY = lastWhiteRow(ideal, Math.floor(pageHeightPx * 0.12));
        slices.push([curY, safeY]);
        curY = safeY + 1;
      }

      // Render each slice onto its own PDF page
      for (let i = 0; i < slices.length; i++) {
        const [startY, endY] = slices[i];
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = endY - startY;
        const sCtx = sliceCanvas.getContext("2d")!;
        sCtx.drawImage(canvas, 0, startY, canvas.width, endY - startY, 0, 0, canvas.width, endY - startY);
        const sliceHeightMm = pdfW * (sliceCanvas.height / sliceCanvas.width);
        if (i > 0) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, pdfW, sliceHeightMm);
      }

      const pdfBlob = pdf.output("blob");
      const safeName = recipe.name.replace(/[^a-z0-9\u00C0-\u024F\s]/gi, "").trim() || "recept";
      const fileName = `${safeName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      // On mobile (iOS/Android) use native share sheet; on desktop always download.
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (
        isMobileDevice &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: recipe.name });
      } else {
        const objUrl = URL.createObjectURL(pdfBlob);
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
        setPdfError("PDF genereren mislukt. Probeer opnieuw.");
        console.error("PDF generation error:", err);
      }
    } finally {
      setGenerating(false);
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
            onClick={() => void handlePdfShare()}
            disabled={generating}
            className="w-full bg-transparent p-0 text-left disabled:opacity-50"
          >
            <SelectTile
              title="PDF delen"
              subtitle={generating ? "PDF genereren…" : "Genereer een PDF die je kan delen"}
              icon={<MaskIcon src="/icons/pdf.svg" ariaLabel="PDF" />}
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

      {/* Off-screen A4 layout captured by html2canvas */}
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
          />
        </div>
      </div>
    </>
  );
}
