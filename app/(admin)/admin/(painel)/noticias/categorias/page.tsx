import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createCategoryAction, deleteCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categorias de notícias" };

export default async function CategoriesPage() {
  const user = await requirePagePermission("news:read");
  const categories = await prisma.newsCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { articles: true } } } });

  return (
    <>
      <AdminHeading title="Categorias de notícias">
        <Link href="/admin/noticias" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
      </AdminHeading>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Categorias cadastradas">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma categoria cadastrada.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="font-semibold">{category.name}</span>
                    <span className="text-sm text-gray-600"> · {category._count.articles} notícia(s)</span>
                  </span>
                  {can(user.role, "news:delete") ? (
                    <ConfirmButton
                      action={deleteCategoryAction.bind(null, category.id)}
                      label="Excluir"
                      confirmMessage={`Excluir a categoria "${category.name}"? As notícias dela ficarão sem categoria.`}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {can(user.role, "news:write") ? (
          <Panel title="Nova categoria">
            <ActionForm action={createCategoryAction} submitLabel="Criar categoria" resetOnSuccess>
              <Field name="name" label="Nome">
                <input id="name" name="name" className="input" required maxLength={60} />
              </Field>
            </ActionForm>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
