/** Bucket público para fotos dos itens do cardápio (Supabase Storage). */
export const MENU_ITEM_IMAGE_BUCKET = "bendita-menu-items";

/** Limite alinhado ao bucket (5 MB). */
export const MENU_ITEM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function menuItemImageExtension(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export function isAllowedMenuItemImage(file: File): boolean {
  if (!ALLOWED_MIME.has(file.type)) return false;
  if (file.size > MENU_ITEM_IMAGE_MAX_BYTES) return false;
  return true;
}
