export const fallbackContacts = [
  {
    id: "c-aurora",
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
    socialLinks: { linkedin: "https://linkedin.com/in/joaomartins", whatsapp: "https://wa.me/5511988880101" },
    currentDemand: "Busca pilotos de IA aplicados a operacoes comerciais.",
    problemSolved: "Valida integracoes produto-mercado em SaaS B2B.",
    internalNotes: "Priorizar abordagem consultiva.",
    recordScopes: ["INTERNAL_PRIVATE"],
    linkedUserId: null,
    customValues: { senioridade: "executivo", prioridade: true },
    hasMergeSuggestion: false,
    lastInteractionAt: "2026-05-28T14:30:00.000Z"
  },
  {
    id: "c-nova",
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
    socialLinks: { linkedin: "https://linkedin.com/in/marinalopes", instagram: "https://instagram.com/marinalopes" },
    currentDemand: "Parcerias de co-marketing.",
    problemSolved: "Automatiza processos internos com agentes de IA.",
    internalNotes: "Aguardar resposta sobre proposta.",
    recordScopes: ["INTERNAL_PRIVATE", "PUBLIC_PLATFORM_PROFILE"],
    linkedUserId: "profile-marina",
    customValues: { senioridade: "founder", prioridade: false },
    hasMergeSuggestion: true,
    lastInteractionAt: "2026-05-21T18:10:00.000Z"
  },
  {
    id: "c-pulse",
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
    customValues: { senioridade: "partner", prioridade: true },
    hasMergeSuggestion: false,
    lastInteractionAt: "2026-05-12T11:00:00.000Z"
  }
];

export const fallbackDashboard = {
  totalConnections: 3,
  activeConnections: 2,
  averageScore: 74,
  latestInteractions: [
    {
      id: "i-1",
      contactId: "c-aurora",
      type: "call",
      summary: "Conversa sobre integracoes de IA em fluxos comerciais.",
      notesMarkdown: "Falamos sobre **automacao de relacionamento** e pilotos em Q3.",
      occurredAt: "2026-05-28T14:30:00.000Z"
    }
  ],
  recommendations: [
    {
      contactId: "c-aurora",
      contactName: "Joao Martins",
      relationshipScore: 92,
      nextAction: "Recomenda-se reconectar nesta semana com uma proposta de piloto."
    }
  ]
};
