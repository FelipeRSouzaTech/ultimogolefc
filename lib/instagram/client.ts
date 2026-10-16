import "server-only";

import { describeGraphError, type GraphErrorInfo, type InstagramFormat } from "@/modules/instagram/rules";

/**
 * Cliente mínimo da API de publicação do Instagram (Graph API).
 *
 * A conta vem das variáveis de ambiente, nunca do banco nem do código: para trocar a conta de teste pela
 * conta do clube basta trocar INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_ACCOUNT_LABEL.
 * O token é enviado no corpo da requisição (não na URL), para não aparecer em logs de acesso.
 */

export type InstagramConfig = {
  host: string;
  version: string;
  userId: string;
  accessToken: string;
  accountLabel: string;
};

/** Configuração lida das variáveis de ambiente; null quando a integração não está configurada. */
export function instagramConfig(env: NodeJS.ProcessEnv = process.env): InstagramConfig | null {
  const userId = env.INSTAGRAM_USER_ID?.trim();
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!userId || !accessToken) return null;
  const host = (env.INSTAGRAM_API_HOST?.trim() || "graph.instagram.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (host !== "graph.instagram.com" && host !== "graph.facebook.com") return null;
  return {
    host,
    version: env.INSTAGRAM_API_VERSION?.trim() || "v25.0",
    userId,
    accessToken,
    accountLabel: env.INSTAGRAM_ACCOUNT_LABEL?.trim() || `conta ${userId}`,
  };
}

export class InstagramApiError extends Error {
  readonly retryable: boolean;
  constructor(info: GraphErrorInfo) {
    super(info.message);
    this.name = "InstagramApiError";
    this.retryable = info.retryable;
  }
}

type Fetch = typeof fetch;

type GraphError = { code?: number; error_subcode?: number; message?: string };

async function call<T>(
  config: InstagramConfig,
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
  fetchImpl: Fetch,
): Promise<T> {
  const url = new URL(`https://${config.host}/${config.version}/${path}`);
  let response: Response;
  try {
    if (method === "GET") {
      // Leituras: o token vai no cabeçalho Authorization.
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      response = await fetchImpl(url, { headers: { Authorization: `Bearer ${config.accessToken}` }, signal: AbortSignal.timeout(20_000) });
    } else {
      const body = new URLSearchParams({ ...params, access_token: config.accessToken });
      response = await fetchImpl(url, { method: "POST", body, signal: AbortSignal.timeout(30_000) });
    }
  } catch {
    throw new InstagramApiError({ message: "Não foi possível falar com o Instagram (rede ou tempo esgotado). A publicação será tentada de novo.", retryable: true });
  }
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok || (json && typeof json === "object" && "error" in json)) {
    const error = json && typeof json === "object" && "error" in json ? ((json as { error: GraphError }).error ?? null) : null;
    if (!error && response.status >= 500) {
      throw new InstagramApiError({ message: `O Instagram respondeu com erro ${response.status}. A publicação será tentada de novo.`, retryable: true });
    }
    throw new InstagramApiError(describeGraphError(error));
  }
  return json as T;
}

export type ContainerStatus = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

export function createInstagramClient(config: InstagramConfig, fetchImpl: Fetch = fetch) {
  return {
    config,

    /** Cria o contêiner de mídia (passo 1). Devolve o id do contêiner. */
    async createContainer(input: { format: InstagramFormat; imageUrl: string; caption: string | null }): Promise<string> {
      const params: Record<string, string> = { image_url: input.imageUrl };
      if (input.format === "STORY") params.media_type = "STORIES";
      else if (input.caption) params.caption = input.caption;
      const result = await call<{ id: string }>(config, "POST", `${config.userId}/media`, params, fetchImpl);
      return result.id;
    },

    async containerStatus(containerId: string): Promise<ContainerStatus> {
      const result = await call<{ status_code?: ContainerStatus }>(config, "GET", containerId, { fields: "status_code" }, fetchImpl);
      return result.status_code ?? "IN_PROGRESS";
    },

    /** Publica o contêiner (passo 2). Devolve o id da mídia publicada. */
    async publish(containerId: string): Promise<string> {
      const result = await call<{ id: string }>(config, "POST", `${config.userId}/media_publish`, { creation_id: containerId }, fetchImpl);
      return result.id;
    },

    /** Link público da publicação (stories também têm, mas expiram em 24 h). */
    async permalink(mediaId: string): Promise<string | null> {
      try {
        const result = await call<{ permalink?: string }>(config, "GET", mediaId, { fields: "permalink" }, fetchImpl);
        return result.permalink ?? null;
      } catch {
        return null;
      }
    },
  };
}

export type InstagramClient = ReturnType<typeof createInstagramClient>;
