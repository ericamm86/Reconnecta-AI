import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, Globe2, Network, ShieldCheck, UserRound } from "lucide-react";

const steps = [
  ["auth", "Autenticação", "E-mail e senha verificados", CheckCircle2],
  ["profile", "Perfil", "Dados basicos do usuario", UserRound],
  ["privacy", "Privacidade", "Perfil publico desligado por padrao", ShieldCheck],
  ["ingestion", "Ingestão", "Google, CSV ou contato manual", FileUp],
  ["insights", "Insights", "Primeiro grafo e metricas", Network]
];

const stepOrder = steps.map(([key]) => key);
const onboardingSteps = stepOrder.slice(1);

export function OnboardingFlow({ profile, onUpdateProfile, contacts, onImport }) {
  const currentStep = onboardingSteps.includes(profile.onboardingStep) ? profile.onboardingStep : "profile";
  const currentIndex = stepOrder.indexOf(currentStep);
  const [draft, setDraft] = useState({
    displayName: profile.displayName || "",
    isPublic: Boolean(profile.isPublic)
  });

  useEffect(() => {
    setDraft({
      displayName: profile.displayName || "",
      isPublic: Boolean(profile.isPublic)
    });
  }, [profile.displayName, profile.isPublic]);

  const actionLabel = useMemo(() => {
    if (currentStep === "profile") return draft.displayName === profile.displayName ? "Avancar" : "Salvar e Avancar";
    if (currentStep === "privacy") return "Avancar";
    return "Avancar";
  }, [currentStep, draft.displayName, profile.displayName]);

  function advanceFromProfile() {
    onUpdateProfile({
      ...profile,
      displayName: draft.displayName.trim(),
      onboardingStep: "privacy"
    });
  }

  function advanceFromPrivacy() {
    onUpdateProfile({
      ...profile,
      isPublic: draft.isPublic,
      onboardingStep: "ingestion"
    });
  }

  function skipIngestion() {
    onUpdateProfile({
      ...profile,
      onboardingStep: "insights"
    });
  }

  return (
    <section id="onboarding" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="rounded-xl border border-line bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-mint">Onboarding</p>
            <h2 className="text-xl font-black text-white">Configuração inicial guiada</h2>
          </div>
          <span className="rounded-lg border border-line bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
            {contacts.length} contatos importados
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {steps.map(([key, label, description, Icon], index) => {
            const isActive = key === currentStep;
            const isComplete = index < currentIndex;

            return (
            <article
              key={key}
              className={`cursor-default select-none rounded-lg border p-4 transition ${
                isActive
                  ? "border-mint/50 bg-mint/10"
                  : isComplete
                    ? "border-cyan/30 bg-cyan/5"
                    : "border-line bg-black/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={isActive ? "text-mint" : "text-cyan"} size={19} />
                <span className="text-xs font-black text-slate-500">{isComplete ? "OK" : index + 1}</span>
              </div>
              <h3 className="mt-3 font-black text-white">{label}</h3>
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            </article>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_0.3fr]">
          <div className="grid gap-3">
            {currentStep === "profile" && (
              <label className="text-sm font-semibold text-slate-300">
                Nome publico
                <input
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-mint/50"
                />
              </label>
            )}

            {currentStep === "privacy" && (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/20 px-4 py-3 text-sm font-bold text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Globe2 size={17} className="text-mint" />
                  Perfil visivel na rede publica
                </span>
                <input
                  type="checkbox"
                  checked={draft.isPublic}
                  onChange={(event) => setDraft((current) => ({ ...current, isPublic: event.target.checked }))}
                  className="h-5 w-5 accent-mint"
                />
              </label>
            )}

            <div className="flex gap-3 rounded-lg border border-mint/25 bg-mint/10 px-4 py-3 text-sm font-semibold text-slate-200">
              <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={18} />
              <p>
                Seus contatos importados permanecem privados. Apenas seu perfil pode ser publicado quando voce ativar a rede publica.
              </p>
            </div>
          </div>

          <div className="grid content-start gap-2">
            {currentStep === "profile" && (
              <button onClick={advanceFromProfile} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-black text-ink hover:bg-cyan">
                {actionLabel}
                <ArrowRight size={17} />
              </button>
            )}

            {currentStep === "privacy" && (
              <button onClick={advanceFromPrivacy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-black text-ink hover:bg-cyan">
                {actionLabel}
                <ArrowRight size={17} />
              </button>
            )}

            {currentStep === "ingestion" && (
              <>
                <button onClick={onImport} className="h-11 rounded-lg bg-mint px-4 text-sm font-black text-ink hover:bg-cyan">
                  Importar contatos
                </button>
                <button onClick={skipIngestion} className="h-11 rounded-lg border border-line px-4 text-sm font-black text-slate-300 hover:border-cyan/50 hover:text-white">
                  Avançar sem importar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
