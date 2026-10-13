// Exportação em CSV.

/**
 * Célula de CSV. Textos iniciados por = + - @ recebem um apóstrofo, para que o Excel
 * não os execute como fórmula (proteção contra "CSV injection").
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV com ponto e vírgula e BOM, o formato que o Excel em português abre corretamente. */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
