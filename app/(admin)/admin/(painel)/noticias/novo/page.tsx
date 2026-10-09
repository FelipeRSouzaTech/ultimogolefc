import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { listCategories } from "@/modules/news/service";
import { saveNewsAction } from "../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Nova notícia" };

export default async function NewNewsPage() {
  const user = await requirePagePermission("news:write");
  const categories = await listCategories();
  return (
    <>
      <AdminHeading title="Nova notícia">
        <Link href="/admin/noticias" className="btn btn-secondary btn-sm">
          Voltar
        </Link>
      </AdminHeading>
      <Panel className="max-w-3xl">
        <NewsForm action={saveNewsAction.bind(null, null)} categories={categories} canPublish={can(user.role, "news:publish")} defaultAuthor={user.name} />
      </Panel>
    </>
  );
}
