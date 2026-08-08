"use client";

import { useRef, useState } from "react";

import ErrorMessage from "@/components/ErrorMessage";
import { checkImageBudget, compressImage } from "@/lib/imageCompress";
import type { FindingImage } from "@/types";

interface ImageUploadWidgetProps {
  images: FindingImage[];
  onChange: (images: FindingImage[]) => void;
  /** Fires once per successfully added image, e.g. to insert its markdown token into the description. */
  onImageAdded?: (image: FindingImage) => void;
  disabled?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "画像の追加に失敗しました。";
}

/**
 * Compresses selected files (src/lib/imageCompress.ts), enforces the
 * per-finding budget before accepting each one, and shows a thumbnail
 * grid of finding.images[] with per-image removal. Compression/budget
 * errors are surfaced verbatim (they already carry exact byte counts).
 */
export default function ImageUploadWidget({
  images,
  onChange,
  onImageAdded,
  disabled = false,
}: ImageUploadWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setUploading(true);
    try {
      let currentImages = images;
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        checkImageBudget(currentImages, compressed.sizeBytes);
        const newImage: FindingImage = {
          id: globalThis.crypto.randomUUID(),
          dataUrl: compressed.dataUrl,
          filename: file.name,
          sizeBytes: compressed.sizeBytes,
        };
        currentImages = [...currentImages, newImage];
        onChange(currentImages);
        onImageAdded?.(newImage);
      }
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (imageId: string) => {
    onChange(images.filter((image) => image.id !== imageId));
  };

  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-medium text-light-text">画像</div>
      <ErrorMessage message={error} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        disabled={disabled || uploading}
        className="block text-sm text-medium-text file:mr-4 file:rounded-md file:border file:border-dark-border file:bg-dark-card file:px-3 file:py-2 file:text-light-text file:transition-colors hover:file:bg-dark-border"
      />
      {uploading && <p className="mt-2 text-xs text-medium-text">圧縮中...</p>}
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="rounded-md border border-dark-border bg-dark-card p-2">
              {/* biome-ignore lint/performance/noImgElement: base64 data URLs can't go through next/image */}
              <img
                src={image.dataUrl}
                alt={image.filename}
                className="mb-1 h-24 w-full rounded object-cover"
              />
              <p className="truncate text-xs text-medium-text" title={image.filename}>
                {image.filename}
              </p>
              <p className="text-xs text-medium-text">{Math.round(image.sizeBytes / 1024)}KB</p>
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                disabled={disabled}
                className="mt-1 text-xs text-danger-DEFAULT hover:underline disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
