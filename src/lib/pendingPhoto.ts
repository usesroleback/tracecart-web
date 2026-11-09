/** A photo chosen on one page and carried, within this tab, to the AI search (a File can't go in a URL). */
let pending: File | null = null;

export function setPendingPhoto(file: File) {
  pending = file;
}

/** The photo waiting, once: reading it clears it. */
export function takePendingPhoto(): File | null {
  const file = pending;
  pending = null;
  return file;
}

export const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
