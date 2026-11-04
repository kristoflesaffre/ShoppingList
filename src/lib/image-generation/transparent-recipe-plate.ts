import sharp from "sharp";

/** Flood-fill only the edge-connected matte; never replace it with a circular mask. */
export async function transparentRecipePlate(bytes: Buffer): Promise<Buffer> {
  const meta = await sharp(bytes, { limitInputPixels: 4096 * 4096 }).metadata();
  if (meta.width !== 1024 || meta.height !== 1024)
    throw Error("Gemini leverde geen vierkante foto van 1024 pixels.");
  if (meta.hasAlpha) {
    const { data } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const corners = [0, 1023, 1023 * 1024, 1024 * 1024 - 1];
    if (
      corners.every((i) => data[i * 4 + 3] === 0) &&
      data[(512 * 1024 + 512) * 4 + 3] === 255
    )
      return sharp(bytes).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  }
  const { data: pixels, info } = await sharp(bytes, {
    limitInputPixels: 4096 * 4096,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const cornerSamples = [0, w - 1, (h - 1) * w, n - 1];
  const matte = [0, 1, 2].map((c) =>
    Math.round(cornerSamples.reduce((s, i) => s + pixels[i * 4 + c], 0) / 4),
  );
  if (
    Math.abs(matte[0] - 255) > 45 ||
    matte[1] > 45 ||
    Math.abs(matte[2] - 255) > 45
  )
    throw Error(
      "Gemini leverde geen verwijderbare achtergrond. Je huidige foto blijft behouden.",
    );
  const distance2 = (i: number) =>
    [0, 1, 2].reduce((sum, c) => sum + (pixels[i * 4 + c] - matte[c]) ** 2, 0);
  const background = new Uint8Array(n);
  const queue = new Int32Array(n);
  let tail = 0;
  function add(i: number) {
    if (!background[i] && distance2(i) < 80 ** 2) {
      background[i] = 1;
      queue[tail++] = i;
    }
  }
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  for (let head = 0; head < tail; head++) {
    const i = queue[head];
    const x = i % w;
    const y = Math.floor(i / w);
    if (x) add(i - 1);
    if (x < w - 1) add(i + 1);
    if (y) add(i - w);
    if (y < h - 1) add(i + w);
  }
  if (tail < n * 0.1 || tail > n * 0.65)
    throw Error(
      "De achtergrond kon niet veilig transparant gemaakt worden. Je huidige foto blijft behouden.",
    );
  const output = Buffer.from(pixels);
  for (let i = 0; i < n; i++)
    if (background[i]) {
      output[i * 4] = 0;
      output[i * 4 + 1] = 0;
      output[i * 4 + 2] = 0;
      output[i * 4 + 3] = 0;
    }
  // Erode the detected background boundary to find clean interior samples.
  // This is hue-neutral: pink/plum ceramics must not be mistaken for matte spill.
  const cleanInterior = new Uint8Array(n);
  for (let y = 3; y < h - 3; y++)
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x;
      if (background[i] || distance2(i) <= 80 ** 2) continue;
      let clean = true;
      for (let dy = -3; dy <= 3 && clean; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (background[(y + dy) * w + x + dx]) {
            clean = false;
            break;
          }
        }
      if (clean) cleanInterior[i] = 1;
    }
  // Recover antialiasing and remove magenta contamination along the rim using
  // an interior ceramic color sample. Interior food pixels are never changed.
  for (let y = 7; y < h - 7; y++)
    for (let x = 7; x < w - 7; x++) {
      const i = y * w + x;
      let edge = false;
      for (let dy = -4; dy <= 4 && !edge; dy++)
        for (let dx = -4; dx <= 4; dx++)
          if (background[(y + dy) * w + x + dx] !== background[i]) {
            edge = true;
            break;
          }
      if (!edge) continue;
      let nearest = -1;
      let best = Infinity;
      for (let dy = -7; dy <= 7; dy++)
        for (let dx = -7; dx <= 7; dx++) {
          const j = (y + dy) * w + x + dx;
          const d = dx * dx + dy * dy;
          if (d < best && cleanInterior[j]) {
            nearest = j;
            best = d;
          }
        }
      if (nearest < 0) continue;
      let dot = 0;
      let norm = 0;
      for (let c = 0; c < 3; c++) {
        const f = pixels[nearest * 4 + c] - matte[c];
        dot += (pixels[i * 4 + c] - matte[c]) * f;
        norm += f * f;
      }
      let alpha = Math.max(0, Math.min(1, dot / norm));
      if (alpha < 0.025) alpha = 0;
      output[i * 4 + 3] = Math.round(alpha * 255);
      for (let c = 0; c < 3; c++)
        output[i * 4 + c] = alpha
          ? Math.round(
              Math.max(
                0,
                Math.min(
                  255,
                  (pixels[i * 4 + c] - (1 - alpha) * matte[c]) / alpha,
                ),
              ),
            )
          : 0;
    }

  if (
    !cornerSamples.every((i) => output[i * 4 + 3] === 0) ||
    output[(Math.floor(h / 2) * w + Math.floor(w / 2)) * 4 + 3] !== 255
  )
    throw Error(
      "De transparantiecontrole is mislukt. Je huidige foto blijft behouden.",
    );
  return sharp(output, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer();
}
