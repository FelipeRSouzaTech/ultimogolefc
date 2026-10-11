import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { Field } from "@/components/ui/field";
import { ImageField } from "@/components/ui/image-field";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getSettings } from "@/modules/site/service";
import { SETTING_GROUPS } from "@/modules/site/settings";
import { saveSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Institucional" };

export default async function InstitutionalAdminPage() {
  const user = await requirePagePermission("content:read");
  const settings = await getSettings();
  const canWrite = can(user.role, "content:write");

  return (
    <>
      <AdminHeading title="Institucional" description="Textos e dados do clube exibidos no portal. Campos em branco não aparecem." />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-6 xl:grid-cols-2">
        {SETTING_GROUPS.map((group) => (
          <Panel key={group.id} title={group.title}>
            <p className="-mt-2 mb-4 text-sm text-gray-600">{group.description}</p>
            {canWrite ? (
              <ActionForm action={saveSettingsAction.bind(null, group.id)} submitLabel="Salvar" className="space-y-4">
                {group.settings.map((def) =>
                  def.kind === "imagePath" ? (
                    <ImageField key={def.key} name={def.key} label={def.label} defaultValue={settings[def.key]} hint={def.hint} />
                  ) : (
                  <Field key={def.key} name={def.key} label={def.label} hint={def.hint}>
                    {def.kind === "longtext" ? (
                      <textarea id={def.key} name={def.key} className="input" rows={6} defaultValue={settings[def.key]} maxLength={def.max} />
                    ) : (
                      <input id={def.key} name={def.key} className="input" defaultValue={settings[def.key]} maxLength={def.max} />
                    )}
                  </Field>
                  ),
                )}
              </ActionForm>
            ) : (
              <dl className="space-y-3 text-sm">
                {group.settings.map((def) => (
                  <div key={def.key}>
                    <dt className="font-semibold">{def.label}</dt>
                    <dd className="whitespace-pre-line text-gray-600">{settings[def.key] || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
