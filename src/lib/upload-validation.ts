const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function assertImageUpload(file: File): Promise<"jpg" | "png" | "webp"> {
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Envie uma imagem de até 5 MB.");
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isJpeg && file.type === "image/jpeg") return "jpg";
  if (isPng && file.type === "image/png") return "png";
  if (isWebp && file.type === "image/webp") return "webp";
  throw new Error("Envie uma imagem JPG, PNG ou WEBP válida de até 5 MB.");
}
