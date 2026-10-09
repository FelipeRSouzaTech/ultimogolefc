"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { neighborIndex } from "@/modules/gallery/rules";

export type GalleryPhoto = { id: string; src: string; alt: string; caption: string | null };

/**
 * Grade de fotos com visualização ampliada.
 * Usa o elemento <dialog> nativo: o foco fica preso na janela e Esc fecha. Setas do teclado navegam.
 */
export function Lightbox({ photos }: { photos: GalleryPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const photo = photos[index];

  const show = (position: number) => {
    setIndex(position);
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const move = useCallback((step: 1 | -1) => setIndex((current) => neighborIndex(current, photos.length, step)), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, move]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((item, position) => (
          <li key={item.id}>
            <button type="button" className="group block w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50" onClick={() => show(position)} aria-label={`Ampliar foto: ${item.alt}`}>
              <SmartImage src={item.src} alt={item.alt} width={480} height={360} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
            </button>
            {item.caption ? <p className="mt-1 text-xs text-gray-600">{item.caption}</p> : null}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label="Foto ampliada"
        className="m-auto max-h-[95vh] w-full max-w-5xl rounded-lg bg-white p-0 backdrop:bg-black/80"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        {open && photo ? (
          <div className="flex max-h-[95vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2">
              <p className="text-sm text-gray-600" aria-live="polite">
                Foto {index + 1} de {photos.length}
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={close}>
                <X aria-hidden="true" className="size-4" /> Fechar
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50">
              <SmartImage src={photo.src} alt={photo.alt} width={1600} height={1200} className="max-h-[70vh] w-auto max-w-full object-contain" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => move(-1)} disabled={photos.length < 2}>
                <ChevronLeft aria-hidden="true" className="size-4" /> Anterior
              </button>
              <p className="min-w-0 flex-1 text-center text-sm">{photo.caption ?? photo.alt}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => move(1)} disabled={photos.length < 2}>
                Próxima <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
