export const contacts = [
  {
    id: "c-aurora",
    ownerId: "demo-user",
    name: "Joao Martins",
    avatarUrl: "",
    description: "Especialista em produto B2B e comprador potencial de pilotos de IA.",
    email: "joao@orbital.dev",
    emails: ["joao@orbital.dev"],
    phones: ["+55 11 98888-0101"],
    derivedDdd: "11",
    company: "Orbital Dev",
    role: "Head of Product",
    area: "SaaS B2B",
    proximity: 88,
    tags: ["investidor", "produto", "warm"],
    sourceOrigin: "manual",
    socialLinks: { linkedin: "https://linkedin.com/in/joaomartins" },
    currentDemand: "Busca pilotos de IA aplicados a operacoes comerciais.",
    problemSolved: "Ajuda a validar integracoes produto-mercado em SaaS B2B.",
    internalNotes: "Priorizar abordagem consultiva.",
    recordScopes: ["INTERNAL_PRIVATE"],
    linkedUserId: null,
    customValues: { investmentStage: "seed" },
    lastInteractionAt: "2026-05-28T14:30:00.000Z",
    createdAt: "2026-05-04T12:00:00.000Z",
    updatedAt: "2026-05-28T14:30:00.000Z"
  },
  {
    id: "c-nova",
    ownerId: "demo-user",
    name: "Marina Lopes",
    avatarUrl: "",
    description: "Founder com foco em AI Operations e parcerias.",
    email: "marina@northstar.ai",
    emails: ["marina@northstar.ai"],
    phones: ["+55 61 97777-0202"],
    derivedDdd: "61",
    company: "Northstar AI",
    role: "Founder",
    area: "AI Operations",
    proximity: 74,
    tags: ["founder", "ai", "partnership"],
    sourceOrigin: "google_contacts",
    socialLinks: { linkedin: "https://linkedin.com/in/marinalopes" },
    currentDemand: "Parcerias de co-marketing.",
    problemSolved: "Automatiza processos internos com agentes de IA.",
    internalNotes: "Aguardar resposta sobre proposta.",
    recordScopes: ["INTERNAL_PRIVATE", "PUBLIC_PLATFORM_PROFILE"],
    linkedUserId: null,
    customValues: {},
    lastInteractionAt: "2026-05-21T18:10:00.000Z",
    createdAt: "2026-04-18T09:00:00.000Z",
    updatedAt: "2026-05-21T18:10:00.000Z"
  },
  {
    id: "c-pulse",
    ownerId: "demo-user",
    name: "Rafael Chen",
    avatarUrl: "",
    description: "Investidor de venture capital com tese em produtividade.",
    email: "rafael@meshvc.com",
    emails: ["rafael@meshvc.com"],
    phones: ["+55 11 96666-0303"],
    derivedDdd: "11",
    company: "Mesh Ventures",
    role: "Partner",
    area: "Venture Capital",
    proximity: 61,
    tags: ["vc", "capital", "follow-up"],
    sourceOrigin: "csv",
    socialLinks: { linkedin: "https://linkedin.com/in/rafaelchen" },
    currentDemand: "Acompanhar empresas com tracao em IA aplicada.",
    problemSolved: "Conecta capital e go-to-market.",
    internalNotes: "Enviar metricas antes do proximo contato.",
    recordScopes: ["INTERNAL_PRIVATE", "GROUP_CONTACT"],
    linkedUserId: null,
    customValues: {},
    lastInteractionAt: "2026-05-12T11:00:00.000Z",
    createdAt: "2026-03-22T16:00:00.000Z",
    updatedAt: "2026-05-12T11:00:00.000Z"
  }
];

export const interactions = [
  {
    id: "i-1",
    contactId: "c-aurora",
    type: "call",
    occurredAt: "2026-05-28T14:30:00.000Z",
    summary: "Conversa sobre integrações de IA em fluxos comerciais.",
    notesMarkdown: "Falamos sobre **automação de relacionamento** e possíveis pilotos em Q3.",
    sentiment: "positive",
    createdAt: "2026-05-28T14:40:00.000Z"
  },
  {
    id: "i-2",
    contactId: "c-nova",
    type: "meeting",
    occurredAt: "2026-05-21T18:10:00.000Z",
    summary: "Reunião rápida sobre parceria e co-marketing.",
    notesMarkdown: "- Enviar proposta de parceria\n- Apresentar case visual\n- Retomar em duas semanas",
    sentiment: "positive",
    createdAt: "2026-05-21T18:30:00.000Z"
  },
  {
    id: "i-3",
    contactId: "c-pulse",
    type: "email",
    occurredAt: "2026-05-12T11:00:00.000Z",
    summary: "Atualização sobre métricas e tração.",
    notesMarkdown: "Rafael pediu um resumo objetivo de evolução e próximos milestones.",
    sentiment: "neutral",
    createdAt: "2026-05-12T11:10:00.000Z"
  }
];

export const publicProfiles = [
  {
    id: "pp-demo-user",
    ownerId: "demo-user",
    isActive: true,
    displayName: "Equipe Reconnect AI",
    headline: "Network Intelligence CRM",
    bio: "Perfil publico demo para descoberta controlada dentro da rede externa.",
    company: "Reconnect AI",
    location: "Brasil",
    tags: ["crm", "ai", "network"],
    visibility: "network",
    updatedAt: "2026-06-01T12:00:00.000Z"
  }
];

export const sharedGroups = [
  {
    id: "g-investors",
    ownerId: "demo-user",
    name: "Investor Relations",
    description: "Grupo compartilhado para mapear investidores, founders e rotas de introducao.",
    visibility: "private",
    createdAt: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-06-01T12:00:00.000Z"
  }
];

export const groupMembers = [
  {
    id: "gm-demo-owner",
    groupId: "g-investors",
    userId: "demo-user",
    email: "demo@reconnect.ai",
    role: "admin",
    status: "active",
    invitedAt: "2026-05-20T12:00:00.000Z",
    joinedAt: "2026-05-20T12:00:00.000Z"
  },
  {
    id: "gm-demo-member",
    groupId: "g-investors",
    userId: null,
    email: "partner@reconnect.ai",
    role: "member",
    status: "invited",
    invitedAt: "2026-06-01T12:00:00.000Z",
    joinedAt: null
  }
];

export const groupCustomFields = [
  {
    id: "gcf-priority",
    groupId: "g-investors",
    key: "investmentStage",
    label: "Estagio de investimento",
    type: "select",
    options: ["pre-seed", "seed", "series-a"],
    required: false,
    createdAt: "2026-05-20T12:00:00.000Z"
  }
];
