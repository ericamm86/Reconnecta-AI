import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock3, MessageSquarePlus } from "lucide-react";

export function Timeline({ selected, interactions, interactionForm, setInteractionForm, onAddInteraction }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 sm:px-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={onAddInteraction} className="rounded-xl border border-line bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber/15 text-amber">
            <MessageSquarePlus size={20} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-amber">Registro de interações</p>
            <h2 className="text-xl font-black text-white">Registrar conversa</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-300">
            Tipo
            <select
              value={interactionForm.type}
              onChange={(event) => setInteractionForm({ ...interactionForm, type: event.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-amber/50"
            >
              <option value="call">Ligacao</option>
              <option value="email">Email</option>
              <option value="meeting">Reuniao</option>
              <option value="dm">DM</option>
              <option value="note">Nota</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-300">
            Sentimento
            <select
              value={interactionForm.sentiment}
              onChange={(event) => setInteractionForm({ ...interactionForm, sentiment: event.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-amber/50"
            >
              <option value="positive">Positivo</option>
              <option value="neutral">Neutro</option>
              <option value="risk">Risco</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-300">
          Resumo
          <input
            value={interactionForm.summary}
            onChange={(event) => setInteractionForm({ ...interactionForm, summary: event.target.value })}
            className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-amber/50"
            placeholder={selected ? `O que aconteceu com ${selected.name}?` : "Selecione um contato primeiro"}
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-300">
          Notas Markdown
          <textarea
            value={interactionForm.notesMarkdown}
            onChange={(event) => setInteractionForm({ ...interactionForm, notesMarkdown: event.target.value })}
            className="mt-2 min-h-36 w-full rounded-lg border border-line bg-black/25 p-3 text-white outline-none focus:border-amber/50"
            placeholder="- Ponto importante&#10;- Próximo passo&#10;**Contexto relevante**"
          />
        </label>

        <button className="mt-4 h-11 w-full rounded-lg bg-amber text-sm font-black text-ink transition hover:bg-mint">
          Salvar interação
        </button>
      </form>

      <section className="rounded-xl border border-line bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Clock3 className="text-mint" />
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-mint">Linha do tempo</p>
            <h2 className="text-xl font-black text-white">{selected?.name || "Contato não selecionado"}</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {interactions.length ? (
            interactions.map((interaction) => (
              <article key={interaction.id} className="rounded-lg border border-line bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-md bg-white/8 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan">
                    {interaction.type}
                  </span>
                  <time className="text-xs text-slate-500">{new Date(interaction.occurredAt).toLocaleString("pt-BR")}</time>
                </div>
                <h3 className="mt-3 font-bold text-white">{interaction.summary}</h3>
                <div className="prose prose-invert prose-sm mt-3 max-w-none text-slate-300 prose-strong:text-white prose-li:marker:text-mint">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{interaction.notesMarkdown || "_Sem notas adicionais._"}</ReactMarkdown>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line p-8 text-center text-slate-400">
              Nenhuma interação registrada para este contato.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
