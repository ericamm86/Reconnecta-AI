import { Bot, Check, MessageSquareText, Send, Sparkles, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { searchContactsFromPrompt } from "../lib/localSearch";

const starterPrompts = [
  "Quem resolve problemas de infraestrutura?",
  "Quem presta servico de limpeza?",
  "Quem esta ligado a investidores?",
  "Adicione a tag Investidor ao contato Joao Martins"
];

function ContactResultCard({ item, onSelect }) {
  const { contact, matchedTerms, score } = item;
  return (
    <button
      onClick={() => onSelect(contact)}
      className="w-full rounded-lg border border-line bg-white/[0.04] p-3 text-left transition hover:border-mint/50 hover:bg-mint/10"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-black text-white">{contact.name}</h4>
          <p className="mt-1 text-xs text-slate-400">
            {contact.role || "Contato"} {contact.company ? `- ${contact.company}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-cyan/10 px-2 py-1 text-xs font-black text-cyan">{score}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-300">
        {contact.problemSolved || contact.description || contact.currentDemand || "Sem descricao enriquecida."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(matchedTerms.length ? matchedTerms : contact.tags || []).slice(0, 4).map((term) => (
          <span key={term} className="rounded bg-white/8 px-2 py-0.5 text-[11px] font-bold text-slate-300">
            {term}
          </span>
        ))}
      </div>
    </button>
  );
}

function ActionApproval({ action, onApprove, onReject }) {
  return (
    <div className="rounded-lg border border-amber/30 bg-amber/10 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-amber">Acao sugerida</p>
      <p className="mt-2 text-sm font-semibold text-white">{action.label}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onApprove(action)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-mint px-3 text-xs font-black text-ink">
          <Check size={14} />
          Aprovar
        </button>
        <button onClick={onReject} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-bold text-slate-200">
          <X size={14} />
          Ignorar
        </button>
      </div>
    </div>
  );
}

export function CopilotChat({ contacts, selected, onSelectContact, onToast }) {
  const [input, setInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Pergunte sobre quem resolve um problema, presta um servico ou deve receber uma tag. Eu busco na sua base local primeiro."
    }
  ]);

  const contextLabel = useMemo(() => selected?.name || "rede inteira", [selected]);

  async function submitPrompt(prompt = input) {
    const value = prompt.trim();
    if (!value || isAiThinking) return;

    const parsed = searchContactsFromPrompt(value, contacts);
    const assistantMessageId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: value }
    ]);
    setInput("");
    setIsAiThinking(true);

    try {
      const { data } = await api.generateStreamingChatResponse({
        prompt: value,
        contextContacts: parsed.results.map((result) => result.contact),
        intent: parsed.intent
      });

      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: data.text || parsed.summary,
          provider: data.provider,
          generativeUi: parsed.results.length || parsed.action
            ? {
                type: "contact_results",
                results: parsed.results,
                action: parsed.action
              }
            : null
        }
      ]);
    } catch (error) {
      console.error("Falha na resposta do Copilot LLM:", error);
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: parsed.summary,
          provider: "local_fallback",
          generativeUi: {
            type: "contact_results",
            results: parsed.results,
            action: parsed.action
          }
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  }

  function approveAction(action) {
    onToast?.(`Pipeline preparado: ${action.label}. Persistencia sera conectada ao function calling.`);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Acao aprovada na camada de UI. No proximo passo, este evento dispara a funcao segura de escrita."
      }
    ]);
  }

  return (
    <aside id="copilot-chat" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <span id="copilot" className="sr-only" />
      <section className="rounded-xl border border-line bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-cyan/15 text-cyan">
              <Bot size={21} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-cyan">Copilot chat</p>
              <h2 className="text-xl font-black text-white">Busca contextual sobre {contextLabel}</h2>
            </div>
          </div>
          <span className="rounded-lg border border-line bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
            Generative UI ready
          </span>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.72fr_0.28fr]">
          <div className="flex max-h-[560px] min-h-[420px] flex-col rounded-lg border border-line bg-black/20">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/15 text-cyan">
                      <Sparkles size={17} />
                    </div>
                  )}
                  <div className={`max-w-[86%] rounded-lg border p-3 ${message.role === "user" ? "border-mint/30 bg-mint/10" : "border-line bg-white/[0.04]"}`}>
                    <p className="text-sm leading-6 text-slate-100">{message.content || message.text}</p>
                    {message.provider && (
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {message.provider === "openai" ? "Resposta com IA" : "Fallback local"}
                      </p>
                    )}
                    {message.generativeUi?.results?.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {message.generativeUi.results.map((item) => (
                          <ContactResultCard key={item.contact.id} item={item} onSelect={onSelectContact} />
                        ))}
                      </div>
                    )}
                    {message.generativeUi?.action && (
                      <div className="mt-3">
                        <ActionApproval action={message.generativeUi.action} onApprove={approveAction} onReject={() => onToast?.("Acao descartada.")} />
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint">
                      <User size={17} />
                    </div>
                  )}
                </article>
              ))}
              {isAiThinking && (
                <article className="flex justify-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/15 text-cyan">
                    <Sparkles size={17} />
                  </div>
                  <div className="rounded-lg border border-line bg-white/[0.04] p-3 text-sm font-semibold text-slate-300">
                    Analisando contexto local e sintetizando resposta...
                  </div>
                </article>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitPrompt();
              }}
              className="border-t border-line p-3"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  disabled={isAiThinking}
                  onChange={(event) => setInput(event.target.value)}
                  className="h-11 flex-1 rounded-lg border border-line bg-black/25 px-3 text-sm text-white outline-none focus:border-cyan/50"
                  placeholder="Quem resolve problemas de infraestrutura?"
                />
                <button disabled={isAiThinking} className="grid h-11 w-11 place-items-center rounded-lg bg-cyan text-ink hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60" aria-label="Enviar">
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-line bg-black/20 p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="text-mint" size={18} />
              <h3 className="font-black text-white">Prompts rapidos</h3>
            </div>
            <div className="mt-4 grid gap-2">
              {starterPrompts.map((prompt) => (
                <button key={prompt} disabled={isAiThinking} onClick={() => submitPrompt(prompt)} className="rounded-lg border border-line bg-white/[0.04] p-3 text-left text-sm font-semibold text-slate-300 hover:border-cyan/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
