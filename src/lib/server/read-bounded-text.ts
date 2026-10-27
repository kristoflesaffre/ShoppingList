export async function readBoundedText(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      length += chunk.value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new Error("body-too-large"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}
