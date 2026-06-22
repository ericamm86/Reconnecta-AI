import { AlertTriangle, CalendarDays, Check, Columns3, FileUp, Filter, GitMerge, LayoutDashboard, MessageSquare, Network, Settings, ShieldCheck, Tags, UserRoundCog, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const pendingGoogleImportKey = "reconnect-pending-google-import";

const screens = [
  ["Onboarding", "Perfil inicial e privacidade", UserRoundCog],
  ["Dashboard", "Metricas, alertas e atalhos", LayoutDashboard],
  ["Importar Contatos", "Google, CSV e manual", FileUp],
  ["Contatos", "Busca semantica, tags e DDD", UsersRound],
  ["Detalhe do Contato", "Visão 360 e notas privadas", Columns3],
  ["Grafo Interno", "Constelação privada", Network],
  ["Grupos Compartilhados", "Hub de comunidades", UsersRound],
  ["Grafo do Grupo", "Conexões por grupo", Network],
  ["Rede Pública", "Explorar perfis opt-in", ShieldCheck],
  ["Grafo Público", "Constelação macro", Network],
  ["Perfil Proprio", "Dados e visibilidade", UserRoundCog],
  ["Chat", "Mensageria preparada para IA", MessageSquare],
  ["Configurações", "Seguranca e notificacoes", Settings],
  ["Admin Grupo", "Membros, convites e logs", ShieldCheck],
  ["Campos Personalizados", "Tipagem dinamica", Filter]
];

const importSources = [
  ["Google Contacts", "Fluxo real via Google API", "Obrigatorio"],
  ["Apple Contacts", "Integração planejada para uma próxima versão", "Em breve"],
  ["Microsoft Outlook", "Integração planejada para uma próxima versão", "Em breve"],
  ["LinkedIn Export", "Sincronização planejada para uma próxima versão", "Em breve"]
];

export function ProductArchitecturePanel({ onToast, session, googleProviderToken, onConnectGoogle, onRefresh }) {
  const [duplicates, setDuplicates] = useState([]);
  const [graph, setGraph] = useState(null);
  const [csvText, setCsvText] = useState("name,email,phones,tags\nAna Torres,ana@example.com,+55 85 98888-0000,\"startup,design\"");
  const [csvOpen, setCsvOpen] = useState(false);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [csvErrorMessage, setCsvErrorMessage] = useState("");
  const [processingDuplicateId, setProcessingDuplicateId] = useState(null);

  useEffect(() => {
    Promise.all([api.duplicates(), api.internalGraph()])
      .then(([duplicatePayload, graphPayload]) => {
        setDuplicates(duplicatePayload.data || []);
        setGraph(graphPayload.data);
      })
      .catch(() => {
        setDuplicates([]);
        setGraph(null);
      });
  }, []);

  const mostUsedTags = useMemo(() => {
    const counts = new Map();
    graph?.nodes?.filter((node) => node.type === "tag").forEach((node) => counts.set(node.label, node.weight || 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [graph]);

  function parseCsvLine(line) {
    const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    return parts.map((part) => part.replace(/^"|"$/g, "").trim());
  }

  function sanitizeCsvPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("55") ? `+${digits}` : digits;
  }

  function csvValue(row, ...keys) {
    return keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
  }

  async function importCsv(event) {
    event.preventDefault();

    if (!csvText.trim()) {
      setCsvErrorMessage("O arquivo CSV parece estar vazio.");
      return;
    }

    setIsCsvImporting(true);
    setCsvErrorMessage("");

    try {
      const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
      const headers = parseCsvLine(headerLine).map((header) => header.trim());
      const rows = lines
        .filter(Boolean)
        .map((line) => {
          const values = parseCsvLine(line);
          const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
          const email = String(csvValue(row, "email")).trim().toLowerCase();
          const phones = [
            ...new Set(String(csvValue(row, "phones", "phone", "telefone"))
              .split("|")
              .map((phone) => sanitizeCsvPhone(phone))
              .filter(Boolean))
          ];
          const tags = [
            ...new Set([
              ...String(csvValue(row, "tags", "tag"))
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
              "csv_import"
            ])
          ];

          return {
            name: String(csvValue(row, "name", "nome")).trim(),
            email,
            emails: email ? [email] : [],
            phones,
            company: String(csvValue(row, "company", "empresa")).trim(),
            role: String(csvValue(row, "role", "cargo")).trim(),
            tags,
            sourceOrigin: "csv",
            problemSolved: String(csvValue(row, "problem_solved", "problemSolved", "problema_resolvido")).trim(),
            currentDemand: String(csvValue(row, "current_demand", "currentDemand", "demanda_atual")).trim(),
            internalNotes: String(csvValue(row, "internal_notes", "internalNotes", "notes", "notas")).trim() || "Importado via arquivo CSV."
          };
        })
        .filter((contact) => contact.name);

      const { data } = await api.importContacts({ source: "csv", rows });
      setDuplicates(data.duplicateCandidates || []);
      onToast(`${data.job.importedRows} contato${data.job.importedRows === 1 ? "" : "s"} importado${data.job.importedRows === 1 ? "" : "s"}.`);
    } catch (error) {
      setCsvErrorMessage("Falha ao ler o arquivo CSV. Verifique a codificacao e as colunas.");
      onToast(error.message || "Falha ao importar CSV.");
    } finally {
      setIsCsvImporting(false);
    }
  }

  const importGoogleContacts = useCallback(async function importGoogleContacts() {
    const accessToken = session?.provider_token || googleProviderToken;
    if (!accessToken) {
      window.localStorage.setItem(pendingGoogleImportKey, "true");
      onToast("Conecte sua conta Google para importar os contatos.");
      onConnectGoogle?.();
      return;
    }

    try {
      const { data } = await api.importGoogleContacts({ accessToken });
      setDuplicates(data.duplicateCandidates || []);
      const suffix = data.job.importedRows === 1 ? "" : "s";
      onToast(`${data.job.importedRows} contato${suffix} importado${suffix} do Google.`);
      onRefresh?.();
    } catch (error) {
      onToast(error.message || "Falha ao importar Google Contacts.");
    }
  }, [googleProviderToken, onConnectGoogle, onRefresh, onToast, session?.provider_token]);

  useEffect(() => {
    const accessToken = session?.provider_token || googleProviderToken;
    if (!accessToken || window.localStorage.getItem(pendingGoogleImportKey) !== "true") return;

    window.localStorage.removeItem(pendingGoogleImportKey);
    const timer = window.setTimeout(() => importGoogleContacts(), 0);
    return () => window.clearTimeout(timer);
  }, [googleProviderToken, importGoogleContacts, session?.provider_token]);

  function duplicateReasonLabel(reason) {
    if (reason === "email_exact_match") return "E-mail identico encontrado";
    if (reason === "phone_exact_match") return "Mesmo numero de telefone";
    return "Possivel duplicidade";
  }

  function contactInitials(contact) {
    return (contact?.name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  async function handleDuplicateAction(pair, action) {
    if (processingDuplicateId) return;
    setProcessingDuplicateId(pair.id);
    try {
      await action();
    } finally {
      setProcessingDuplicateId(null);
    }
  }

  async function ignoreDuplicate(pair) {
    await handleDuplicateAction(pair, async () => {
      await api.ignoreDuplicate({ leftContactId: pair.left.id, rightContactId: pair.right.id, reason: "user_ignored" }).catch(() => null);
      setDuplicates((current) => current.filter((item) => item.id !== pair.id));
      onToast("Par marcado como nao duplicado.");
    });
  }

  async function mergeDuplicate(pair) {
    await handleDuplicateAction(pair, async () => {
      try {
        const { data } = await api.mergeDuplicate({ leftContactId: pair.left.id, rightContactId: pair.right.id, reason: pair.reason });
        setDuplicates((current) => current.filter((item) => item.id !== pair.id));
        onToast(`${data.mergedContact.name} consolidado com sucesso.`);
        onRefresh?.(data.mergedContact.id);
      } catch (error) {
        onToast(error.message || "Nao foi possivel aprovar o merge.");
      }
    });
  }

  return (
    <section id="product-architecture" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <span id="architecture" className="sr-only" />
      <span id="api-docs" className="sr-only" />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-mint" />
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-mint">Mapa de UX</p>
              <h2 className="text-xl font-black text-white">15 telas principais</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {screens.map(([title, description, Icon], index) => (
              <article key={title} className="cursor-default select-none rounded-lg border border-line bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="text-cyan" size={18} />
                  <span className="text-xs font-black text-slate-500">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-3 font-black text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <FileUp className="text-amber" />
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-amber">Central de importação</p>
              <h2 className="text-xl font-black text-white">Ingestão e deduplicação</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/15 p-3">
              <div>
                <h3 className="font-black text-white">CSV</h3>
                <p className="text-sm text-slate-400">Parser estruturado por colunas</p>
              </div>
              <button onClick={() => setCsvOpen((current) => !current)} className="rounded-md bg-amber px-2 py-1 text-xs font-black text-ink">
                {csvOpen ? "Fechar" : "Abrir"}
              </button>
            </article>

            <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/15 p-3">
              <div>
                <h3 className="font-black text-white">Manual</h3>
                <p className="text-sm text-slate-400">Cadastro de contato individual</p>
              </div>
              <button onClick={() => window.dispatchEvent(new CustomEvent("reconnect:create-contact"))} className="rounded-md bg-mint px-2 py-1 text-xs font-black text-ink">
                Criar
              </button>
            </article>

            {importSources.map(([name, detail, status]) => (
              <article key={name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/15 p-3">
                <div>
                  <h3 className="font-black text-white">{name}</h3>
                  <p className="text-sm text-slate-400">{detail}</p>
                </div>
                {name === "Google Contacts" ? (
                  <button onClick={importGoogleContacts} className="rounded-md bg-mint px-2 py-1 text-xs font-black text-ink">
                    Importar
                  </button>
                ) : (
                  <span title="Funcionalidade fora do escopo do MVP, com interface reservada para evolucao." className="cursor-default select-none rounded-md border border-line bg-transparent px-2 py-1 text-xs font-black text-slate-500">
                    {status}
                  </span>
                )}
              </article>
            ))}
          </div>

          {csvOpen && (
            <form onSubmit={importCsv} className="mt-4 rounded-lg border border-line bg-black/15 p-4">
              <h3 className="font-black text-white">CSV estruturado</h3>
              <textarea
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                className="mt-3 min-h-32 w-full rounded-lg border border-line bg-black/25 p-3 text-sm text-white outline-none focus:border-amber/50"
              />
              {csvErrorMessage && (
                <p className="mt-3 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-bold text-amber">
                  {csvErrorMessage}
                </p>
              )}
              <button disabled={isCsvImporting} className="mt-3 h-10 w-full rounded-lg bg-amber text-sm font-black text-ink hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60">
                {isCsvImporting ? "Importando..." : "Importar CSV"}
              </button>
            </form>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <GitMerge className="text-cyan" />
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-cyan">Revisao de duplicados</p>
              <h2 className="text-xl font-black text-white">Fila consultiva de possíveis duplicados</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {duplicates.length ? (
              duplicates.map((pair) => {
                const isProcessing = processingDuplicateId === pair.id;
                const reasonLabel = duplicateReasonLabel(pair.reason);

                return (
                  <article key={pair.id} className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-black/20 p-5 shadow-glow backdrop-blur-md transition-all">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold text-cyan">
                      <AlertTriangle size={15} />
                      <span>
                        {reasonLabel}
                        {pair.matchValue && (
                          <>
                            : <strong className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-slate-100">{pair.matchValue}</strong>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[pair.left, pair.right].map((contact, index) => (
                        <div key={contact.id} className={`relative flex min-w-0 items-center gap-3 rounded-lg border bg-white/[0.035] p-4 ${index === 0 ? "border-mint/30" : "border-line"}`}>
                          {index === 0 && (
                            <span className="absolute right-2 top-2 rounded-md border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-mint">
                              Principal
                            </span>
                          )}

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-panel text-xs font-black uppercase text-slate-200">
                            {contact.avatarUrl ? (
                              <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{contactInitials(contact)}</span>
                            )}
                          </div>

                          <div className="min-w-0 pr-14">
                            <h3 className="truncate text-sm font-black text-white">{contact.name}</h3>
                            <p className="truncate text-xs text-slate-400">{contact.email || "Sem e-mail salvo"}</p>
                            {contact.company && <p className="mt-0.5 truncate text-[11px] text-slate-500">{contact.company}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                      <button
                        disabled={isProcessing}
                        onClick={() => ignoreDuplicate(pair)}
                        className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={14} />
                        Ignorar
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => mergeDuplicate(pair)}
                        className="flex items-center gap-1.5 rounded-md bg-mint px-4 py-1.5 text-xs font-black text-ink transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={14} />
                        {isProcessing ? "Mesclando..." : "Aprovar merge"}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm font-semibold text-slate-400">
                Nenhum duplicado detectado por email ou telefone exatos.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Tags className="text-mint" />
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-mint">Tags e campos</p>
              <h2 className="text-xl font-black text-white">Entidades fortes e extensibilidade</h2>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-line bg-black/15 p-4">
            <h3 className="font-black text-white">Tags mais usadas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {mostUsedTags.length ? (
                mostUsedTags.map(([tag, count]) => (
                  <span key={tag} className="rounded-md bg-mint/10 px-2 py-1 text-xs font-bold text-mint">
                    {tag} ({count})
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">As tags aparecem como nós de agrupamento no payload do grafo.</span>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["texto curto", "texto longo", "numero", "select", "checkbox", "multiselect", "data"].map((type) => (
              <div key={type} className="cursor-default select-none rounded-lg border border-line bg-black/15 p-3 text-sm font-bold text-slate-300">
                {type}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
