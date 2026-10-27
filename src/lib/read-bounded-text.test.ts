import { expect, it } from "vitest";
import { readBoundedText } from "./server/read-bounded-text";
it("decodes UTF-8 split across chunks and handles an empty body", async () => {
  const bytes = new TextEncoder().encode("café");
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 4)); controller.enqueue(bytes.slice(4)); controller.close(); } });
  expect(await readBoundedText(body, 5)).toBe("café");
  expect(await readBoundedText(null, 5)).toBe("");
});
it("bounds bytes rather than trusting Content-Length or character count", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { cancelled = true; } });
  await expect(readBoundedText(body, 8)).rejects.toThrow("body-too-large");
  expect(cancelled).toBe(true);
});
