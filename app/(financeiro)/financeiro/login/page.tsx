import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction, logoutFinanceAction } from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { getCurrentUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { CREST_PATH, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Entrar no financeiro", robots: { index: false, follow: false } };

export default async function FinanceLoginPage() {
  const user = await getCurrentUser();
  if (user && can(user.role, "finance:read")) redirect("/financeiro");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Image src={CREST_PATH} alt={`Escudo do ${SITE_NAME}`} width={448} height={505} priority className="mx-auto h-24 w-auto" />
          <h1 className="mt-4 text-xl uppercase">Financeiro</h1>
          <p className="mt-1 text-sm text-gray-600">{SITE_NAME}</p>
        </div>

        {user ? (
          // Sessão aberta com uma conta que não tem acesso ao financeiro: explica, em vez de redirecionar em círculo.
          <div className="space-y-4">
            <p className="alert alert-error" role="alert">
              A conta {user.email} não tem acesso ao financeiro. Peça a um superadministrador a função de tesoureiro, ou entre com outra conta.
            </p>
            <form action={logoutFinanceAction}>
              <button type="submit" className="btn btn-primary w-full">
                Sair e entrar com outra conta
              </button>
            </form>
            {can(user.role, "dashboard:view") ? (
              <Link href="/admin" className="btn btn-secondary w-full">
                Ir para o painel
              </Link>
            ) : null}
          </div>
        ) : (
          <ActionForm action={loginAction.bind(null, "finance")} submitLabel="Entrar" pendingLabel="Entrando…" submitClassName="btn btn-primary w-full" className="space-y-4">
            <Field name="email" label="E-mail">
              <input id="email" name="email" type="email" autoComplete="username" required className="input" />
            </Field>
            <Field name="password" label="Senha">
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
            </Field>
          </ActionForm>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="link">
            Voltar ao portal
          </Link>
        </p>
      </div>
    </main>
  );
}
