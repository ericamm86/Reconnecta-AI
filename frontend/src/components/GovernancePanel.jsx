import { Building2, CheckCircle2, Globe2, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { enablePushNotifications } from "../lib/push";

const fallbackContext = {
  role: "admin",
  plan: "superior",
  scopes: {
    privateCrm: ["contacts:read", "contacts:write", "interactions:write", "intelligence:run"],
    publicNetwork: ["public_profile:read", "public_profile:write", "directory:read"],
    sharedGroups: ["groups:read", "groups:create", "groups:update", "groups:members:manage", "groups:fields:manage"]
  }
};

const fallbackProfile = {
  isActive: true,
  displayName: "Equipe Reconnect AI",
  avatarUrl: "",
  headline: "Network Intelligence CRM",
  company: "Reconnect AI",
  location: "Brasil",
  tags: ["crm", "ai", "network"],
  problemSolved: "Organiza contatos privados e encontra rotas de relacionamento com IA.",
  currentDemand: "Conectar pessoas certas sem expor a base privada de contatos.",
  socialLinks: {},
  visibility: "network"
};

const fallbackGroups = [
  {
    id: "g-investors",
    name: "Investor Relations",
    description: "Grupo compartilhado para mapear investidores, founders e rotas de introducao.",
    visibility: "private",
    members: [
      { id: "gm-local-owner", email: "usuario@reconnect.ai", role: "admin", status: "active" },
      { id: "gm-demo-member", email: "partner@reconnect.ai", role: "member", status: "invited" }
    ],
    customFields: [{ id: "gcf-priority", label: "Estagio de investimento", type: "select", required: false }]
  }
];

function scopeLabel(scope) {
  return scope.replaceAll(":", " / ");
}

export function GovernancePanel({ onToast }) {
  const [context, setContext] = useState(fallbackContext);
  const [profile, setProfile] = useState(fallbackProfile);
  const [groups, setGroups] = useState(fallbackGroups);
  const [directory, setDirectory] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", visibility: "private" });

  useEffect(() => {
    Promise.all([api.me(), api.publicProfile(), api.groups(), api.directory()])
      .then(([me, publicProfile, groupPayload, directoryPayload]) => {
        setContext(me.data || fallbackContext);
        setProfile(publicProfile.data || fallbackProfile);
        setGroups(groupPayload.data?.length ? groupPayload.data : fallbackGroups);
        setDirectory(directoryPayload.data || []);
      })
      .catch(() => {
        setContext(fallbackContext);
        setProfile(fallbackProfile);
        setGroups(fallbackGroups);
      });
  }, []);

  const matrix = useMemo(
    () => [
      ["Visitante", "Landing e autenticação", "Sem acesso a dados privados"],
      ["Usuário padrão", "CRM privado, perfil público e grupos como membro", "Pode aceitar convites e editar a propria presenca publica"],
      ["Administrador", "Grupos compartilhados, membros e campos customizados", "Controle operacional do plano superior"]
    ],
    []
  );

  async function saveProfile(nextProfile) {
    setProfile(nextProfile);
    try {
      const { data } = await api.updatePublicProfile(nextProfile);
      setProfile(data);
      onToast("Perfil publico atualizado.");
    } catch {
      onToast("Perfil atualizado no modo local.");
    }
  }

  async function createGroup(event) {
    event.preventDefault();
    if (!groupForm.name.trim()) return;

    try {
      const { data } = await api.createGroup(groupForm);
      setGroups((current) => [data, ...current]);
      setGroupForm({ name: "", description: "", visibility: "private" });
      onToast("Grupo compartilhado criado.");
    } catch (error) {
      onToast(error.message || "Apenas administradores podem criar grupos.");
    }
  }

  async function activatePush() {
    try {
      await enablePushNotifications();
      onToast("Notificacoes push ativadas neste dispositivo.");
    } catch (error) {
      onToast(error.message);
    }
  }

  return (
    <section id="trust-layer" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <span id="settings" className="sr-only" />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-line bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-mint/15 text-mint">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-mint">Trust layer</p>
              <h2 className="text-xl font-black text-white">RBAC e isolamento de dados</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {matrix.map(([role, access, note]) => (
              <article key={role} className="rounded-lg border border-line bg-black/15 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-mint" size={18} />
                  <div>
                    <h3 className="font-black text-white">{role}</h3>
                    <p className="mt-1 text-sm text-slate-300">{access}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{note}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Area interna", context.scopes.privateCrm, LockKeyhole],
              ["Rede externa", context.scopes.publicNetwork, Globe2],
              ["Grupos", context.scopes.sharedGroups, UsersRound]
            ].map(([label, scopes, Icon]) => (
              <article key={label} className="rounded-lg border border-line bg-black/15 p-4">
                <Icon className="text-cyan" size={20} />
                <h3 className="mt-3 font-black text-white">{label}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <span key={scope} className="rounded-md bg-white/8 px-2 py-1 text-[11px] font-bold text-slate-300">
                      {scopeLabel(scope)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="discover" className="rounded-xl border border-line bg-white/[0.04] p-5">
          <span id="public-graph" className="sr-only" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-cyan">Public network</p>
              <h2 className="text-xl font-black text-white">Perfil público e grupos</h2>
            </div>
            <span className="rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-mint">
              {context.role} / {context.plan}
            </span>
            <button onClick={activatePush} className="rounded-lg border border-line px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 hover:bg-white/8">
              Push Android
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article id="profile" className="rounded-lg border border-line bg-black/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{profile.displayName}</h3>
                  <p className="mt-1 text-sm text-slate-400">{profile.headline}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
                  Publicar
                  <input
                    type="checkbox"
                    checked={profile.isActive}
                    onChange={(event) => saveProfile({ ...profile, isActive: event.target.checked })}
                    className="h-5 w-5 accent-mint"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-cyan/10 px-2 py-1 text-xs font-bold text-cyan">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-300">
                {profile.company} - {profile.location} - visibilidade {profile.visibility}
              </p>
              {(profile.problemSolved || profile.currentDemand) && (
                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                  {profile.problemSolved && <p><strong className="text-white">Resolve:</strong> {profile.problemSolved}</p>}
                  {profile.currentDemand && <p><strong className="text-white">Busca:</strong> {profile.currentDemand}</p>}
                </div>
              )}
            </article>

            <form onSubmit={createGroup} className="rounded-lg border border-line bg-black/15 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-amber" size={18} />
                <h3 className="font-black text-white">Criar grupo compartilhado</h3>
              </div>
              <input
                value={groupForm.name}
                onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })}
                className="mt-4 h-10 w-full rounded-lg border border-line bg-black/25 px-3 text-sm text-white outline-none focus:border-mint/50"
                placeholder="Nome do grupo"
              />
              <input
                value={groupForm.description}
                onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })}
                className="mt-3 h-10 w-full rounded-lg border border-line bg-black/25 px-3 text-sm text-white outline-none focus:border-mint/50"
                placeholder="Descrição"
              />
              <button className="mt-3 h-10 w-full rounded-lg bg-amber text-sm font-black text-ink transition hover:bg-mint">
                Criar grupo
              </button>
            </form>
          </div>

          <div id="groups" className="mt-4 grid gap-3">
            <span id="group-graph" className="sr-only" />
            {groups.map((group) => (
              <article key={group.id} className="rounded-lg border border-line bg-black/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">{group.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{group.description}</p>
                  </div>
                  <span className="rounded-md bg-white/8 px-2 py-1 text-xs font-bold text-slate-300">{group.visibility}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(group.members || []).map((member) => (
                    <span key={member.id} className="rounded-md bg-mint/10 px-2 py-1 text-xs font-bold text-mint">
                      {member.email} / {member.role} / {member.status}
                    </span>
                  ))}
                  {(group.customFields || []).map((field) => (
                    <span key={field.id} className="rounded-md bg-amber/10 px-2 py-1 text-xs font-bold text-amber">
                      {field.label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {directory.length > 0 && (
            <p className="mt-4 text-xs font-semibold text-slate-500">
              Diretório externo carregado com {directory.length} perfil{directory.length === 1 ? "" : "s"} publico{directory.length === 1 ? "" : "s"}.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
