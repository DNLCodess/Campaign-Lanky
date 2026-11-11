import sharp from "sharp";

export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported or corrupt image") {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

export type VariantWidth = 640 | 1280 | 2048;

export type ProcessedImage = {
  width: number;
  height: number;
  blur: string;
  variants: { width: VariantWidth; data: Buffer }[];
};

const WIDTHS: VariantWidth[] = [640, 1280, 2048];

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    // Bake EXIF orientation into pixels; output metadata is stripped by default.
    const { data: rotated, info } = await sharp(input)
      .rotate()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    const targets = WIDTHS.filter((w) => w <= width);
    if (targets.length === 0) targets.push(640);

    const variants = await Promise.all(
      targets.map(async (w) => ({
        width: w,
        data: await sharp(rotated)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      })),
    );

    const blurBuf = await sharp(rotated)
      .resize({ width: 16, withoutEnlargement: true })
      .webp({ quality: 50 })
      .toBuffer();

    return {
      width,
      height,
      blur: `data:image/webp;base64,${blurBuf.toString("base64")}`,
      variants,
    };
  } catch (err) {
    throw new UnsupportedImageError(err instanceof Error ? err.message : undefined);
  }
}
