import { ArrowRight, BrainCircuit, KeyRound, Mail, Network, ShieldCheck, Sparkles, User, UserPlus, UsersRound } from "lucide-react";

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPasswordStrong(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function AuthPanel({ mode, setMode, form, setForm, onSubmit, onOAuth, onPasswordReset, submitting = false }) {
  const isRegister = mode === "register";
  const emailHasError = form.email.length > 0 && !isEmailValid(form.email);
  const passwordHasError = form.password.length > 0 && isRegister && !isPasswordStrong(form.password);

  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(73,214,168,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(97,215,244,0.12),transparent_34%),linear-gradient(145deg,#080b12,#101622_52%,#080b12)]" />
      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-bold text-mint">
            <Sparkles size={16} />
            Intelligent Network OS
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] text-white sm:text-6xl">
            Sua rede de contatos, com inteligencia de verdade.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Organize contatos, descubra oportunidades, visualize conexoes em grafo e use um copiloto para encontrar quem resolve cada problema na sua rede.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {[
              ["CRM pessoal", "Historico, notas e demandas privadas.", UsersRound],
              ["Grupos compartilhados", "Hubs seguros para comunidades.", ShieldCheck],
              ["Visualizacao em grafo", "Constelacao de pessoas, tags e DDDs.", Network],
              ["Assistente de IA", "Busca contextual preparada para copiloto.", BrainCircuit]
            ].map(([title, text, Icon]) => (
              <div key={title} className="rounded-lg border border-line bg-white/[0.04] p-4">
                <Icon className="text-mint" size={18} />
                <h3 className="mt-3 text-sm font-black text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-mint/15 text-mint">
              {isRegister ? <UserPlus /> : <KeyRound />}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Acesso seguro</p>
              <h2 className="text-2xl font-black text-white">{isRegister ? "Criar conta" : "Entrar"}</h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg border border-line bg-black/25 p-1">
            {[
              ["login", "Entrar"],
              ["register", "Criar conta"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                disabled={submitting}
                className={`h-10 rounded-md text-sm font-black transition ${
                  mode === value ? "bg-mint text-ink shadow-glow" : "text-slate-400 hover:bg-white/8 hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {label}
              </button>
            ))}
          </div>

          {isRegister && (
            <label className="mt-5 block text-sm font-semibold text-slate-300">
              Nome
              <div className="relative mt-2">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="h-12 w-full rounded-lg border border-line bg-black/25 pl-10 pr-4 text-white outline-none focus:border-mint/50"
                  placeholder="Seu nome"
                  autoComplete="name"
                  required={isRegister}
                  disabled={submitting}
                />
              </div>
            </label>
          )}

          <label className="mt-5 block text-sm font-semibold text-slate-300">
            E-mail
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="h-12 w-full rounded-lg border border-line bg-black/25 pl-10 pr-4 text-white outline-none focus:border-mint/50"
                placeholder="voce@empresa.com"
                type="email"
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>
            {emailHasError && <span className="mt-2 block text-xs font-semibold text-amber">Informe um e-mail valido.</span>}
          </label>

          <label className="mt-5 block text-sm font-semibold text-slate-300">
            Senha
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              type="password"
              className="mt-2 h-12 w-full rounded-lg border border-line bg-black/25 px-4 text-white outline-none focus:border-mint/50"
              placeholder="********"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : 1}
              required
              disabled={submitting}
            />
            {isRegister && (
              <span className={`mt-2 block text-xs font-semibold ${passwordHasError ? "text-amber" : "text-slate-500"}`}>
                Use no minimo 8 caracteres, com letras e numeros.
              </span>
            )}
          </label>

          {!isRegister && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onPasswordReset?.(form.email)}
                disabled={submitting || emailHasError || !form.email}
                className="text-sm font-bold text-cyan transition hover:text-mint disabled:cursor-not-allowed disabled:text-slate-500"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => onOAuth?.("google")}
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.04] px-4 text-sm font-black text-white transition hover:border-cyan/50 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continuar com Google
            </button>
          </div>

          <button disabled={submitting} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-mint px-5 text-sm font-black text-ink transition hover:bg-cyan disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? "Aguarde..." : isRegister ? "Cadastrar" : "Entrar"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

export function PasswordRecoveryPanel({ form, setForm, onSubmit, submitting = false }) {
  const passwordHasError = form.password.length > 0 && !isPasswordStrong(form.password);
  const confirmationHasError = form.confirmPassword.length > 0 && form.confirmPassword !== form.password;

  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(73,214,168,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(97,215,244,0.12),transparent_34%),linear-gradient(145deg,#080b12,#101622_52%,#080b12)]" />
      <section className="relative mx-auto grid min-h-screen max-w-xl items-center px-5 py-10">
        <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-mint/15 text-mint">
              <KeyRound />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Recuperacao segura</p>
              <h2 className="text-2xl font-black text-white">Criar nova senha</h2>
            </div>
          </div>

          <label className="mt-6 block text-sm font-semibold text-slate-300">
            Nova senha
            <input
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              type="password"
              className="mt-2 h-12 w-full rounded-lg border border-line bg-black/25 px-4 text-white outline-none focus:border-mint/50"
              placeholder="********"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={submitting}
            />
            <span className={`mt-2 block text-xs font-semibold ${passwordHasError ? "text-amber" : "text-slate-500"}`}>
              Use no minimo 8 caracteres, com letras e numeros.
            </span>
          </label>

          <label className="mt-5 block text-sm font-semibold text-slate-300">
            Confirmar senha
            <input
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              type="password"
              className="mt-2 h-12 w-full rounded-lg border border-line bg-black/25 px-4 text-white outline-none focus:border-mint/50"
              placeholder="********"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={submitting}
            />
            {confirmationHasError && <span className="mt-2 block text-xs font-semibold text-amber">As senhas precisam ser iguais.</span>}
          </label>

          <button disabled={submitting || passwordHasError || confirmationHasError} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-mint px-5 text-sm font-black text-ink transition hover:bg-cyan disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? "Salvando..." : "Atualizar senha"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
