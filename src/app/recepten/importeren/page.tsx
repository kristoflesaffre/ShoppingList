"use client";
import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input_field";
import { ProgressSteps } from "@/components/ui/progress_steps";
import { FilterChip, FilterChipRow } from "@/components/ui/filter_chip";
type ImportJob = {
  sourceUrl: string | null;
  id: string;
  status: string;
  error: string | null;
  recipeId: string | null;
  usage?: { estimatedUsd: number | null };
};
const statuses = [
  "queued",
  "validating",
  "fetching",
  "comments",
  "analyzing",
  "screenshots",
  "matching",
  "saving",
  "completed",
];
const labels = [
  "Wachten op de worker",
  "Bron controleren",
  "Video ophalen",
  "Beschrijving en reacties verzamelen",
  "Video analyseren",
  "Videobeelden selecteren",
  "Ingrediënten koppelen",
  "Recept opslaan",
];
export default function RecipeVideoImportPage() {
  const { user } = db.useAuth();
  const [recovery, setRecovery] = React.useState<ImportJob | null>(null),
    [mode, setMode] = React.useState("url"),
    [url, setUrl] = React.useState(""),
    [video, setVideo] = React.useState<File | null>(null),
    [description, setDescription] = React.useState(""),
    [comments, setComments] = React.useState(""),
    [jobs, setJobs] = React.useState<ImportJob[]>([]),
    [serviceError, setServiceError] = React.useState(""),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [config, setConfig] = React.useState<{ local: boolean } | null>(null);
  const api = React.useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch("/api/recipe-importer/" + path, {
        ...init,
        headers: {
          ...(init?.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${user?.refresh_token || ""}`,
        },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Import mislukt.");
      return body;
    },
    [user?.refresh_token],
  );
  const refresh = React.useCallback(async () => {
    if (!user) return;
    try {
      const [data, settings] = await Promise.all([
        api("imports"),
        api("config"),
      ]);
      setJobs(data);
      setConfig(settings);
      setServiceError("");
    } catch (e) {
      setServiceError((e as Error).message);
    }
  }, [api, user]);
  React.useEffect(() => {
    const p = new URL(location.href).searchParams;
    const shared = p.get("url") || p.get("text") || "";
    const link = shared.match(/https:\/\/[^\s]+/);
    if (link) setUrl(link[0]);
  }, []);
  React.useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [api, refresh]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "video" && video) {
        if (video.size > 100 * 1024 * 1024)
          throw new Error("Gebruik een video van maximaal 100 MB.");
        if (config?.local) {
          const form = new FormData();
          form.set("video", video);
          if (recovery) form.set("recoveryJobId", recovery.id);
          form.set("comments", comments);
          form.set("description", description);
          if (url) form.set("sourceUrl", url);
          await api("upload", { method: "POST", body: form });
        } else {
          const path = `imports/${user!.id}/${crypto.randomUUID()}`;
          await db.storage.uploadFile(path, video, { contentType: video.type });
          if (recovery) {
            await api(`imports/${recovery.id}`, {
              method: "PATCH",
              body: JSON.stringify({ videoPath: path, mime: video.type }),
            });
          } else {
            const result = await api("imports", {
              method: "POST",
              body: JSON.stringify({
                videoPath: path,
                mime: video.type,
                sourceUrl: url || undefined,
                comments,
                description,
              }),
            });
            if (result.duplicate)
              await api(`imports/${result.id}`, {
                method: "PATCH",
                body: JSON.stringify({ videoPath: path, mime: video.type }),
              });
          }
        }
      } else
        await api("imports", {
          method: "POST",
          body: JSON.stringify({ sourceUrl: url, comments, description }),
        });
      setVideo(null);
      setRecovery(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="mx-auto max-w-[620px] px-4 py-20">
        <h1 className="text-page-title font-bold">
          Meld je aan om een video te importeren.
        </h1>
      </div>
    );
  return (
    <main className="mx-auto flex w-full max-w-[956px] flex-col gap-6 px-4 pb-40 pt-[calc(64px+env(safe-area-inset-top,0px))]">
      <Link
        href="/recepten"
        className="text-sm font-semibold text-[var(--blue-500)]"
      >
        Terug naar recepten
      </Link>
      <div>
        <h1 className="text-page-title font-bold leading-32">
          Importeer recept met AI
        </h1>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Van een kookvideo naar een recept in ‘Nog te testen’.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <form
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-[22px] bg-[var(--white)] p-5 md:p-6"
        >
          <FilterChipRow>
            <FilterChip
              selected={mode === "url"}
              onClick={() => {
                setMode("url");
                setRecovery(null);
              }}
            >
              TikTok-link
            </FilterChip>
            <FilterChip
              selected={mode === "video"}
              onClick={() => setMode("video")}
            >
              Video uploaden
            </FilterChip>
          </FilterChipRow>
          <InputField
            label={
              mode === "url"
                ? "TikTok-link"
                : "Oorspronkelijke TikTok-link (optioneel)"
            }
            type="url"
            disabled={!!recovery}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required={mode === "url"}
            placeholder="https://www.tiktok.com/@maker/video/…"
          />
          {recovery && (
            <div className="text-sm text-[var(--text-secondary)]">
              Je vult een bestaande import aan. De bronlink blijft bewaard.{" "}
              <button
                type="button"
                className="font-semibold text-[var(--blue-500)]"
                onClick={() => setRecovery(null)}
              >
                Annuleer herstel
              </button>
            </div>
          )}
          {mode === "video" && (
            <label className="flex flex-col gap-2 text-sm">
              Kookvideo
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mov"
                onChange={(e) => setVideo(e.target.files?.[0] || null)}
                required
              />
              <span className="text-xs text-[var(--text-secondary)]">
                MP4, MOV of WebM, maximaal 100 MB en 10 minuten.
              </span>
            </label>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--blue-500)]">
              Beschrijving of reacties toevoegen
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <InputField label="Videobeschrijving" asChild>
                <textarea
                  className="!h-28 py-3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={8000}
                />
              </InputField>
              <InputField label="Relevante reacties, één per regel" asChild>
                <textarea
                  className="!h-32 py-3"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  maxLength={16000}
                />
              </InputField>
              <p className="text-xs text-[var(--text-secondary)]">
                Vermeld bij geplakte reacties of ze van de maker komen.
              </p>
            </div>
          </details>
          <p className="rounded-[16px] bg-[var(--blue-25)] p-4 text-sm text-[var(--text-secondary)]">
            Je recept wordt als concept bewaard in{" "}
            <strong>Nog te testen</strong>. Ontbrekende hoeveelheden en
            conflicten blijven zichtbaar.
          </p>
          <Button
            type="submit"
            disabled={busy || !config || (mode === "video" && !video)}
          >
            {busy ? "Import toevoegen…" : "Importeer recept met AI"}
          </Button>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Een TikTok-link alleen is geen videoanalyse. Kunnen we de video niet
            ophalen? Upload dan het videobestand. Reacties zijn niet altijd
            toegankelijk.
          </p>
        </form>
        <section className="flex flex-col gap-4" aria-label="Je video-imports">
          <h2 className="text-xl font-bold">Je imports</h2>
          {(error || serviceError) && (
            <p
              role="alert"
              className="rounded-[16px] bg-[var(--white)] p-4 text-sm text-[var(--error-500)]"
            >
              {error || serviceError}
            </p>
          )}
          {!jobs.length && !error && !serviceError && (
            <p className="text-sm text-[var(--text-secondary)]">
              Hier volg je de echte voortgang van je imports. De Mac-worker
              verwerkt één video tegelijk.
            </p>
          )}
          {jobs.map((job) => (
            <article
              className="flex flex-col gap-4 rounded-[22px] bg-[var(--white)] p-5"
              key={job.id}
            >
              {job.status === "completed" ? (
                <>
                  <h3 className="font-semibold">Bewaard in Nog te testen</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Kijk ingrediënten, hoeveelheden en stappen na voor je gaat
                    koken.
                  </p>
                  <Button size="md" asChild>
                    <Link href={`/recepten/${job.recipeId}`}>
                      Recept nakijken
                    </Link>
                  </Button>
                </>
              ) : job.status === "failed" || job.status === "needs_upload" ? (
                <>
                  <p className="text-sm">{job.error}</p>
                  {job.status === "needs_upload" ? (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setRecovery(job);
                        setUrl(job.sourceUrl || "");
                        setMode("video");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Videobestand uploaden
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={async () => {
                        try {
                          await api(`imports/${job.id}`, {
                            method: "PATCH",
                            body: "{}",
                          });
                          setError("");
                          await refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Opnieuw proberen
                    </Button>
                  )}
                </>
              ) : (
                <ProgressSteps
                  steps={labels}
                  current={Math.max(0, statuses.indexOf(job.status))}
                />
              )}
              <small className="text-xs text-[var(--text-secondary)]">
                {job.usage?.estimatedUsd != null
                  ? `Geschatte AI-kost: $${job.usage.estimatedUsd.toFixed(4)}`
                  : "AI-kost verschijnt na de analyse."}
              </small>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
