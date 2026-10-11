"use client";

import { useState, useMemo } from "react";
import { ATHLETE_CATEGORIES, ATHLETE_CATEGORY_LABELS, type AthleteCategory } from "@/modules/squad/rules";

interface CategoryFilterProps {
  categorizedGroups: {
    category: AthleteCategory;
    label: string;
    groups: { position: string; label: string; athletes: { id: string }[] }[];
  }[];
}

export function CategoryFilter({ categorizedGroups }: CategoryFilterProps) {
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

  return (
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
          : `Exibindo ${filteredGroups.length} categor${filteredGroups.length === 1 ? "ia" : "ias"} com ${filteredGroups.reduce((sum, g) => sum + g.groups.reduce((s, gg) => s + gg.athletes.length, 0), 0)} jogador${filteredGroups.reduce((sum, g) => sum + g.groups.reduce((s, gg) => s + gg.athletes.length, 0), 0) !== 1 ? "es" : ""} no total`}
      </p>
      {filteredGroups.map(({ category, label, groups }) => (
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
                    {/* PersonCard será renderizado pelo componente pai passando os dados filtrados */}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}