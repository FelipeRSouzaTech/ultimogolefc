import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Configuração padrão de rate limiting para APIs públicas. */
export const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 60, // 60 requisições por minuto por IP
};

/** Configuração mais restrita para endpoints de busca. */
export const SEARCH_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 20, // 20 buscas por minuto por IP
};

/** Chave de armazenamento no banco: "ratelimit:<rota>:<ip>" */
function buildKey(route: string, ip: string): string {
  return `ratelimit:${route}:${ip}`;
}

/**
 * Verifica se o IP excedeu o limite para a rota.
 * Usa contagem em janela deslizante no banco (LoginAttempt como tabela genérica).
 * Retorna { allowed: boolean, remaining: number, resetAt: Date }.
 */
export async function checkRateLimit(
  route: string,
  ip: string,
  config: { windowMs: number; maxRequests: number } = DEFAULT_RATE_LIMIT,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = buildKey(route, ip);
  const windowStart = new Date(Date.now() - config.windowMs);
  const windowEnd = new Date(Date.now() + config.windowMs);

  // Usa LoginAttempt como tabela genérica de rate limit (email = key, ipAddress = route)
  const count = await prisma.loginAttempt.count({
    where: {
      email: key,
      ipAddress: route,
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, config.maxRequests - count);
  const allowed = count < config.maxRequests;

  if (allowed) {
    // Registra a tentativa
    await prisma.loginAttempt.create({
      data: { email: key, ipAddress: route, success: true },
    });
  }

  return { allowed, remaining, resetAt: windowEnd };
}

/**
 * Middleware helper para Next.js API Routes.
 * Uso:
 *   export async function GET(request: NextRequest) {
 *     const rateLimit = await withRateLimit(request, "api/matches");
 *     if (!rateLimit.allowed) return rateLimit.response;
 *     // ... resto do handler
 *   }
 */
export async function withRateLimit(
  request: Request,
  route: string,
  config: { windowMs: number; maxRequests: number } = DEFAULT_RATE_LIMIT,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; response?: Response }> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const result = await checkRateLimit(route, ip, config);

  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(config.windowMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
        },
      },
    );
    return { ...result, response };
  }

  return {
    ...result,
    response: undefined,
  };
}

/** Headers de rate limit para adicionar na resposta de sucesso. */
export function rateLimitHeaders(result: { allowed: boolean; remaining: number; resetAt: Date; maxRequests?: number }): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.maxRequests ?? DEFAULT_RATE_LIMIT.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}