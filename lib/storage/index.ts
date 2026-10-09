import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidKey } from "@/modules/media/rules";
import { sha256Hex, signRequest } from "./sigv4";

/** Conteúdo de arquivo em memória. */
export type Bytes = Uint8Array<ArrayBuffer>;

export type Storage = {
  driver: "local" | "s3";
  put(key: string, bytes: Bytes, mimeType: string): Promise<void>;
  remove(key: string): Promise<void>;
};

function assertKey(key: string): void {
  if (!isValidKey(key)) throw new Error("Chave de armazenamento inválida.");
}

// --- Driver local: pasta no servidor (desenvolvimento ou hospedagem simples) ---

export function localDir(): string {
  return path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage/uploads");
}

function localPath(key: string): string {
  assertKey(key);
  return path.join(localDir(), ...key.split("/"));
}

const diskStorage: Storage = {
  driver: "local",
  async put(key, bytes) {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  },
  async remove(key) {
    await rm(localPath(key), { force: true });
  },
};

/** Lê um arquivo do driver local. Devolve null se não existir. */
export async function readLocal(key: string): Promise<Buffer | null> {
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

// --- Driver S3: qualquer serviço compatível (AWS S3, Cloudflare R2, MinIO) ---

function s3Config() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Armazenamento S3 não configurado: defina S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY.");
  }
  return {
    endpoint: S3_ENDPOINT.replace(/\/$/, ""),
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION ?? "auto",
  };
}

async function s3Request(method: "PUT" | "DELETE", key: string, bytes?: Bytes, mimeType?: string): Promise<void> {
  assertKey(key);
  const config = s3Config();
  const url = new URL(`${config.endpoint}/${config.bucket}/${key}`);
  const headers = signRequest({
    method,
    url,
    headers: mimeType ? { "content-type": mimeType } : {},
    payloadHash: sha256Hex(bytes ?? ""),
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    date: new Date(),
  });
  const response = await fetch(url, { method, headers, body: bytes });
  if (!response.ok && !(method === "DELETE" && response.status === 404)) {
    throw new Error(`Armazenamento S3 respondeu ${response.status} em ${method}.`);
  }
}

const s3Storage: Storage = {
  driver: "s3",
  put: (key, bytes, mimeType) => s3Request("PUT", key, bytes, mimeType),
  remove: (key) => s3Request("DELETE", key),
};

export function getStorage(): Storage {
  return process.env.STORAGE_DRIVER === "s3" ? s3Storage : diskStorage;
}

/** Endereço público de leitura no S3 (bucket público ou CDN). Null quando o driver é local. */
export function s3PublicUrl(key: string): string | null {
  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  return process.env.STORAGE_DRIVER === "s3" && base ? `${base}/${key}` : null;
}
