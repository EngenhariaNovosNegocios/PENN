"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";

const outcomeOptions = {
  corrected: {
    label: "Corrigida",
    description: "A causa foi tratada e a operação pode seguir normalmente.",
  },
  workaround: {
    label: "Contornada",
    description: "Foi aplicada uma solução provisória com acompanhamento futuro.",
  },
  dismissed: {
    label: "Não procedente",
    description: "A análise confirmou que não existe impedimento a ser tratado.",
  },
};

function ResolutionIcon({ name }) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

function formatDate(value) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem prazo";
}

export default function IssueResolutionModal({
  issue,
  loading = false,
  onClose,
  onSubmit,
}) {
  const [outcome, setOutcome] = useState("corrected");
  const [resolution, setResolution] = useState("");
  const [prevention, setPrevention] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!issue) {
      return;
    }

    setOutcome("corrected");
    setResolution("");
    setPrevention("");
    setConfirmed(false);
  }, [issue]);

  const trimmedResolution = resolution.trim();
  const canSubmit = trimmedResolution.length >= 10 && confirmed && !loading;
  const progress = Math.min(100, (trimmedResolution.length / 10) * 100);
  const outcomeMeta = outcomeOptions[outcome];
  const isOverdue = useMemo(
    () => Boolean(issue?.due_date && new Date(`${issue.due_date}T23:59:59`) < new Date()),
    [issue]
  );

  function submitResolution(event) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const note = [
      `${outcomeMeta.label}: ${trimmedResolution}`,
      prevention.trim() ? `Ação preventiva: ${prevention.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    onSubmit?.(note);
  }

  return (
    <FormModal
      description="Registre a solução adotada. O conteúdo ficará disponível no histórico permanente do produto."
      eyebrow="Encerramento controlado"
      onClose={loading ? undefined : onClose}
      open={Boolean(issue)}
      size="large"
      title="Resolver pendência"
    >
      {issue && (
        <form className="issue-resolution-modal" onSubmit={submitResolution}>
          <section className="resolution-context">
            <span className="resolution-context-icon"><ResolutionIcon name="alert" /></span>
            <div>
              <span>{issue.product_code || "Produto"}</span>
              <strong>{issue.description}</strong>
              <small>
                {issue.assignee_name || "Sem responsável"} · {formatDate(issue.due_date)}
              </small>
            </div>
            <span className={isOverdue ? "resolution-due overdue" : "resolution-due"}>
              <ResolutionIcon name="calendar" />
              {isOverdue ? "Vencida" : "No prazo"}
            </span>
          </section>

          <fieldset className="resolution-outcomes">
            <legend>Resultado da análise</legend>
            {Object.entries(outcomeOptions).map(([value, option]) => (
              <label className={outcome === value ? "selected" : ""} key={value}>
                <input
                  checked={outcome === value}
                  name="resolution-outcome"
                  onChange={() => setOutcome(value)}
                  type="radio"
                  value={value}
                />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </fieldset>

          <label className="resolution-field">
            <span>O que foi feito para resolver?</span>
            <textarea
              autoFocus
              minLength="10"
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Descreva a análise, a decisão tomada e o resultado observado..."
              required
              rows="5"
              value={resolution}
            />
            <span className="resolution-progress">
              <i style={{ width: `${progress}%` }} />
              <small>{trimmedResolution.length}/10 caracteres mínimos</small>
            </span>
          </label>

          <label className="resolution-field optional">
            <span>Ação preventiva <small>Opcional</small></span>
            <textarea
              onChange={(event) => setPrevention(event.target.value)}
              placeholder="Registre uma ação que ajude a impedir que o problema volte a ocorrer."
              rows="3"
              value={prevention}
            />
          </label>

          <label className="resolution-confirmation">
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span><strong>Confirmo que a solução foi validada</strong><small>A pendência será encerrada e movida para o histórico.</small></span>
          </label>

          <footer className="modal-form-actions resolution-actions">
            <button disabled={loading} onClick={onClose} type="button">Cancelar</button>
            <button disabled={!canSubmit} type="submit">
              <ResolutionIcon name="check" />
              {loading ? "Registrando resolução..." : "Concluir pendência"}
            </button>
          </footer>
        </form>
      )}
    </FormModal>
  );
}
