import type { ReferenceImage } from "../contexts/DemandContext";
import { supabase } from "./supabase";

export const QC_REFERENCE_BUCKET = "qc-references";
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_REFERENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ReferenceFile = {
  name: string;
  size: number;
  type: string;
};

function safeSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildReferencePath(demandId: string, commentId: string, fileName: string) {
  return `${safeSegment(demandId)}/${safeSegment(commentId)}/${safeSegment(fileName)}`;
}

export function validateReferenceImage(file: ReferenceFile) {
  if (!SUPPORTED_REFERENCE_TYPES.has(file.type)) {
    return "Use imagens PNG, JPEG ou WebP.";
  }
  if (file.size > MAX_REFERENCE_BYTES) {
    return "Cada imagem deve ter no máximo 8 MB.";
  }
  return null;
}

export async function uploadReferenceImages(
  demandId: string,
  commentId: string,
  files: File[]
): Promise<ReferenceImage[]> {
  const uploaded: ReferenceImage[] = [];

  for (const [index, file] of files.entries()) {
    const validationError = validateReferenceImage(file);
    if (validationError) throw new Error(validationError);

    const path = buildReferencePath(demandId, commentId, `${index + 1}-${file.name}`);
    const { error } = await supabase.storage.from(QC_REFERENCE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;

    uploaded.push({
      id: `${commentId}-ref-${index + 1}`,
      mimeType: file.type,
      name: file.name,
      path
    });
  }

  return uploaded;
}

export async function createReferenceSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(QC_REFERENCE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function hydrateReferenceImages(images: ReferenceImage[]) {
  return Promise.all(
    images.map(async (image) => ({
      ...image,
      signedUrl: image.signedUrl || await createReferenceSignedUrl(image.path)
    }))
  );
}
