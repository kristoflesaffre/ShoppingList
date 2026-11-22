# ShoppingList recipe photo workflow

Finished-dish thumbnails use a consistent square asset: a photorealistic, exact-overhead view of one centered round ceramic plate, full rim visible, rich muted speckled glaze, soft studio lighting, and real transparent alpha outside the plate. No table, cutlery, hands, text, exterior shadow, or unrelated garnish.

For creating or filling these images, use `.agents/skills/shoppinglist-recipe-photos/SKILL.md` and the built-in imagegen skill. The fixed, approved style references are:

- `public/images/reference_images/reference_image_1.png` — green/teal plate, simple composed dish, strict overhead view.
- `public/images/reference_images/reference_image_2.png` — teal plate, curry with rice and bread, strict overhead view.
- `public/images/reference_images/reference_image_3.png` — ochre plate, pasta, strict overhead view.
- `public/images/reference_images/reference_image_4.png` — terracotta plate, lasagna, strict overhead view.

The style audit of the current approved library covers 49 illustrated recipes. It finds a consistent overhead, centered finished-dish photograph with natural food texture and restrained plating. Most examples use a round glazed plate or bowl, often with muted colored glaze; a small number use a more suitable pizza, rack, baking tray, or platter. For new test-recipe photos, keep the more consistent circular plate/bowl standard requested here. The references define camera, plate material, lighting, food realism, and restrained plating. Use each as reference for every independent generation; never chain generated outputs as new style references. Treat recipe metadata and owner screenshots only as dish-fidelity information. Preserve existing photos and all recipe data. Only attach images to empty `photoUrl` fields after visual and alpha review.

Ingredient cutouts are a separate workflow: `.agents/skills/shoppinglist-ingredient-images/SKILL.md` and `docs/ingredient-image-workflow.md`.

## Veilige batch-koppeling

Analyseer de goedgekeurde stijl opnieuw met `node --env-file=.env.local scripts/analyze-approved-recipe-photos.mjs .cache/recipe-photo-style`. Bewaar een reviewmanifest met per item `id`, `name` en `file`, en plaats de PNG-bestanden in de submap `images/`. Draai eerst een controle zonder databasewijzigingen:

```sh
node --env-file=.env.local scripts/attach-generated-recipe-photos.mjs --manifest .cache/recipe-photo-batch/manifest.json
```

Na visuele controle van alle afbeeldingen:

```sh
node --env-file=.env.local scripts/attach-generated-recipe-photos.mjs --manifest .cache/recipe-photo-batch/manifest.json --apply
```

De script normaliseert naar transparante WebP van 512 px, uploadt naar de bestaande Vercel Blob-opslag, controleert de bereikbaarheid, en koppelt de foto atomair alleen als het recept nog steeds foto-loos in `nog_te_testen` zit. Het vervangt nooit bestaande foto’s. De afbeelding en databasewijziging zijn meteen live; de script verwijdert nooit bestaande uploads.
