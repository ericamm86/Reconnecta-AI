import { BadgeAlert, BrainCircuit, Download, FileDown, Network, Plus, Radar, Rocket, Signal, Tags, Users } from "lucide-react";
import { ConnectionGraph } from "./ConnectionGraph";
import { exportContactsCsv, exportContactPdf } from "../lib/exporters";

export function Dashboard({ dashboard, contacts, selected, setSelected, intelligence, onGenerate, onCreateContact }) {
  const tagRanking = [...contacts.flatMap((contact) => contact.tags || []).reduce((map, tag) => map.set(tag, (map.get(tag) || 0) + 1), new Map()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const recentDemands = contacts.filter((contact) => contact.currentDemand).slice(0, 4);
  const solvers = contacts
    .filter((contact) => contact.problemSolved)
    .sort((a, b) => (b.problemSolved?.length || 0) - (a.problemSolved?.length || 0))
    .slice(0, 4);
  const mergeCount = contacts.filter((contact) => contact.hasMergeSuggestion).length;
  const stats = [
    ["Total de conexoes", dashboard.totalConnections, Users],
    ["Grupos ativos", dashboard.activeGroups || 1, Signal],
    ["Score medio", `${dashboard.averageScore}%`, Radar],
    ["Recomendacoes IA", dashboard.recommendations?.length || 0, BrainCircuit]
  ];

  return (
    <section id="command-center" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <span id="dashboard" className="sr-only" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <article key={label} className="rounded-lg border border-line bg-white/[0.04] p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-400">{label}</p>
              <Icon className="text-mint" size={20} />
            </div>
            <strong className="mt-4 block text-3xl font-black text-white">{value}</strong>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section id="network-graph" className="rounded-xl border border-line bg-white/[0.04] p-5">
          <span id="contacts-graph" className="sr-only" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-mint">Grafo da rede</p>
              <h2 className="mt-1 text-2xl font-black text-white">Mapa vivo de conexoes</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportContactsCsv(contacts)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-slate-200 hover:bg-white/8">
                <Download size={16} />
                CSV
              </button>
              <button onClick={onCreateContact} className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-3 text-sm font-black text-ink hover:bg-cyan">
                <Plus size={16} />
                Contato
              </button>
            </div>
          </div>

          <div className="mt-5">
            <ConnectionGraph contacts={contacts} selected={selected} setSelected={setSelected} onCreateContact={onCreateContact} />
          </div>
        </section>

        <section id="connection-intelligence" className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-cyan">Connection Intelligence</p>
              <h2 className="mt-1 text-2xl font-black text-white">{selected?.name || "Selecione um contato"}</h2>
            </div>
            <Network className="text-cyan" />
          </div>

          {selected ? (
            <>
              <div className="mt-5 rounded-lg border border-line bg-black/20 p-4">
                <p className="text-sm text-slate-400">Score de relacionamento</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-mint to-cyan" style={{ width: `${intelligence?.relationshipScore || selected.proximity}%` }} />
                </div>
                <strong className="mt-3 block text-4xl font-black text-white">{intelligence?.relationshipScore || selected.proximity}</strong>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  ["Proxima acao", intelligence?.nextAction || "Gere uma recomendacao de IA para este contato."],
                  ["Follow-up", intelligence?.followUp || "A sugestao personalizada aparecera aqui."],
                  ["Mensagem", intelligence?.message || "A mensagem pronta para envio aparecera aqui."]
                ].map(([label, text]) => (
                  <div key={label} className="rounded-lg border border-line bg-black/15 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => onGenerate(selected.id)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-black text-ink hover:bg-cyan">
                  <BrainCircuit size={17} />
                  Gerar insights
                </button>
                <button onClick={() => exportContactPdf(selected, intelligence)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-bold text-white hover:bg-white/8">
                  <FileDown size={17} />
                  PDF
                </button>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-line p-8 text-center text-slate-400">
              Selecione um contato para ativar o motor de inteligencia.
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-4">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-2">
            <Tags className="text-mint" size={19} />
            <h2 className="font-black text-white">Tags recorrentes</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {tagRanking.map(([tag, count]) => (
              <div key={tag} className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2 text-sm">
                <span className="font-bold text-slate-300">{tag}</span>
                <span className="font-black text-mint">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-2">
            <BadgeAlert className="text-amber" size={19} />
            <h2 className="font-black text-white">Duplicados</h2>
          </div>
          <p className="mt-4 text-4xl font-black text-white">{mergeCount}</p>
          <p className="mt-2 text-sm text-slate-400">sugestoes pendentes para revisao manual.</p>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <h2 className="font-black text-white">Demandas recentes</h2>
          <div className="mt-4 grid gap-2">
            {recentDemands.map((contact) => (
              <button key={contact.id} onClick={() => setSelected(contact)} className="rounded-lg bg-black/15 p-3 text-left text-sm text-slate-300 hover:bg-white/8">
                <strong className="text-white">{contact.name}</strong>
                <span className="mt-1 line-clamp-2 block">{contact.currentDemand}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <h2 className="font-black text-white">Solucionadores</h2>
          <div className="mt-4 grid gap-2">
            {solvers.map((contact) => (
              <button key={contact.id} onClick={() => setSelected(contact)} className="rounded-lg bg-black/15 p-3 text-left text-sm text-slate-300 hover:bg-white/8">
                <strong className="text-white">{contact.name}</strong>
                <span className="mt-1 line-clamp-2 block">{contact.problemSolved}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["Importar", "#product-architecture", Download],
          ["Explorar grafo", "#network-graph", Network],
          ["Abrir assistente", "#copilot-chat", Rocket]
        ].map(([label, href, Icon]) => (
          <a key={label} href={href} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.04] text-sm font-black text-white hover:border-mint/40 hover:bg-mint/10">
            <Icon size={17} />
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}
