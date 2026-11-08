# Ingredient Image Workflow

## Scope

These are the small ingredient cutouts in recipes, not recipe hero photos. The app resolves names through `src/lib/ingredient-photo-matching.ts`, with aliases from `public/ingredient-synonyms.json`. The catalog is discovered by `/api/ingredient-images` from `public/images/ingredients`.

Before generation check both filename and aliases. Do not confuse baking soda (sodium bicarbonate) with baking powder, or sugar snaps (plump edible pods) with flat snow peas. Never create a duplicate just to support a synonym.

## Style References

Use these existing images as the initial fixed references; the owner can revise this selection after reviewing the first trial. Always view the actual reference before generating and include it as a referenced image in imagegen.

| Category | Reference | Composition |
| --- | --- | --- |
| Fine powders | `public/images/ingredients/maizena_320.webp` | Same shallow wooden bowl, overhead view, white powder appropriate to the ingredient |
| Green vegetables | `public/images/ingredients/broccoli_320.webp` | Fresh raw produce, compact isolated object, three-quarter view |
| Bulbs / cloves | `public/images/ingredients/look_320.webp` | Natural compact grouping, whole and separated pieces only where useful |
| Sauces | `public/images/ingredients/sojasaus_320.webp` | Plain clear glass bowl, overhead view; preserve the actual sauce's viscosity and color |
| Chili pastes | `public/images/ingredients/tomatenpuree_320.webp` | Same clear glass bowl and overhead view; match the ingredient's actual texture, not tomato puree |

Not all legacy catalog images have identical style (some show packaging). Do not imitate every legacy exception or use arbitrary recipe photos. Do not reuse a newly generated image as a reference without explicit approval: that causes style drift.

## Imagegen Prompt

Use one generation per ingredient. Supply the selected reference image as a tool input, with `transparent_background: true`.

> Generate ONE ingredient catalog cutout of [precisely identified ingredient]. The input image is a STYLE AND COMPOSITION reference only; match its photorealistic texture, camera angle, soft neutral studio lighting, object scale, and restrained shadows. [Category-specific subject/container description.] Square composition, entire object visible and centered, narrow transparent margins, subject occupies roughly 90-94% of the longest dimension. True transparent alpha background. No text, labels, packaging, table, utensils, unrelated props, illustration, or 3D rendering. Must remain recognizable as a tiny 48px ingredient photograph. [Ingredient-specific distinctions, e.g. thick plump sugar snap pods, not flat snow peas.]

Keep powders in the same reference bowl, not a different container each time. Give produce a natural grouping; no containers unless the category reference requires one. Imagegen cannot guarantee identical style: compare results visually rather than assuming the prompt is sufficient.

## Prepare (Not Live)

```sh
node scripts/ingredient-images.mjs prepare --slug baking_soda --source /absolute/generated.png --reference public/images/ingredients/maizena_320.webp
```

This preserves an original and writes normalized 160/240/320 transparent WebP images, a checksummed manifest, and `preview.html` under `outputs/ingredient-images/baking_soda/`. The preview compares the reference and candidate at 48px on light/dark surfaces and at 160px. Nothing is placed in the active catalog. The script only crops transparent padding, centers, resizes and encodes; it never removes an opaque background or reconstructs the subject.

Inspect anatomy, lighting, edge halos, padding and small-size readability. White/checkerboard backgrounds baked into pixels require a new imagegen edit, not an improvised background-removal algorithm. Ask the user to approve the actual candidate. After rejection, stage a different version under a different slug-directory or archive the rejected staging folder explicitly; do not overwrite it silently.

## Publish Approved Candidate

```sh
node scripts/ingredient-images.mjs publish --slug baking_soda --approved
```

Only run after user approval. This verifies the staged hashes and image properties and creates all three catalog files with exclusive writes. It refuses to replace existing variants. The flag records the caller's approval assertion; it is not a substitute for asking the user.

If needed, add precise aliases to `public/ingredient-synonyms.json` after approval. Baking soda already maps to `baking_soda`; `Sugar snaps` resolves directly to `sugar_snaps`. Do not map `peultjes` to sugar snaps: they are different ingredients.

Run `npx vitest run scripts/ingredient-images.test.mjs src/lib/ingredient-photo-matching.test.ts`. Verify the actual ingredient names resolve to the published URLs and the files load in the app. The client catalog is cached for the page lifetime; a full refresh can be necessary. Adding files locally does not deploy them to the hosted app.

## Simple Request

“Vul de ontbrekende ingrediëntenafbeeldingen van dit recept aan volgens onze ingrediëntenstijl.”

Codex should then audit names, generate only missing items with references, prepare previews, and ask for approval before publication. It should not build or use a new image-generation API endpoint for this manual workflow.
