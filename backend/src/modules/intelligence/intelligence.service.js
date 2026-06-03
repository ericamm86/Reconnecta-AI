import OpenAI from "openai";
import { env } from "../../config/env.js";
import { listInteractions } from "../interactions/interactions.repository.js";

const client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

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
