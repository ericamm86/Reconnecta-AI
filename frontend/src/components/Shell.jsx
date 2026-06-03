import { Bell, BrainCircuit, Command, Network, Plus, Search, ShieldCheck } from "lucide-react";

export function Shell({ children, query, setQuery, session, onLogout, onCreateContact }) {
  const navItems = [
    ["Inicio", "#onboarding", Command],
    ["Painel", "#command-center", Command],
    ["Contatos", "#contacts-workspace", Network],
    ["Grafo", "#network-graph", Network],
    ["IA", "#connection-intelligence", BrainCircuit],
    ["Chat", "#copilot-chat", BrainCircuit],
    ["Acesso", "#trust-layer", ShieldCheck],
    ["UX", "#product-architecture", Command]
  ];

  return (
    <div className="min-h-screen bg-ink pb-24 text-slate-100 lg:pb-0">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(73,214,168,0.16),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(97,215,244,0.12),transparent_30%),linear-gradient(180deg,#080b12,#0b0f18_44%,#080b12)]" />
      <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-line bg-black/20 px-5 py-6 backdrop-blur-xl lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-mint/30 bg-mint/10 text-mint shadow-glow">
            <Network size={23} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">Nexus Loom</p>
            <h1 className="text-lg font-black leading-5 text-white">Reconnect AI</h1>
          </div>
        </div>

        <nav className="mt-10 grid gap-2 text-sm font-semibold text-slate-300">
          {navItems.map(([label, href, Icon]) => (
            <a key={label} href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/8 hover:text-white">
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>

        <div id="trust-layer" className="absolute bottom-6 left-5 right-5 rounded-lg border border-line bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace</p>
          <p className="mt-2 text-sm font-bold text-white">{session?.user?.email || "usuario@reconnect.ai"}</p>
          <button onClick={onLogout} className="mt-3 text-xs font-bold text-mint transition hover:text-cyan">
            Encerrar sessao
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-line bg-ink/80 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar contatos, empresas, tags ou proximidade..."
                className="h-11 w-full rounded-lg border border-line bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-mint/50 focus:bg-white/[0.07]"
              />
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.04] text-slate-300 transition hover:border-mint/40 hover:text-white">
              <Bell size={18} />
            </button>
          </div>
        </header>
        {children}
      </main>

      <button
        onClick={onCreateContact}
        className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-mint text-ink shadow-glow transition hover:bg-cyan lg:hidden"
        aria-label="Novo contato"
      >
        <Plus size={24} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-line bg-ink/92 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map(([label, href, Icon]) => (
          <a key={label} href={href} className="grid place-items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-black text-slate-400 hover:bg-white/8 hover:text-white">
            <Icon size={19} />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
