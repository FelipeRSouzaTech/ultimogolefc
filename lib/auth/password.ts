import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Parâmetros scrypt (equivalente recomendado pela OWASP: N=2^16, r=8, p=2).
// Ficam gravados junto do hash para permitir aumentar o custo no futuro sem invalidar senhas antigas.
const N = 65_536;
const R = 8;
const P = 2;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export { MIN_PASSWORD_LENGTH } from "./password-policy";

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number): Promise<Buffer> {
  const options: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![n, r, p].every((value) => Number.isInteger(value) && value > 0)) return false;
  const salt = Buffer.from(parts[4] ?? "", "base64");
  const expected = Buffer.from(parts[5] ?? "", "base64");
  if (salt.length === 0 || expected.length === 0) return false;
  try {
    const actual = await derive(password, salt, n, r, p, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
