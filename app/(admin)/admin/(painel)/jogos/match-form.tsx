"use client";

import { useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import type { FormAction } from "@/lib/action";
import { MATCH_STATUSES, MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";

export type SeasonOption = { id: string; label: string; clubs: { id: string; name: string }[] };

export type MatchFormValues = {
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffLocal: string;
  venue: string;
  round: string;
  status: MatchStatus;
  homeScore: string;
  awayScore: string;
  notes: string;
};

type Props = { action: FormAction; seasons: SeasonOption[]; values?: MatchFormValues };

export function MatchForm({ action, seasons, values }: Props) {
  const [seasonId, setSeasonId] = useState(values?.seasonId ?? seasons[0]?.id ?? "");
  const [status, setStatus] = useState<MatchStatus>(values?.status ?? "SCHEDULED");
  const clubs = seasons.find((season) => season.id === seasonId)?.clubs ?? [];
  const allowsScore = status === "FINISHED" || status === "LIVE";

  return (
    <ActionForm action={action} submitLabel="Salvar partida" className="space-y-5">
      <div>
        <label className="label" htmlFor="seasonId">
          Competição e temporada
        </label>
        <select id="seasonId" name="seasonId" className="input" value={seasonId} onChange={(event) => setSeasonId(event.target.value)} required>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
        <p className="hint">Só aparecem como opção os clubes participantes da temporada escolhida.</p>
        <FieldError name="seasonId" />
      </div>

      {/* A chave força a recriação dos campos ao trocar de temporada, limpando seleções que não valem mais. */}
      <div key={seasonId} className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="homeTeamId">
            Mandante
          </label>
          <select id="homeTeamId" name="homeTeamId" className="input" defaultValue={values && seasonId === values.seasonId ? values.homeTeamId : ""} required>
            <option value="">Selecione</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
          <FieldError name="homeTeamId" />
        </div>
        <div>
          <label className="label" htmlFor="awayTeamId">
            Visitante
          </label>
          <select id="awayTeamId" name="awayTeamId" className="input" defaultValue={values && seasonId === values.seasonId ? values.awayTeamId : ""} required>
            <option value="">Selecione</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
          <FieldError name="awayTeamId" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="kickoffAt">
            Data e horário
          </label>
          <input id="kickoffAt" name="kickoffAt" type="datetime-local" className="input" defaultValue={values?.kickoffLocal} required />
          <p className="hint">Horário de Brasília.</p>
          <FieldError name="kickoffAt" />
        </div>
        <div>
          <label className="label" htmlFor="venue">
            Local
          </label>
          <input id="venue" name="venue" className="input" defaultValue={values?.venue} maxLength={120} />
          <FieldError name="venue" />
        </div>
        <div>
          <label className="label" htmlFor="round">
            Rodada ou fase
          </label>
          <input id="round" name="round" className="input" defaultValue={values?.round} maxLength={40} placeholder="Ex.: 3ª rodada" />
          <FieldError name="round" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" value={status} onChange={(event) => setStatus(event.target.value as MatchStatus)}>
            {MATCH_STATUSES.map((item) => (
              <option key={item} value={item}>
                {MATCH_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
          <FieldError name="status" />
        </div>
      </div>

      <fieldset className="rounded-lg border border-gray-100 p-4">
        <legend className="px-2 text-sm font-bold uppercase tracking-wider text-gray-600">Placar</legend>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="homeScore">
              Gols do mandante
            </label>
            <input id="homeScore" name="homeScore" inputMode="numeric" pattern="[0-9]*" maxLength={2} className="input" defaultValue={values?.homeScore} disabled={!allowsScore} />
            <FieldError name="homeScore" />
          </div>
          <div>
            <label className="label" htmlFor="awayScore">
              Gols do visitante
            </label>
            <input id="awayScore" name="awayScore" inputMode="numeric" pattern="[0-9]*" maxLength={2} className="input" defaultValue={values?.awayScore} disabled={!allowsScore} />
            <FieldError name="awayScore" />
          </div>
        </div>
        <p className="hint">
          {allowsScore
            ? "Partidas encerradas exigem placar completo e passam a contar na classificação."
            : "O placar só é registrado em partidas em andamento ou encerradas. Partidas adiadas e canceladas não geram pontos."}
        </p>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Informações adicionais
        </label>
        <textarea id="notes" name="notes" className="input" rows={4} defaultValue={values?.notes} />
        <FieldError name="notes" />
      </div>
    </ActionForm>
  );
}
