import OpenAI from "openai";
import { env } from "../../config/env.js";
import { listInteractions } from "../interactions/interactions.repository.js";

const client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

function compactContactForChat(contact) {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role || "",
    company: contact.company || "",
    area: contact.area || "",
    tags: contact.tags || [],
    problemSolved: contact.problemSolved || contact.problem_solved || "",
    currentDemand: contact.currentDemand || contact.current_demand || "",
    description: contact.description || "",
    proximity: contact.proximity,
    sourceOrigin: contact.sourceOrigin || contact.source_origin || ""
  };
}

function fallbackCopilotResponse(prompt, contextContacts = [], intent = "search_contacts") {
  if (!contextContacts.length) {
    return {
      text: "Nao encontrei contatos com sinais suficientes na sua base local para responder com seguranca. Tente mencionar o problema, area, servico, tag ou empresa.",
      provider: "local_fallback"
    };
  }

  const [first, ...rest] = contextContacts;
  const others = rest.slice(0, 2).map((contact) => contact.name).filter(Boolean);
  const reason =
    first.problemSolved || first.description || first.currentDemand || first.tags?.join(", ") || "tem sinais relacionados ao que voce perguntou";

  return {
    text: `Pelo contexto local, ${first.name} parece ser a conexao mais forte para "${prompt}". O principal sinal e: ${reason}.${others.length ? ` Tambem vale revisar ${others.join(" e ")}.` : ""} ${intent === "propose_tag_update" ? "Posso preparar essa alteracao como uma acao sugerida para aprovacao." : "Sugiro abrir o contato e validar as notas antes de acionar."}`,
    provider: "local_fallback"
  };
}

function fallbackIntelligence(contact, contactInteractions) {
  const daysSinceInteraction = contact.lastInteractionAt
    ? Math.max(0, Math.round((Date.now() - new Date(contact.lastInteractionAt).getTime()) / 86400000))
    : 30;
  const recencyScore = Math.max(0, 100 - daysSinceInteraction * 3);
  const volumeScore = Math.min(100, contactInteractions.length * 18);
  const score = Math.round(contact.proximity * 0.5 + recencyScore * 0.3 + volumeScore * 0.2);

  return {
    relationshipScore: score,
    nextAction:
      score >= 85
        ? "Convide para uma conversa estrategica esta semana."
        : "Reative a conexao com uma mensagem curta e contextual.",
    followUp: `Enviar follow-up sobre ${contact.area || "oportunidades profissionais"} com uma pergunta objetiva.`,
    message: `Oi ${contact.name.split(" ")[0]}, lembrei da nossa conversa sobre ${contact.area || "novas oportunidades"}. Tenho uma ideia que pode fazer sentido para ${contact.company || "sua operacao"}. Podemos falar esta semana?`,
    summary: `${contact.name} tem proximidade ${contact.proximity}/100, ${contactInteractions.length} interacoes registradas e deve receber uma acao de relacionamento em breve.`,
    insights: [
      "Contato com potencial de relacionamento recorrente.",
      daysSinceInteraction > 10 ? "A janela de reconexao esta aberta." : "Interacao recente ainda esta quente.",
      contact.tags?.length ? `Tags relevantes: ${contact.tags.join(", ")}.` : "Adicionar tags melhoraria a segmentacao."
    ]
  };
}

function normalizeIntelligence(payload, fallback) {
  return {
    relationshipScore: Number(payload.relationshipScore || payload.score || fallback.relationshipScore),
    nextAction: payload.nextAction || fallback.nextAction,
    followUp: payload.followUp || fallback.followUp,
    message: payload.message || fallback.message,
    summary: payload.summary || fallback.summary,
    insights: Array.isArray(payload.insights) ? payload.insights : fallback.insights
  };
}

export async function generateConnectionIntelligence(contact) {
  const contactInteractions = await listInteractions(contact.id);
  const fallback = fallbackIntelligence(contact, contactInteractions);

  if (!client) return { ...fallback, provider: "demo" };

  const prompt = {
    contact,
    interactions: contactInteractions.slice(0, 8),
    requiredOutput: {
      relationshipScore: "integer 0-100",
      nextAction: "short recommended action",
      followUp: "follow-up suggestion",
      message: "personalized professional message in Portuguese",
      summary: "smart relationship summary",
      insights: ["3 concise insights"]
    }
  };

  const response = await client.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "You are Connection Intelligence, an executive networking copilot. Return only valid JSON. Be specific, concise, ethical and useful for professional relationship management."
      },
      {
        role: "user",
        content: JSON.stringify(prompt)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "connection_intelligence",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            relationshipScore: { type: "integer", minimum: 0, maximum: 100 },
            nextAction: { type: "string" },
            followUp: { type: "string" },
            message: { type: "string" },
            summary: { type: "string" },
            insights: { type: "array", items: { type: "string" } }
          },
          required: ["relationshipScore", "nextAction", "followUp", "message", "summary", "insights"]
        }
      }
    }
  });

  const text = response.output_text || "{}";
  const parsed = JSON.parse(text);
  return { ...normalizeIntelligence(parsed, fallback), provider: "openai" };
}

export async function generateCopilotChatResponse({ prompt, contextContacts = [], intent = "search_contacts" }) {
  const safePrompt = String(prompt || "").trim();
  const compactContacts = contextContacts.slice(0, 6).map(compactContactForChat);
  const fallback = fallbackCopilotResponse(safePrompt, compactContacts, intent);

  if (!client || !safePrompt) return fallback;

  const response = await client.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "Voce e o Copilot do Reconnect AI, um assistente executivo de networking. Responda em portugues do Brasil, com base apenas nos contatos fornecidos como contexto. Seja claro, util, etico e nao invente dados. Se o contexto for insuficiente, diga isso objetivamente."
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt: safePrompt,
          intent,
          contextContacts: compactContacts,
          instructions:
            "Sintetize a melhor resposta para o usuario. Cite nomes relevantes, explique o motivo da recomendacao e sugira um proximo passo curto. Nao exponha dados sensiveis alem do que for necessario."
        })
      }
    ]
  });

  return {
    text: response.output_text || fallback.text,
    provider: "openai"
  };
}
