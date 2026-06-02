const LOGO_MAX_PX = 512;

/**
 * Redimensionne le logo côté navigateur (lissage haute qualité) avant envoi au serveur.
 * Garantit un fichier adapté à l’affichage UI et PDF, sans pixellisation excessive.
 */
export async function prepareLogoUpload(file) {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  if (typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const maxSide = Math.max(bitmap.width, bitmap.height);
  if (maxSide <= LOGO_MAX_PX) {
    bitmap.close();
    return file;
  }

  const scale = LOGO_MAX_PX / maxSide;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png", 1);
  });

  if (!blob) return file;

  const baseName = (file.name || "logo").replace(/\.[^.]+$/, "") || "logo";
  return new File([blob], `${baseName}.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
