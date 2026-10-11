"use client";

import { useState, useMemo } from "react";
import { PersonCard } from "@/components/football/person-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ATHLETE_CATEGORIES, ATHLETE_CATEGORY_LABELS, type Position, type AthleteCategory, POSITION_LABELS } from "@/modules/squad/rules";

interface Athlete {
  id: string;
  name: string;
  nickname: string | null;
  position: Position;
  shirtNumber: number | null;
  photoPath: string | null;
}

interface Group {
  position: Position;
  label: string;
  athletes: Athlete[];
}

interface CategorizedGroup {
  category: AthleteCategory;
  label: string;
  groups: Group[];
}

interface FutebolContentProps {
  categorizedGroups: CategorizedGroup[];
  staff: { id: string; name: string; role: string }[];
}

export function FutebolContent({ categorizedGroups, staff }: FutebolContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<AthleteCategory | "all">("all");

  const availableCategories = useMemo(() => {
    const cats = new Set<AthleteCategory>();
    categorizedGroups.forEach((g) => cats.add(g.category));
    return [...cats].sort((a, b) => ATHLETE_CATEGORIES.indexOf(a) - ATHLETE_CATEGORIES.indexOf(b));
  }, [categorizedGroups]);

  const filteredGroups = useMemo(() => {
    if (selectedCategory === "all") return categorizedGroups;
    return categorizedGroups.filter((g) => g.category === selectedCategory);
  }, [categorizedGroups, selectedCategory]);

  const totalPlayers = useMemo(() =>
    filteredGroups.reduce((sum, g) => sum + g.groups.reduce((s, gg) => s + gg.athletes.length, 0), 0),
    [filteredGroups]
  );

  return (
    <div className="container-page space-y-12 py-10">
      <div className="mb-8">
        <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 mb-2">
          Filtrar por categoria
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as AthleteCategory | "all")}
          className="input w-full sm:w-64"
        >
          <option value="all">Todas as categorias</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {ATHLETE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500" aria-live="polite">
          {filteredGroups.length === 1
            ? `Exibindo ${filteredGroups[0]?.label} (${filteredGroups[0]?.groups.reduce((sum, g) => sum + g.athletes.length, 0)} jogador${filteredGroups[0]?.groups.reduce((sum, g) => sum + g.athletes.length, 0) !== 1 ? "es" : ""})`
            : `Exibindo ${filteredGroups.length} categor${filteredGroups.length === 1 ? "ia" : "ias"} com ${totalPlayers} jogador${totalPlayers !== 1 ? "es" : ""} no total`}
        </p>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState title="Nenhum jogador encontrado" description="Nenhum jogador cadastrado nesta categoria." />
      ) : (
        filteredGroups.map(({ category, label, groups }) => (
          <section key={category} aria-labelledby={`categoria-${category}`}>
            <h2 id={`categoria-${category}`} className="section-title mb-5">
              {label}
            </h2>
            {groups.map((group) => (
              <div key={group.position}>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{group.label}</h3>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.athletes.map((athlete) => (
                    <li key={athlete.id}>
                      <PersonCard
                        name={athlete.nickname?.trim() || athlete.name}
                        caption={POSITION_LABELS[athlete.position]}
                        photoPath={athlete.photoPath}
                        number={athlete.shirtNumber}
                        href={`/futebol/jogador/${athlete.id}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {/* Exibe a comissão técnica após os Atacantes (FORWARD) de cada categoria */}
            {staff.length > 0 && groups.some((g) => g.position === "FORWARD") ? (
              <section aria-labelledby={`comissao-${category}`} className="mt-12">
                <h2 id={`comissao-${category}`} className="section-title mb-5">
                  Comissão técnica
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {staff.map((member) => (
                    <li key={member.id}>
                      <PersonCard name={member.name} caption={member.role} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </section>
        ))
      )}

      {/* Fallback: se nenhuma categoria tem Atacantes, mostra no final */ }
      {staff.length > 0 && filteredGroups.length > 0 && !filteredGroups.some((cat) => cat.groups.some((g) => g.position === "FORWARD")) ? (
        <section aria-labelledby="comissao-fim" className="mt-12">
          <h2 id="comissao-fim" className="section-title mb-5">
            Comissão técnica
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {staff.map((member) => (
              <li key={member.id}>
                <PersonCard name={member.name} caption={member.role} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}