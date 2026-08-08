import type { FindingImage } from "@/types";

/**
 * Client-side image resize/compress, per SPECIFICATION.md section 6.
 * Longest edge capped at 1280px, JPEG quality ladder 0.6 -> 0.4 -> 0.3.
 * Throws (never silently truncates) if still over 200KB after all
 * attempts, and separately enforces the per-finding image budget.
 */

const MAX_EDGE_PX = 1280;
const MAX_COMPRESSED_BYTES = 200 * 1024;
const QUALITY_LADDER = [0.6, 0.4, 0.3] as const;
const MAX_TOTAL_BUDGET_BYTES = 700 * 1024;
const MAX_IMAGE_COUNT = 6;

export interface CompressedImage {
  dataUrl: string;
  sizeBytes: number;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("このブラウザではCanvas 2Dコンテキストを利用できません。");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    let lastBlobSizeBytes = 0;
    for (const quality of QUALITY_LADDER) {
      const blob = await canvasToJpegBlob(canvas, quality);
      lastBlobSizeBytes = blob.size;
      if (blob.size <= MAX_COMPRESSED_BYTES) {
        return { dataUrl: await blobToDataUrl(blob), sizeBytes: blob.size };
      }
    }

    const finalSizeKb = Math.round(lastBlobSizeBytes / 1024);
    throw new Error(
      `画像の圧縮後サイズが200KBを超えています(現在: ${finalSizeKb}KB)。別の画像を使用するか、事前に解像度を下げてください。`,
    );
  } finally {
    bitmap.close();
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("画像のJPEGエンコードに失敗しました。"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("圧縮した画像の読み込みに失敗しました。"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("圧縮した画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Enforces the per-finding image budget (max 700KB total, max 6 images)
 * before a new image is appended to finding.images[]. Throws with the
 * exact numbers so the user knows why the upload was rejected.
 */
export function checkImageBudget(
  existingImages: readonly FindingImage[],
  newImageSizeBytes: number,
): void {
  if (existingImages.length + 1 > MAX_IMAGE_COUNT) {
    throw new Error(`画像は最大${MAX_IMAGE_COUNT}枚までです(現在: ${existingImages.length}枚)。`);
  }

  const currentTotalBytes = existingImages.reduce((sum, image) => sum + image.sizeBytes, 0);
  const projectedTotalBytes = currentTotalBytes + newImageSizeBytes;
  if (projectedTotalBytes > MAX_TOTAL_BUDGET_BYTES) {
    const currentKb = Math.round(currentTotalBytes / 1024);
    const newKb = Math.round(newImageSizeBytes / 1024);
    const limitKb = Math.round(MAX_TOTAL_BUDGET_BYTES / 1024);
    throw new Error(
      `画像の合計サイズが上限を超えています(現在: ${currentKb}KB + 追加: ${newKb}KB > 上限: ${limitKb}KB)。`,
    );
  }
}
