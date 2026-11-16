// Client-side helper: crops an image file to the given size (cover-fit,
// centered) and returns a compressed JPEG data URL. Keeps uploads tiny so
// they can live directly on the Firestore profile document.
export async function resizeImage(file, { width, height, quality = 0.82 }) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image."));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const scale = Math.max(width / img.width, height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
