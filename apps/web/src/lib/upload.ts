import { API_URL } from './caller';

export type UploadData = string | Blob | ArrayBuffer | File;

export class FileUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

const MAX_BYTES = 1_400_000;

/** Downscale / re-encode large raster images so they fit the API's upload limit. */
async function shrinkImage(blob: Blob): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(blob.type) || blob.size <= MAX_BYTES) return blob;
  const bitmap = await createImageBitmap(blob);
  let scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
    if (out && out.size <= MAX_BYTES) return out;
    scale *= 0.75;
  }
  return blob;
}

/** Uploads a file to the API and returns its public URL. */
export async function uploadFile({ data, filename }: { data: UploadData; filename: string }): Promise<{ fileUrl: string }> {
  let blob: Blob = data instanceof Blob ? data : data instanceof ArrayBuffer ? new Blob([data]) : new Blob([data]);
  blob = await shrinkImage(blob);
  if (blob.size > 1_500_000) throw new FileUploadError('File is too large (max 1.5 MB). Please choose a smaller file.');

  const body = new FormData();
  body.append('file', blob, filename);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/upload`, { method: 'POST', body });
  } catch {
    throw new FileUploadError('Network error: could not reach the server');
  }
  if (!res.ok) {
    let message = 'Upload failed';
    try { message = ((await res.json()) as { message?: string }).message ?? message; } catch { /* ignore */ }
    throw new FileUploadError(message);
  }
  return (await res.json()) as { fileUrl: string };
}
