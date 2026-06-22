import { AppWindow, Code, FolderGit, Globe, LayoutDashboard, Settings, Sparkles, User, Users } from "lucide-react";

export const mainNavItems = [
  ["Inicio", "#dashboard", LayoutDashboard],
  ["Contatos", "#contacts", Users],
  ["Grupos", "#groups", FolderGit],
  ["Explorar", "#discover", Globe],
  ["Copilot IA", "#copilot", Sparkles]
];

export const secondaryNavItems = [
  ["Meu Perfil", "#profile", User],
  ["Configurações", "#settings", Settings],
  ["Documentacao API", "#api-docs", Code],
  ["Arquitetura", "#architecture", AppWindow]
];

export const graphContextViews = [
  { id: "private", label: "Minha Rede", hash: "#contacts-graph" },
  { id: "group", label: "Constelação do Grupo", hash: "#group-graph" },
  { id: "public", label: "Rede Pública Mundial", hash: "#public-graph" }
];
