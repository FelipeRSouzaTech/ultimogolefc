import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { instagramConfig } from "@/lib/instagram/client";
import { AccountNotice } from "../account-notice";
import { saveInstagramPostAction } from "../actions";
import { InstagramPostForm } from "../post-form";

export const metadata: Metadata = { title: "Nova publicação no Instagram" };

export default async function NewInstagramPostPage() {
  await requirePagePermission("instagram:publish");
  const config = instagramConfig();
  return (
    <>
      <AdminHeading title="Nova publicação" description="Feed ou story no Instagram do clube.">
        <Link href="/admin/instagram" className="btn btn-secondary btn-sm">
          Voltar à agenda
        </Link>
      </AdminHeading>
      <AccountNotice config={config} />
      <Panel>
        <InstagramPostForm action={saveInstagramPostAction.bind(null, null)} configured={config !== null} accountLabel={config?.accountLabel ?? "ultimogolefc"} />
      </Panel>
    </>
  );
}
