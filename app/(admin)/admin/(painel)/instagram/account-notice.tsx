import type { InstagramConfig } from "@/lib/instagram/client";

/** Mostra em qual conta as publicações vão sair, ou avisa que a integração não está configurada. */
export function AccountNotice({ config }: { config: InstagramConfig | null }) {
  if (!config) {
    return (
      <p className="alert alert-info mb-6">
        <strong>Instagram não configurado neste ambiente.</strong> Dá para criar rascunhos e agendar, mas nada é publicado até definir
        INSTAGRAM_USER_ID e INSTAGRAM_ACCESS_TOKEN no servidor (passo a passo em docs/INSTAGRAM.md).
      </p>
    );
  }
  return (
    <p className="alert alert-info mb-6">
      Publicando em <strong>{config.accountLabel}</strong>. Para trocar de conta (por exemplo, da conta de teste para a do clube), altere as
      variáveis INSTAGRAM_* no servidor.
    </p>
  );
}
