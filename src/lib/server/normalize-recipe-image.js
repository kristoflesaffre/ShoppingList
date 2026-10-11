import sharp from "sharp";

const DEFAULT_SIZE = 512;

function isEdgeBackground(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const chroma = max - min;

  // Recipe photos use a white studio sweep. Including neutral light-grey pixels
  // removes its baked-in shadow while a coloured plate rim stops the flood fill.
  return (min >= 170 && chroma <= 48) || (min >= 225 && chroma <= 72);
}

function findEdgeBackgroundMask(pixels, width, height) {
  const total = width * height;
  const background = new Uint8Array(total);
  const queued = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (queued[index]) return;
    queued[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const offset = index * 3;
    if (!isEdgeBackground(pixels[offset], pixels[offset + 1], pixels[offset + 2])) {
      continue;
    }
    background[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  return background;
}

function subjectBounds(background, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (background[y * width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return { left: 0, top: 0, width, height };
  }
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function circleMask(size) {
  const mask = Buffer.alloc(size * size);
  const center = (size - 1) / 2;
  const radius = center - 2;
  const feather = 1.25;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center);
      const alpha = Math.max(0, Math.min(1, radius + feather - distance));
      mask[y * size + x] = Math.round(alpha * 255);
    }
  }
  return mask;
}

/**
 * Turns a centred top-down dish photo into a transparent, shadow-free round
 * recipe icon. The edge-connected flood fill protects white food inside a plate.
 */
export async function normalizeRecipeImage(input, options = {}) {
  const size = options.size ?? DEFAULT_SIZE;
  const source = sharp(input, { failOn: "none" }).rotate();
  const metadata = await source.metadata();
  const sourceWidth = metadata.width ?? size;
  const sourceHeight = metadata.height ?? size;
  const analysisSize = Math.max(sourceWidth, sourceHeight);

  const { data: rgb } = await source
    .clone()
    .flatten({ background: "#ffffff" })
    .resize(analysisSize, analysisSize, {
      fit: "contain",
      background: "#ffffff",
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const background = findEdgeBackgroundMask(rgb, analysisSize, analysisSize);
  const bounds = subjectBounds(background, analysisSize, analysisSize);
  const side = Math.max(bounds.width, bounds.height);
  const padding = Math.max(2, Math.round(side * 0.015));
  const cropSide = Math.min(analysisSize, side + padding * 2);
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const cropLeft = Math.max(0, Math.min(analysisSize - cropSide, Math.round(centerX - cropSide / 2)));
  const cropTop = Math.max(0, Math.min(analysisSize - cropSide, Math.round(centerY - cropSide / 2)));

  const rgba = Buffer.alloc(analysisSize * analysisSize * 4);
  for (let i = 0; i < analysisSize * analysisSize; i++) {
    rgba[i * 4] = rgb[i * 3];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = background[i] ? 0 : 255;
  }

  const normalized = await sharp(rgba, {
    raw: { width: analysisSize, height: analysisSize, channels: 4 },
  })
    .extract({ left: cropLeft, top: cropTop, width: cropSide, height: cropSide })
    .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .composite([
      {
        input: circleMask(size),
        raw: { width: size, height: size, channels: 1 },
        blend: "dest-in",
      },
    ])
    .webp({ quality: 92, alphaQuality: 100, effort: 5 })
    .toBuffer();

  return normalized;
}
