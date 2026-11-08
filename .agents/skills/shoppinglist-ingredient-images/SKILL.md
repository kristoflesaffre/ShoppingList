---
name: shoppinglist-ingredient-images
description: Generate missing ShoppingList ingredient photographs with imagegen, matching existing ingredient cutouts, and prepare or publish their WebP variants. Use for recipe ingredient images, not finished-dish photos or vacation items.
---

# Ingredient Images

Read `docs/ingredient-image-workflow.md` in the ShoppingList repository before generating.

First check `public/images/ingredients`, `public/ingredient-synonyms.json`, and the actual resolver in `src/lib/ingredient-photo-matching.ts`. A naming mismatch is not a missing image. Do not substitute a different ingredient (notably baking soda and baking powder, or sugar snaps and snow peas).

Use the built-in imagegen tool with actual existing category reference images, not text alone. Inspect the selected references before generating. Keep the category reference stable between requests; do not progressively use new generations as references. Use the prompt and reference selection in the workflow document. Read the imagegen skill for tool-specific requirements. Do not switch to paid API scripts without the user's authorization.

Generate one isolated ingredient per image, with real transparent alpha. No text, packaging, props or invented illustrations for these new cutouts. Existing packaging photos need not be replaced. Retain original generated files.

Run the preparation script to stage assets outside `public`. Inspect the normalized 320px image and the preview's 48px light/dark rows next to the reference. Reject wrong ingredient anatomy, clipped objects, color fringes, opaque/checkerboard backgrounds, or inconsistent camera/scale. Technical validation is not visual approval.

The owner approved this style and explicitly requested automatic handling on 2026-11-08. When asked to fill missing ingredient images, generate, stage, visually inspect, and publish candidates that pass the established style and technical checks without asking for approval per image. Then commit only this task's files, push to the existing Vercel-connected branch, and wait for the deployment result, subject to tool permissions. Do not include unrelated work. Ask only if the ingredient identity is ambiguous, a new style/reference category needs a decision, an existing image would be replaced, or quality cannot be achieved. Never silently replace existing assets, switch styles, or use paid API fallback. This is a requested workflow, not an unattended background job.

After publication verify 160/240/320 variants, actual name resolution (including aliases), HTTP delivery if a server is running, and the ingredient matching tests. Report local publication separately from deployment. No recipe data, category workbook, or unrelated assets need modification.
