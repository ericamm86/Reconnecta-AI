import { Bell, Moon, Network, Plus, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { mainNavItems, secondaryNavItems } from "../lib/navigation";

function currentLocationHash() {
  return window.location.hash || "#dashboard";
}

function isActiveHash(currentHash, href) {
  if (currentHash === href) return true;
  if (href === "#dashboard" && ["", "#command-center", "#network-graph", "#contacts-graph", "#connection-intelligence"].includes(currentHash)) return true;
  if (href === "#contacts" && currentHash === "#contacts-workspace") return true;
  if (href === "#copilot" && currentHash === "#copilot-chat") return true;
  return false;
}

function useCurrentHash() {
  const [currentHash, setCurrentHash] = useState(() => currentLocationHash());

  useEffect(() => {
    function handleHashChange() {
      setCurrentHash(currentLocationHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return currentHash;
}

function BottomNavigation({ currentHash }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-line bg-ink/92 px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-glow backdrop-blur-xl lg:hidden">
      {mainNavItems.map(([label, href, Icon]) => {
        const isActive = isActiveHash(currentHash, href);

        return (
          <a
            key={label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="relative flex min-h-16 flex-col items-center justify-center rounded-lg px-1 pt-2 pb-3 text-[10px] font-bold tracking-wide transition-all duration-200 active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <span className={`grid rounded-xl p-1 transition-all ${isActive ? "text-cyan drop-shadow-[0_0_8px_rgba(97,215,244,0.55)]" : "text-slate-500"}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </span>
            <span className={`mt-0.5 max-w-full truncate transition-colors ${isActive ? "font-black text-slate-100" : "text-slate-500"}`}>
              {label}
            </span>
            {isActive && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-cyan shadow-[0_0_6px_#61d7f4]" />}
          </a>
        );
      })}
    </nav>
  );
}

export function Shell({ children, query, setQuery, session, onLogout, onCreateContact, theme = "dark", onToggleTheme }) {
  const currentHash = useCurrentHash();

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
          {mainNavItems.map(([label, href, Icon]) => {
            const isActive = isActiveHash(currentHash, href);

            return (
              <a
                key={label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-white/8 hover:text-white ${isActive ? "bg-cyan/10 text-white ring-1 ring-cyan/20" : ""}`}
              >
                <Icon className={isActive ? "text-cyan" : ""} size={18} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </a>
            );
          })}
        </nav>

        <nav className="mt-8 grid gap-1 border-t border-line pt-5 text-sm font-semibold text-slate-400">
          {secondaryNavItems.map(([label, href, Icon]) => (
            <a key={label} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-white/8 hover:text-white">
              <Icon size={17} />
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
            <button
              onClick={onToggleTheme}
              className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.04] text-slate-300 transition hover:border-mint/40 hover:text-white"
              aria-label={theme === "dark" ? "Ativar light mode" : "Ativar dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.04] text-slate-300 transition hover:border-mint/40 hover:text-white" aria-label="Notificacoes">
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

      <BottomNavigation currentHash={currentHash} />
    </div>
  );
}
