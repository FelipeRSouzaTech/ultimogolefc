import { paragraphs } from "@/modules/site/settings";

/** Texto institucional em parágrafos. O conteúdo é tratado como texto puro. */
export function Prose({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-4 text-gray-600 ${className}`}>
      {paragraphs(text).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
