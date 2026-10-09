// Assinatura AWS Signature Version 4, usada para falar com armazenamentos compatíveis com S3
// sem depender do SDK da AWS. Módulo puro (só node:crypto), coberto por vetor de teste oficial.
import { createHash, createHmac } from "node:crypto";

export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

const hmac = (key: Uint8Array | string, data: string) => createHmac("sha256", key).update(data).digest();

/** Codificação exigida pela AWS: tudo, exceto letras, números e - _ . ~ (a barra é preservada em caminhos). */
function encodeRfc3986(value: string, keepSlash: boolean): string {
  const encoded = encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? encoded.replace(/%2F/g, "/") : encoded;
}

export function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export type SignInput = {
  method: string;
  url: URL;
  /** Cabeçalhos que serão enviados e assinados. `host`, `x-amz-date` e `x-amz-content-sha256` são acrescentados. */
  headers: Record<string, string>;
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  date: Date;
};

/** Devolve os cabeçalhos finais da requisição, incluindo Authorization. */
export function signRequest(input: SignInput): Record<string, string> {
  const service = input.service ?? "s3";
  const timestamp = amzDate(input.date);
  const day = timestamp.slice(0, 8);

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers)) headers[name.toLowerCase()] = value.trim().replace(/\s+/g, " ");
  headers.host = input.url.host;
  headers["x-amz-date"] = timestamp;
  headers["x-amz-content-sha256"] = input.payloadHash;

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalPath = encodeRfc3986(decodeURIComponent(input.url.pathname), true) || "/";
  const canonicalQuery = [...input.url.searchParams.entries()]
    .map(([name, value]) => [encodeRfc3986(name, false), encodeRfc3986(value, false)] as const)
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");

  const canonicalRequest = [input.method.toUpperCase(), canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, input.payloadHash].join("\n");
  const scope = `${day}/${input.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), service), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`,
  };
}
