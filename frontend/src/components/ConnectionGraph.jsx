import { Building2, GitBranch, Globe2, MapPin, Minus, Plus, RotateCcw, Route, SlidersHorizontal, Tags } from "lucide-react";
import { useMemo, useState } from "react";

const graphWidth = 900;
const graphHeight = 540;
const center = { x: 450, y: 270 };

const tagColors = {
  ai: "#61d7f4",
  founder: "#f6c66d",
  investidor: "#49d6a8",
  partnership: "#b8f36f",
  "follow-up": "#ff7a90",
  vc: "#c7a7ff",
  capital: "#9fd3ff",
  produto: "#49d6a8",
  warm: "#7fffd4"
};

function temperature(contact) {
  if (contact.proximity >= 78) return { label: "quente", color: "#49d6a8", ring: "ring-mint/50" };
  if (contact.proximity >= 62) return { label: "morno", color: "#f6c66d", ring: "ring-amber/50" };
  return { label: "atencao", color: "#ff7a90", ring: "ring-rose-300/50" };
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalize(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function contactDdds(contact) {
  return uniq([...(contact.derivedDdds || []), contact.derivedDdd]);
}

function filterContacts(contacts, filters) {
  return contacts.filter((contact) => {
    const searchHaystack = normalize([contact.name, contact.description, contact.problemSolved, contact.currentDemand, contact.company, contact.tags?.join(" ")].filter(Boolean).join(" "));
    const matchesContext =
      filters.context === "internal"
        ? contact.recordScopes?.includes("INTERNAL_PRIVATE") || !contact.recordScopes
        : contact.recordScopes?.includes("PUBLIC_PLATFORM_PROFILE") || contact.recordScopes?.includes("GROUP_CONTACT") || contact.linkedUserId;

    return (
      matchesContext &&
      contact.proximity >= filters.minimumScore &&
      (!filters.tag || contact.tags?.includes(filters.tag)) &&
      (!filters.source || contact.sourceOrigin === filters.source) &&
      (!filters.ddd || contact.derivedDdd === filters.ddd || contact.derivedDdds?.includes(filters.ddd)) &&
      (!filters.scope || contact.recordScopes?.includes(filters.scope)) &&
      (!filters.hasDemand || Boolean(contact.currentDemand)) &&
      (!filters.hasProblemSolved || Boolean(contact.problemSolved)) &&
      (!filters.linkedOnly || Boolean(contact.linkedUserId)) &&
      (!filters.search || searchHaystack.includes(normalize(filters.search)))
    );
  });
}

function buildContactNodes(contacts, focusedId, manualPositions = {}) {
  const radius = contacts.length <= 3 ? 190 : 214;
  return contacts.map((contact, index) => {
    const angle = contacts.length === 1 ? -Math.PI / 2 : (index / contacts.length) * Math.PI * 2 - Math.PI / 2;
    const scorePull = (100 - contact.proximity) * 0.6;
    const basePosition = {
      x: center.x + Math.cos(angle) * (radius + scorePull),
      y: center.y + Math.sin(angle) * (radius + scorePull)
    };

    return {
      kind: "contact",
      graphGroup: "person",
      graphId: `person:${contact.id}`,
      val: 25,
      ...contact,
      ...basePosition,
      ...(manualPositions[contact.id] || {}),
      faded: focusedId && focusedId !== contact.id && !contact.tags?.some((tag) => contacts.find((item) => item.id === focusedId)?.tags?.includes(tag))
    };
  });
}

function conceptNodes(contacts) {
  const concepts = [
    ...uniq(contacts.flatMap((contact) => contact.tags || [])).map((label) => ({ kind: "tag", graphGroup: "tag", label, Icon: Tags, color: tagColors[label] || "#61d7f4", val: 15 })),
    ...uniq(contacts.map((contact) => contact.sourceOrigin)).map((label) => ({ kind: "source", label, Icon: GitBranch, color: "#f6c66d" })),
    ...uniq(contacts.flatMap(contactDdds)).map((label) => ({ kind: "ddd", graphGroup: "ddd", label: `DDD ${label}`, raw: label, Icon: MapPin, color: "#c7a7ff", val: 12 })),
    ...uniq(contacts.map((contact) => contact.company)).map((label) => ({ kind: "organization", label, Icon: Building2, color: "#9fd3ff" }))
  ].slice(0, 10);

  return concepts.map((concept, index) => {
    const angle = (index / Math.max(concepts.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      ...concept,
      id: `${concept.kind}:${concept.raw || concept.label}`,
      x: center.x + Math.cos(angle) * 130,
      y: center.y + Math.sin(angle) * 130
    };
  });
}

function buildEdges(contactNodes, conceptNodesList, focusedId) {
  const edges = [];
  contactNodes.forEach((contact) => {
    conceptNodesList.forEach((concept) => {
      const linked =
        (concept.kind === "tag" && contact.tags?.includes(concept.label)) ||
        (concept.kind === "source" && contact.sourceOrigin === concept.label) ||
        (concept.kind === "ddd" && (contact.derivedDdd === concept.raw || contact.derivedDdds?.includes(concept.raw))) ||
        (concept.kind === "organization" && contact.company === concept.label);

      if (linked) {
        edges.push({ id: `edge:${contact.id}:${concept.id}`, source: contact, target: concept, type: concept.kind, active: !focusedId || contact.id === focusedId });
      }
    });
  });

  contactNodes.forEach((source) => {
    contactNodes.forEach((target) => {
      if (source.id === target.id || !source.currentDemand || !target.problemSolved) return;
      if (normalize(target.problemSolved).includes(normalize(source.currentDemand).split(" ")[0])) {
        edges.push({ id: `edge:${source.id}:match:${target.id}`, source, target, type: "POTENCIAL_MATCH", active: !focusedId || source.id === focusedId || target.id === focusedId });
      }
    });
  });

  return edges;
}

function buildGraphData(contacts, focusedId, manualPositions) {
  const contactNodes = buildContactNodes(contacts, focusedId, manualPositions);
  const conceptNodesList = conceptNodes(contacts);
  const edges = buildEdges(contactNodes, conceptNodesList, focusedId);

  return {
    nodes: [...contactNodes, ...conceptNodesList],
    contactNodes,
    conceptNodes: conceptNodesList,
    edges
  };
}

export function ConnectionGraph({ contacts, selected, setSelected, onCreateContact }) {
  const [filters, setFilters] = useState({
    context: "internal",
    tag: "",
    source: "",
    ddd: "",
    scope: "",
    search: "",
    minimumScore: 45,
    hasDemand: false,
    hasProblemSolved: false,
    linkedOnly: false
  });
  const [focusedId, setFocusedId] = useState(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragState, setDragState] = useState(null);
  const [manualPositions, setManualPositions] = useState({});

  const tags = useMemo(() => uniq(contacts.flatMap((contact) => contact.tags || [])), [contacts]);
  const sources = useMemo(() => uniq(contacts.map((contact) => contact.sourceOrigin)), [contacts]);
  const ddds = useMemo(() => uniq(contacts.flatMap(contactDdds)), [contacts]);
  const visibleContacts = useMemo(() => filterContacts(contacts, filters), [contacts, filters]);
  const graphData = useMemo(() => buildGraphData(visibleContacts, focusedId, manualPositions), [visibleContacts, focusedId, manualPositions]);
  const contactNodes = graphData.contactNodes;
  const conceptNodesList = graphData.conceptNodes;
  const edges = graphData.edges;
  const introductionPath = useMemo(() => {
    if (!selected || contactNodes.length < 2) return [];
    const source = contactNodes.find((node) => node.id === selected.id);
    const bridge = contactNodes.find((node) => node.id !== selected.id && node.tags?.some((tag) => selected.tags?.includes(tag)));
    const target = contactNodes.find((node) => node.id !== selected.id && node.id !== bridge?.id);
    return [source, bridge, target].filter(Boolean);
  }, [contactNodes, selected]);

  function clampZoom(value) {
    return Math.min(1.8, Math.max(0.62, value));
  }

  function zoomBy(delta) {
    setViewport((current) => ({ ...current, zoom: clampZoom(current.zoom + delta) }));
  }

  function resetGraphView() {
    setViewport({ x: 0, y: 0, zoom: 1 });
    setManualPositions({});
  }

  function handleGraphPointerMove(event) {
    if (!dragState) return;
    const dx = event.clientX - dragState.clientX;
    const dy = event.clientY - dragState.clientY;

    if (dragState.type === "pan") {
      setViewport((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
    } else if (dragState.type === "node") {
      setManualPositions((current) => {
        const previous = current[dragState.id] || dragState.start;
        return {
          ...current,
          [dragState.id]: {
            x: Math.min(graphWidth - 60, Math.max(60, previous.x + dx / viewport.zoom)),
            y: Math.min(graphHeight - 60, Math.max(60, previous.y + dy / viewport.zoom))
          }
        };
      });
    }

    setDragState((current) => current && { ...current, clientX: event.clientX, clientY: event.clientY });
  }

  const layerStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: "0 0"
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-black/20 p-1">
          {[
            ["internal", "Interno"],
            ["public", "Público/Grupos"]
          ].map(([value, label]) => (
            <button key={value} onClick={() => setFilters((current) => ({ ...current, context: value }))} className={`h-9 rounded-md px-3 text-xs font-black uppercase tracking-[0.12em] ${filters.context === value ? "bg-mint text-ink" : "text-slate-300 hover:bg-white/8"}`}>
              {label}
            </button>
          ))}
        </div>

        <label className="flex min-w-56 items-center gap-3 rounded-lg border border-line bg-black/20 px-3 py-2 text-xs font-bold text-slate-300">
          <SlidersHorizontal size={16} className="text-cyan" />
          Relevância
          <input type="range" min="0" max="90" value={filters.minimumScore} onChange={(event) => setFilters((current) => ({ ...current, minimumScore: Number(event.target.value) }))} className="accent-mint" />
          <span className="tabular-nums text-white">{filters.minimumScore}</span>
        </label>
      </div>

      <div className="grid gap-3 rounded-lg border border-line bg-black/20 p-3 lg:grid-cols-4">
        <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white outline-none focus:border-mint/50" placeholder="Nome, descrição ou problema" />
        <select value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
          <option value="">Todas as tags</option>
          {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
          <option value="">Todas as fontes</option>
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
        <select value={filters.ddd} onChange={(event) => setFilters((current) => ({ ...current, ddd: event.target.value }))} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
          <option value="">Todos os DDDs</option>
          {ddds.map((ddd) => <option key={ddd} value={ddd}>DDD {ddd}</option>)}
        </select>
        <select value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value }))} className="h-10 rounded-lg border border-line bg-black/25 px-3 text-sm text-white">
          <option value="">Todos os escopos</option>
          <option value="INTERNAL_PRIVATE">Interno</option>
          <option value="GROUP_CONTACT">Grupo</option>
          <option value="PUBLIC_PLATFORM_PROFILE">Público</option>
        </select>
        {[
          ["hasDemand", "Demandas"],
          ["hasProblemSolved", "Resolve"],
          ["linkedOnly", "Usuários reais"]
        ].map(([key, label]) => (
          <label key={key} className="flex h-10 items-center gap-2 rounded-lg border border-line bg-black/25 px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
            <input type="checkbox" checked={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.checked }))} className="accent-mint" />
            {label}
          </label>
        ))}
      </div>

      <div
        className="relative min-h-[540px] touch-none overflow-hidden rounded-lg border border-line bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] sm:min-h-[430px]"
        onWheel={(event) => {
          event.preventDefault();
          zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          setDragState({ type: "pan", clientX: event.clientX, clientY: event.clientY });
        }}
        onPointerMove={handleGraphPointerMove}
        onPointerUp={() => setDragState(null)}
        onPointerLeave={() => setDragState(null)}
      >
        <div className="absolute right-4 top-4 z-20 flex gap-2 rounded-lg border border-line bg-ink/82 p-2 backdrop-blur-xl">
          <button onClick={() => zoomBy(-0.12)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-slate-300 hover:text-white" aria-label="Reduzir zoom"><Minus size={15} /></button>
          <button onClick={() => zoomBy(0.12)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-slate-300 hover:text-white" aria-label="Aumentar zoom"><Plus size={15} /></button>
          <button onClick={resetGraphView} className="grid h-8 w-8 place-items-center rounded-md border border-line text-slate-300 hover:text-white" aria-label="Resetar grafo"><RotateCcw size={15} /></button>
        </div>

        <div className="absolute inset-0" style={layerStyle}>
          <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="graphCore">
                <stop offset="0%" stopColor="#61d7f4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#49d6a8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={center.x} cy={center.y} r="178" fill="url(#graphCore)" />
            <circle cx={center.x} cy={center.y} r="74" fill="rgba(73,214,168,0.1)" stroke="rgba(73,214,168,0.28)" />
            {edges.map((edge, index) => (
              <line key={`${edge.source.id}-${edge.target.id}-${index}`} x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} stroke={edge.type === "POTENCIAL_MATCH" ? "#f6c66d" : edge.target.color || "#61d7f4"} strokeWidth={edge.type === "POTENCIAL_MATCH" ? 3 : 1.6} strokeDasharray={edge.type === "POTENCIAL_MATCH" ? "8 8" : "0"} strokeLinecap="round" opacity={edge.active ? 0.78 : 0.12} />
            ))}
          </svg>

          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-mint/40 bg-ink/80 text-center shadow-glow sm:h-24 sm:w-24">
            <div>
              {filters.context === "internal" ? <GitBranch className="mx-auto text-mint" size={22} /> : <Globe2 className="mx-auto text-cyan" size={22} />}
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{filters.context === "internal" ? "Você" : "Rede"}</p>
            </div>
          </div>

          {conceptNodesList.map((node) => {
            const Icon = node.Icon;
            return (
              <div key={node.id} className="absolute grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink/75 p-2 text-center shadow-glow" style={{ left: `${(node.x / graphWidth) * 100}%`, top: `${(node.y / graphHeight) * 100}%` }} title={node.label}>
                <Icon size={16} style={{ color: node.color }} />
                <span className="line-clamp-2 text-[10px] font-black leading-3 text-white">{node.label}</span>
              </div>
            );
          })}

          {contactNodes.map((contact) => {
            const status = temperature(contact);
            const isLinked = contact.linkedUserId || contact.recordScopes?.includes("PUBLIC_PLATFORM_PROFILE") || contact.recordScopes?.includes("GROUP_CONTACT");
            return (
              <button
                key={contact.id}
                onClick={() => setSelected(contact)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setDragState({ type: "node", id: contact.id, start: { x: contact.x, y: contact.y }, clientX: event.clientX, clientY: event.clientY });
                }}
                onMouseEnter={() => setFocusedId(contact.id)}
                onMouseLeave={() => setFocusedId(null)}
                className={`absolute grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-ink/85 p-2 text-center shadow-glow outline-none transition hover:scale-105 sm:h-24 sm:w-24 ${selected?.id === contact.id ? "border-mint ring-4 ring-mint/20" : "border-white/15"} ${status.ring} ${contact.faded ? "opacity-35" : "opacity-100"} ${isLinked ? "animate-pulse" : ""}`}
                style={{ left: `${(contact.x / graphWidth) * 100}%`, top: `${(contact.y / graphHeight) * 100}%` }}
                title={`${contact.name} - ${status.label}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-ink sm:h-12 sm:w-12" style={{ backgroundColor: status.color }}>{initials(contact.name)}</span>
                <span className="line-clamp-2 text-[11px] font-black leading-3 text-white">{contact.name}</span>
                {isLinked && <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-cyan shadow-glow" />}
              </button>
            );
          })}
        </div>

        {!contactNodes.length && (
          <div className="pointer-events-none absolute left-1/2 top-[calc(50%+4.75rem)] z-10 w-full max-w-sm -translate-x-1/2 px-6 text-center text-sm font-semibold leading-6 text-slate-400">
            Nenhum contato passa pelos filtros atuais.
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink/82 p-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Route size={16} className="text-amber" />
            {introductionPath.length >= 3 ? `${introductionPath[0].name} -> ${introductionPath[1].name} -> ${introductionPath[2].name}` : "Arraste o canvas, mova nós, use zoom e clique para ver detalhes."}
          </div>
          <button onClick={onCreateContact} className="h-9 rounded-lg bg-mint px-3 text-xs font-black text-ink hover:bg-cyan">Novo contato</button>
        </div>
      </div>
    </div>
  );
}
