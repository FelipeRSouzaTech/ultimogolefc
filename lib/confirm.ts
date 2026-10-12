// Textos do modal de confirmação e do aviso de sucesso, derivados do rótulo do botão. Módulo puro.

export type ConfirmTexts = { title: string; success: string };

/**
 * "Excluir…" e "Remover…" viram confirmação de exclusão/remoção, com aviso de sucesso correspondente;
 * qualquer outro rótulo (ex.: "Revogar sessões") usa o próprio rótulo como título.
 */
export function confirmTexts(label: string): ConfirmTexts {
  const text = label.trim();
  const lower = text.toLocaleLowerCase("pt-BR");
  if (lower.startsWith("excluir")) return { title: "Confirmar exclusão", success: "Excluído com sucesso." };
  if (lower.startsWith("remover")) return { title: "Confirmar remoção", success: "Removido com sucesso." };
  return { title: text === "" ? "Confirmar" : `${text}?`, success: "Operação concluída." };
}
