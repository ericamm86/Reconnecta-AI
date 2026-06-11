import { CalendarDays, Columns3, FileUp, Filter, GitMerge, LayoutDashboard, MessageSquare, Network, Settings, ShieldCheck, Tags, UserRoundCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const screens = [
  ["Onboarding", "Perfil inicial e privacidade", UserRoundCog],
  ["Dashboard", "Metricas, alertas e atalhos", LayoutDashboard],
  ["Importar Contatos", "Google, CSV e manual", FileUp],
  ["Contatos", "Busca semantica, tags e DDD", UsersRound],
  ["Detalhe do Contato", "Visao 360 e notas privadas", Columns3],
  ["Grafo Interno", "Constelacao privada", Network],
  ["Grupos Compartilhados", "Hub de comunidades", UsersRound],
  ["Grafo do Grupo", "Conexoes por grupo", Network],
  ["Rede Publica", "Explorar perfis opt-in", ShieldCheck],
  ["Grafo Publico", "Constelacao macro", Network],
  ["Perfil Proprio", "Dados e visibilidade", UserRoundCog],
  ["Chat", "Mensageria preparada para IA", MessageSquare],
  ["Configuracoes", "Seguranca e notificacoes", Settings],
  ["Admin Grupo", "Membros, convites e logs", ShieldCheck],
  ["Campos Personalizados", "Tipagem dinamica", Filter]
];

const importSources = [
  ["Google Contacts", "Fluxo real via Google API", "Obrigatorio"],
  ["CSV", "Parser estruturado por colunas", "Ativo"],
  ["Manual", "Formulario passo a passo", "Ativo"],
  ["Apple Contacts", "Integracao planejada para uma proxima versao", "Em breve"],
  ["Microsoft Outlook", "Integracao planejada para uma proxima versao", "Em breve"],
  ["LinkedIn Export", "Sincronizacao planejada para uma proxima versao", "Em breve"]
];

export function ProductArchitecturePanel({ onToast, session, onRefresh }) {
  const [duplicates, setDuplicates] = useState([]);
  const [graph, setGraph] = useState(null);
  const [csvText, setCsvText] = useState("name,email,phones,tags\nAna Torres,ana@example.com,+55 85 98888-0000,\"startup,design\"");

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

  async function importCsv(event) {
    event.preventDefault();
    const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
    const headers = parseCsvLine(headerLine);
    const rows = lines.filter(Boolean).map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
      return {
        name: row.name,
        email: row.email,
        emails: row.email ? [row.email] : [],
        phones: row.phones ? row.phones.split("|").map((phone) => phone.trim()) : [],
        tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        sourceOrigin: "csv"
      };
    });

    try {
      const { data } = await api.importContacts({ source: "csv", rows });
      setDuplicates(data.duplicateCandidates || []);
      onToast(`${data.job.importedRows} contato${data.job.importedRows === 1 ? "" : "s"} importado${data.job.importedRows === 1 ? "" : "s"}.`);
    } catch (error) {
      onToast(error.message);
    }
  }

  async function importGoogleContacts() {
    const accessToken = session?.provider_token;
    if (!accessToken) {
      onToast("Entre com Google para liberar a importacao real de Google Contacts.");
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
  }

  async function ignoreDuplicate(pair) {
    await api.ignoreDuplicate({ leftContactId: pair.left.id, rightContactId: pair.right.id, reason: "user_ignored" }).catch(() => null);
    setDuplicates((current) => current.filter((item) => item.id !== pair.id));
    onToast("Par marcado como nao duplicado.");
  }

  async function mergeDuplicate(pair) {
    try {
      const { data } = await api.mergeDuplicate({ leftContactId: pair.left.id, rightContactId: pair.right.id, reason: pair.reason });
      setDuplicates((current) => current.filter((item) => item.id !== pair.id));
      onToast(`${data.mergedContact.name} consolidado com sucesso.`);
      onRefresh?.(data.mergedContact.id);
    } catch (error) {
      onToast(error.message || "Nao foi possivel aprovar o merge.");
    }
  }

  return (
    <section id="product-architecture" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
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
              <article key={title} className="rounded-lg border border-line bg-black/15 p-4 transition hover:border-mint/40 hover:bg-white/[0.06]">
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
              <p className="text-sm uppercase tracking-[0.16em] text-amber">Central de importacao</p>
              <h2 className="text-xl font-black text-white">Ingestao e deduplicacao</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
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
                  <span title={status === "Em breve" ? "Funcionalidade fora do escopo do MVP, com interface reservada para evolucao." : ""} className={`rounded-md px-2 py-1 text-xs font-black ${status === "Em breve" ? "bg-white/8 text-slate-400" : "bg-mint/10 text-mint"}`}>
                    {status}
                  </span>
                )}
              </article>
            ))}
          </div>

          <form onSubmit={importCsv} className="mt-4 rounded-lg border border-line bg-black/15 p-4">
            <h3 className="font-black text-white">CSV estruturado</h3>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="mt-3 min-h-32 w-full rounded-lg border border-line bg-black/25 p-3 text-sm text-white outline-none focus:border-amber/50"
            />
            <button className="mt-3 h-10 w-full rounded-lg bg-amber text-sm font-black text-ink hover:bg-mint">Importar CSV</button>
          </form>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <GitMerge className="text-cyan" />
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-cyan">Revisao de duplicados</p>
              <h2 className="text-xl font-black text-white">Fila consultiva de possiveis duplicados</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {duplicates.length ? (
              duplicates.map((pair) => (
                <article key={pair.id} className="rounded-lg border border-line bg-black/15 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[pair.left, pair.right].map((contact) => (
                      <div key={contact.id} className="rounded-lg bg-white/[0.04] p-3">
                        <h3 className="font-black text-white">{contact.name}</h3>
                        <p className="text-sm text-slate-400">{contact.email}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-cyan/10 px-2 py-1 text-xs font-bold text-cyan">{pair.reason}</span>
                    <button onClick={() => mergeDuplicate(pair)} className="rounded-md bg-mint px-2 py-1 text-xs font-black text-ink">Aprovar merge</button>
                    <button className="rounded-md border border-line px-2 py-1 text-xs font-bold text-white">Revisar</button>
                    <button onClick={() => ignoreDuplicate(pair)} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-slate-300">Ignorar</button>
                  </div>
                </article>
              ))
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
                <span className="text-sm text-slate-400">As tags aparecem como nos de agrupamento no payload do grafo.</span>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["texto curto", "texto longo", "numero", "select", "checkbox", "multiselect", "data"].map((type) => (
              <div key={type} className="rounded-lg border border-line bg-black/15 p-3 text-sm font-bold text-slate-300">
                {type}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
