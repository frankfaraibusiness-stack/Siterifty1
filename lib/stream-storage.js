import "server-only";
import { Readable } from "node:stream";

// Streams a Firebase Storage file with HTTP Range support so browsers can
// seek and iOS Safari will play it.
export async function streamStorageFile(request, file, cacheControl) {
  let meta;
  try {
    [meta] = await file.getMetadata();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const size = Number(meta.size);
  const type = meta.contentType || "video/mp4";

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  let start = 0;
  let end = size - 1;
  if (range) {
    if (range[1] === "" && range[2] !== "") {
      start = Math.max(0, size - Number(range[2]));
    } else {
      start = Number(range[1] || 0);
      if (range[2] !== "") end = Math.min(end, Number(range[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }

  const stream = Readable.toWeb(file.createReadStream({ start, end }));
  return new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      ...(range && { "Content-Range": `bytes ${start}-${end}/${size}` }),
      "Cache-Control": cacheControl,
    },
  });
}
