import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/modules/site/service";
import { SETTING_GROUPS } from "@/modules/site/settings";
import { STAFF_GROUPS, STAFF_GROUP_LABELS, type StaffGroup } from "@/modules/squad/rules";
import { deleteStaffAction, saveSettingsAction, saveStaffAction } from "./actions";

export const metadata: Metadata = { title: "Institucional" };

export default async function InstitutionalAdminPage() {
  const user = await requirePagePermission("content:read");
  const [settings, staff] = await Promise.all([getSettings(), prisma.staffMember.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }] })]);
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
                {group.settings.map((def) => (
                  <Field key={def.key} name={def.key} label={def.label} hint={def.hint}>
                    {def.kind === "longtext" ? (
                      <textarea id={def.key} name={def.key} className="input" rows={6} defaultValue={settings[def.key]} maxLength={def.max} />
                    ) : (
                      <input id={def.key} name={def.key} className="input" defaultValue={settings[def.key]} maxLength={def.max} />
                    )}
                  </Field>
                ))}
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

        <Panel title="Diretoria e comissão técnica" className="xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              {staff.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhuma pessoa cadastrada.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {staff.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <span className="font-semibold">{member.name}</span>
                        <span className="block text-xs text-gray-600">
                          {member.role} · {STAFF_GROUP_LABELS[member.group as StaffGroup]} · ordem {member.sortOrder}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`badge ${member.isPublished ? "badge-solid" : ""}`}>{member.isPublished ? "No portal" : "Oculto"}</span>
                        {canWrite ? <ConfirmButton action={deleteStaffAction.bind(null, member.id)} label="Remover" confirmMessage={`Remover "${member.name}"?`} /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canWrite ? (
              <ActionForm action={saveStaffAction.bind(null, null)} submitLabel="Adicionar pessoa" className="space-y-4">
                <Field name="name" label="Nome">
                  <input id="name" name="name" className="input" required maxLength={120} />
                </Field>
                <Field name="role" label="Cargo">
                  <input id="role" name="role" className="input" required maxLength={80} placeholder="Ex.: Presidente, Técnico" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="group" label="Grupo">
                    <select id="group" name="group" className="input" defaultValue="BOARD">
                      {STAFF_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {STAFF_GROUP_LABELS[group]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="sortOrder" label="Ordem" hint="Menor número aparece primeiro.">
                    <input id="sortOrder" name="sortOrder" type="number" min={0} max={9999} className="input" defaultValue={0} />
                  </Field>
                </div>
                <label className="flex items-start gap-2 text-sm font-semibold">
                  <input type="checkbox" name="isPublished" className="mt-0.5 size-4 accent-primary" />
                  <span>
                    Divulgação autorizada
                    <span className="block font-normal text-gray-600">Marque somente se a pessoa autorizou a publicação do nome no portal.</span>
                  </span>
                </label>
              </ActionForm>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
