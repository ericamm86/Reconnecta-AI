import { ArrowDownAZ, BadgeAlert, CheckSquare, ExternalLink, Link2, MessageCircle, Search, Square, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

const defaultCustomFields = [
  { key: "senioridade", label: "Senioridade", type: "select" },
  { key: "prioridade", label: "Prioridade", type: "checkbox" }
];

function normalize(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SocialLink({ href, type }) {
  if (!href) return null;
  const Icon = type === "whatsapp" ? MessageCircle : type === "custom" ? ExternalLink : Link2;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white/[0.04] text-slate-300 hover:border-mint/40 hover:text-white">
      <Icon size={16} />
    </a>
  );
}

function DynamicValue({ field, value }) {
  if (field.type === "checkbox") {
    return <span className={`rounded-md px-2 py-1 text-xs font-black ${value ? "bg-mint/10 text-mint" : "bg-white/8 text-slate-400"}`}>{value ? "Sim" : "Nao"}</span>;
  }
  return <span className="text-sm font-semibold text-slate-200">{value || "Nao preenchido"}</span>;
}

export function ContactsWorkspace({ contacts, selected, onSelect, onCreateContact }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [tagFilter, setTagFilter] = useState("");
  const [dddFilter, setDddFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [customFields, setCustomFields] = useState(defaultCustomFields);
  const [fieldForm, setFieldForm] = useState({ key: "", label: "", type: "short_text" });

  const tags = useMemo(() => [...new Set(contacts.flatMap((contact) => contact.tags || []))], [contacts]);
  const ddds = useMemo(() => [...new Set(contacts.map((contact) => contact.derivedDdd).filter(Boolean))], [contacts]);
  const sources = useMemo(() => [...new Set(contacts.map((contact) => contact.sourceOrigin).filter(Boolean))], [contacts]);
  const mergeCount = contacts.filter((contact) => contact.hasMergeSuggestion).length;

  const filtered = useMemo(() => {
    const value = normalize(search);
    return contacts
      .filter((contact) => {
        const haystack = normalize([contact.name, contact.description, contact.problemSolved, contact.currentDemand, contact.company, contact.tags?.join(" ")].filter(Boolean).join(" "));
        return (
          (!value || haystack.includes(value)) &&
          (!tagFilter || contact.tags?.includes(tagFilter)) &&
          (!dddFilter || contact.derivedDdd === dddFilter) &&
          (!sourceFilter || contact.sourceOrigin === sourceFilter) &&
          (!scopeFilter || contact.recordScopes?.includes(scopeFilter))
        );
      })
      .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : new Date(b.lastInteractionAt || 0) - new Date(a.lastInteractionAt || 0)));
  }, [contacts, dddFilter, scopeFilter, search, sort, sourceFilter, tagFilter]);

  function toggleSelection(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function createCustomField(event) {
    event.preventDefault();
    if (!fieldForm.key.trim() || !fieldForm.label.trim()) return;
    setCustomFields((current) => [
      ...current,
      {
        key: fieldForm.key.trim().replace(/\s+/g, "_"),
        label: fieldForm.label.trim(),
        type: fieldForm.type
      }
    ]);
    setFieldForm({ key: "", label: "", type: "short_text" });
  }

  return (
    <section id="contacts-workspace" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UsersRound className="text-mint" />
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-mint">Contatos</p>
                <h2 className="text-xl font-black text-white">Lista performatica</h2>
              </div>
            </div>
            {mergeCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-black text-amber">
                <BadgeAlert size={15} />
                {mergeCount} merge pendente
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-black/25 pl-10 pr-3 text-sm text-white outline-none focus:border-mint/50"
                placeholder="Busca por nome, tag, demanda, problema..."
              />
            </div>
            <button onClick={() => setSort((current) => (current === "recent" ? "az" : "recent"))} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-slate-200 hover:bg-white/8">
              <ArrowDownAZ size={16} />
              {sort === "recent" ? "Recentes" : "A-Z"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
              <option value="">Tags</option>
              {tags.map((tag) => <option key={tag}>{tag}</option>)}
            </select>
            <select value={dddFilter} onChange={(event) => setDddFilter(event.target.value)} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
              <option value="">DDD</option>
              {ddds.map((ddd) => <option key={ddd}>{ddd}</option>)}
            </select>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
              <option value="">Fonte</option>
              {sources.map((source) => <option key={source}>{source}</option>)}
            </select>
            <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
              <option value="">Escopo</option>
              <option value="INTERNAL_PRIVATE">Interno</option>
              <option value="GROUP_CONTACT">Grupo</option>
              <option value="PUBLIC_PLATFORM_PROFILE">Publico</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 8).map((tag) => (
              <button key={tag} onClick={() => setTagFilter(tag)} className="rounded-md bg-white/8 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-mint/10 hover:text-mint">
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            {selectedIds.length > 0 && (
              <div className="rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm font-bold text-cyan">
                {selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"} para acao em lote
              </div>
            )}
            {filtered.map((contact) => (
              <article key={contact.id} className={`rounded-lg border p-3 ${selected?.id === contact.id ? "border-mint/50 bg-mint/10" : "border-line bg-black/15"}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleSelection(contact.id)} className="text-slate-400 hover:text-white">
                    {selectedIds.includes(contact.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <button onClick={() => onSelect(contact)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-mint/15 text-sm font-black text-mint">{initials(contact.name)}</div>
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-white">{contact.name}</h3>
                      <p className="truncate text-sm text-slate-400">{contact.role} - {contact.company}</p>
                    </div>
                  </button>
                  {contact.hasMergeSuggestion && <BadgeAlert className="text-amber" size={18} />}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-mint to-cyan text-xl font-black text-ink">{initials(selected.name)}</div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-cyan">Visao 360</p>
                    <h2 className="text-2xl font-black text-white">{selected.name}</h2>
                    <p className="text-sm text-slate-400">{selected.role} - {selected.company}</p>
                  </div>
                </div>
                <button onClick={onCreateContact} className="h-10 rounded-lg bg-mint px-3 text-sm font-black text-ink hover:bg-cyan">Novo contato</button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.tags?.map((tag) => <span key={tag} className="rounded-md bg-mint/10 px-2 py-1 text-xs font-bold text-mint">{tag}</span>)}
                {selected.linkedUserId && <span className="rounded-md bg-cyan/10 px-2 py-1 text-xs font-bold text-cyan">Usuario real</span>}
                {selected.recordScopes?.map((scope) => <span key={scope} className="rounded-md bg-white/8 px-2 py-1 text-xs font-bold text-slate-300">{scope}</span>)}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  ["O que demanda", selected.currentDemand],
                  ["Problemas que resolve", selected.problemSolved],
                  ["Notas internas", selected.internalNotes]
                ].map(([label, value]) => (
                  <article key={label} className="rounded-lg border border-line bg-black/15 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{value || "Nao preenchido"}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <article className="rounded-lg border border-line bg-black/15 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Campos dinamicos</p>
                  <div className="mt-3 grid gap-3">
                    {customFields.map((field) => (
                      <div key={field.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] p-3">
                        <span className="text-sm font-bold text-slate-300">{field.label}</span>
                        <DynamicValue field={field} value={selected.customValues?.[field.key]} />
                      </div>
                    ))}
                  </div>
                  <form onSubmit={createCustomField} className="mt-4 rounded-lg border border-line bg-black/20 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Criar campo</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <input
                        value={fieldForm.label}
                        onChange={(event) => setFieldForm({ ...fieldForm, label: event.target.value, key: event.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "_") })}
                        className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white outline-none focus:border-mint/50"
                        placeholder="Ex: Data da ultima call"
                      />
                      <select
                        value={fieldForm.type}
                        onChange={(event) => setFieldForm({ ...fieldForm, type: event.target.value })}
                        className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white"
                      >
                        <option value="short_text">Texto curto</option>
                        <option value="long_text">Texto longo</option>
                        <option value="number">Numero</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="multiselect">Multiselect</option>
                        <option value="date">Data</option>
                      </select>
                      <button className="h-10 rounded-lg bg-mint text-sm font-black text-ink hover:bg-cyan">Adicionar</button>
                    </div>
                  </form>
                </article>
                <article className="rounded-lg border border-line bg-black/15 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Ecossistema e links</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>DDD: <strong className="text-white">{selected.derivedDdd || "N/A"}</strong></p>
                    <p>Fonte: <strong className="text-white">{selected.sourceOrigin || "manual"}</strong></p>
                    <p>Emails: <strong className="text-white">{selected.emails?.join(", ") || selected.email}</strong></p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <SocialLink href={selected.socialLinks?.linkedin} type="linkedin" />
                    <SocialLink href={selected.socialLinks?.instagram} type="instagram" />
                    <SocialLink href={selected.socialLinks?.whatsapp} type="whatsapp" />
                    <SocialLink href={selected.socialLinks?.custom} type="custom" />
                  </div>
                </article>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-line p-8 text-center text-slate-400">Selecione um contato para abrir a visao 360.</div>
          )}
        </section>
      </div>
    </section>
  );
}
