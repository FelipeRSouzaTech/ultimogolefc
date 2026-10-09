import Image, { type ImageProps } from "next/image";
import { isUploadedPath } from "@/modules/media/rules";

/**
 * Imagem cujo caminho vem do banco. Arquivos enviados pelo painel (/midia/…) são entregues como estão,
 * sem passar pelo otimizador do Next.js; arquivos estáticos do projeto continuam otimizados.
 */
export function SmartImage(props: Omit<ImageProps, "src"> & { src: string }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- o alt é obrigatório em ImageProps e vem de quem usa o componente.
  return <Image {...props} unoptimized={isUploadedPath(props.src)} />;
}
