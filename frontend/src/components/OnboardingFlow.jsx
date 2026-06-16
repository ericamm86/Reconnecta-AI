import { CheckCircle2, FileUp, Globe2, Network, ShieldCheck, UserRound } from "lucide-react";

const steps = [
  ["Autenticacao", "E-mail e senha verificados", CheckCircle2],
  ["Perfil", "Dados basicos do usuario", UserRound],
  ["Privacidade", "Perfil publico desligado por padrao", ShieldCheck],
  ["Ingestao", "Google, CSV ou contato manual", FileUp],
  ["Insights", "Primeiro grafo e metricas", Network]
];

export function OnboardingFlow({ profile, onUpdateProfile, contacts, onImport }) {
  return (
    <section id="onboarding" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="rounded-xl border border-line bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-mint">Onboarding</p>
            <h2 className="text-xl font-black text-white">Configuracao inicial guiada</h2>
          </div>
          <span className="rounded-lg border border-line bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
            {contacts.length} contatos importados
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {steps.map(([label, description, Icon], index) => (
            <article key={label} className="rounded-lg border border-line bg-black/15 p-4">
              <div className="flex items-center justify-between">
                <Icon className="text-cyan" size={19} />
                <span className="text-xs font-black text-slate-500">{index + 1}</span>
              </div>
              <h3 className="mt-3 font-black text-white">{label}</h3>
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_0.3fr]">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-300">
                Nome publico
                <input
                  value={profile.displayName || ""}
                  onChange={(event) => onUpdateProfile({ ...profile, displayName: event.target.value, onboardingStep: "privacy" })}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-mint/50"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/20 px-4 py-3 text-sm font-bold text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Globe2 size={17} className="text-mint" />
                  Perfil visivel na rede publica
                </span>
                <input
                  type="checkbox"
                  checked={profile.isPublic}
                  onChange={(event) => onUpdateProfile({ ...profile, isPublic: event.target.checked, onboardingStep: "ingestion" })}
                  className="h-5 w-5 accent-mint"
                />
              </label>
            </div>

            <div className="flex gap-3 rounded-lg border border-mint/25 bg-mint/10 px-4 py-3 text-sm font-semibold text-slate-200">
              <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={18} />
              <p>
                Seus contatos importados permanecem privados. Apenas seu perfil pode ser publicado quando voce ativar a rede publica.
              </p>
            </div>
          </div>

          <button onClick={onImport} className="h-11 rounded-lg bg-mint px-4 text-sm font-black text-ink hover:bg-cyan">
            Importar contatos
          </button>
        </div>
      </div>
    </section>
  );
}
