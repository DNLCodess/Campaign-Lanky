import sharp from "sharp";

export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported or corrupt image", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UnsupportedImageError";
  }
}

export class ImageTooLargeError extends Error {
  constructor(
    message = "This photo is too large. Export it at a smaller size and try again.",
  ) {
    super(message);
    this.name = "ImageTooLargeError";
  }
}

export const MAX_INPUT_PIXELS = 100_000_000;

export type VariantWidth = 640 | 1280 | 2048;

export type ProcessedImage = {
  width: number;
  height: number;
  blur: string;
  variants: { width: VariantWidth; data: Buffer }[];
};

const WIDTHS: VariantWidth[] = [640, 1280, 2048];

export async function processImage(
  input: Buffer,
  opts?: { maxPixels?: number },
): Promise<ProcessedImage> {
  const maxPixels = opts?.maxPixels ?? MAX_INPUT_PIXELS;
  // Decode once to raw pixels (orientation baked in): lossless and format-agnostic.
  let decoded: { data: Buffer; info: sharp.OutputInfo };
  try {
    const meta = await sharp(input).metadata();
    if ((meta.width ?? 0) * (meta.height ?? 0) > maxPixels) {
      throw new ImageTooLargeError();
    }
    decoded = await sharp(input, { limitInputPixels: maxPixels })
      .rotate().raw().toBuffer({ resolveWithObject: true });
  } catch (err) {
    if (err instanceof ImageTooLargeError) throw err;
    throw new UnsupportedImageError(
      err instanceof Error ? err.message : undefined,
      { cause: err },
    );
  }
  const { data, info } = decoded;
  const { width, height } = info;
  const raw = () =>
    sharp(data, { raw: { width, height, channels: info.channels } });

  const targets = WIDTHS.filter((w) => w <= width);
  if (targets.length === 0) targets.push(640);

  const variants: ProcessedImage["variants"] = [];
  for (const w of targets) {
    variants.push({
      width: w,
      data: await raw()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    });
  }

  const blurBuf = await raw()
    .resize({ width: 16, withoutEnlargement: true })
    .webp({ quality: 50 })
    .toBuffer();

  return {
    width,
    height,
    blur: `data:image/webp;base64,${blurBuf.toString("base64")}`,
    variants,
  };
}
