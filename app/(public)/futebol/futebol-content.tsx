"use client";

import { useState, useMemo } from "react";
import { PersonCard } from "@/components/football/person-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ATHLETE_CATEGORIES, ATHLETE_CATEGORY_LABELS, type Position, type AthleteCategory, POSITION_LABELS, staffForCategory, staffOutsideCategories } from "@/modules/squad/rules";

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

interface StaffMember {
  id: string;
  name: string;
  role: string;
  /** Categorias em que a pessoa atua; vazio = sem categoria definida. */
  categories: AthleteCategory[];
}

interface FutebolContentProps {
  categorizedGroups: CategorizedGroup[];
  staff: StaffMember[];
}

/** Grade de cartões da comissão técnica, no mesmo formato da grade de jogadores. */
function StaffGrid({ members }: { members: StaffMember[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {members.map((member) => (
        <li key={member.id}>
          <PersonCard name={member.name} caption={member.role} />
        </li>
      ))}
    </ul>
  );
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

  // Quem não atua em nenhuma categoria com jogadores publicados vai para um bloco no fim, para ninguém sumir.
  // Com o filtro em uma categoria específica, o bloco não aparece: ele não pertence àquela categoria.
  const staffAtEnd = useMemo(
    () =>
      selectedCategory === "all"
        ? staffOutsideCategories(
            staff,
            categorizedGroups.map((group) => group.category),
          )
        : [],
    [staff, categorizedGroups, selectedCategory],
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
        filteredGroups.map(({ category, label, groups }) => {
          const categoryStaff = staffForCategory(staff, category);
          return (
          <section key={category} aria-labelledby={`categoria-${category}`}>
            <h2 id={`categoria-${category}`} className="section-title mb-5">
              {label}
            </h2>
            {/* Um respiro entre os grupos: cada posição começa uma linha abaixo dos cartões da anterior. */}
            <div className="space-y-10">
            {groups.map((group) => (
              <div key={group.position}>
                <h3 className="mb-4 text-xl font-semibold text-gray-700">{group.label}</h3>
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
            {/* Comissão técnica da categoria: último grupo, logo abaixo de Atacantes, com o mesmo estilo de título. */}
            {categoryStaff.length > 0 ? (
              <div>
                <h3 className="mb-4 text-xl font-semibold text-gray-700">Comissão técnica</h3>
                <StaffGrid members={categoryStaff} />
              </div>
            ) : null}
            </div>
          </section>
          );
        })
      )}

      {/* Comissão sem categoria exibida (ou sem jogadores publicados na página): bloco próprio no fim. */}
      {staffAtEnd.length > 0 ? (
        <section aria-labelledby="comissao-tecnica">
          <h2 id="comissao-tecnica" className="section-title mb-5">
            Comissão técnica
          </h2>
          <StaffGrid members={staffAtEnd} />
        </section>
      ) : null}
    </div>
  );
}