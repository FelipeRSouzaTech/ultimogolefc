import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-2 text-3xl uppercase">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-gray-600">O endereço acessado não existe ou foi removido.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Voltar ao início
      </Link>
    </main>
  );
}
