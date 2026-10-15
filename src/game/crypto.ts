import { SEALED_ENDING } from "./sealed";

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9|]/g, "");
const enc = (s: string) => new TextEncoder().encode(s);
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function checkAnswer(input: string, hash: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc("lantern-salt:" + norm(input)))) === hash;
}

export interface Ending {
  reveal: string[];
  choices: Record<string, string>;
  romance: string;
}

export async function unsealEnding(solution: string): Promise<Ending> {
  const kb = await crypto.subtle.digest("SHA-256", enc("lantern-key:" + norm(solution)));
  const key = await crypto.subtle.importKey("raw", kb, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(SEALED_ENDING.iv) }, key, unb64(SEALED_ENDING.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
