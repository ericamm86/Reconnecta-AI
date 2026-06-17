export enum GraphNodeType {
  Contact = "contact",
  PlatformUser = "platform_user",
  Group = "group",
  Tag = "tag",
  ImportSource = "import_source",
  Ddd = "ddd",
  Demand = "demand",
  ProblemSolved = "problem_solved",
  Organization = "organization"
}

export enum GraphEdgeType {
  HasTag = "POSSUI_TAG",
  ImportedFrom = "IMPORTADO_DE",
  BelongsToGroup = "PERTENCE_A_GRUPO",
  PublicProfileVisible = "PERFIL_PUBLICO_VISIVEL",
  Demand = "DEMANDA",
  Solves = "RESOLVE",
  HasDdd = "TEM_DDD",
  LinkedToUser = "VINCULADO_A_USUARIO",
  PotentialMatch = "POTENCIAL_MATCH",
  WorksAt = "VINCULADO_A_ORGANIZACAO"
}

export type GraphContext = "internal_private" | "public_network" | "shared_group";

export type RecordScope = "INTERNAL_PRIVATE" | "PUBLIC_PLATFORM_PROFILE" | "GROUP_CONTACT";

export interface NetworkGraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  weight?: number;
  contactId?: string;
  userId?: string;
  groupId?: string;
  ddd?: string;
  ddds?: string[];
  score?: number;
  sourceOrigin?: string;
  scope?: RecordScope[];
  metadata?: Record<string, unknown>;
}

export interface NetworkGraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight?: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface NetworkGraphPayload {
  context: GraphContext;
  generatedAt: string;
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}
