const STOP_WORDS = new Set([
  "quem",
  "meus",
  "minha",
  "minhas",
  "dentre",
  "contatos",
  "contato",
  "rede",
  "resolve",
  "resolvem",
  "problema",
  "problemas",
  "presta",
  "servico",
  "serviço",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "para",
  "em",
  "na",
  "no",
  "a",
  "o",
  "e"
]);

function normalize(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordRegex(token) {
  return new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
}

function contactValue(contact, camelKey, snakeKey = camelKey) {
  return contact[camelKey] ?? contact[snakeKey];
}

function tokensFromPrompt(prompt) {
  const tokens = normalize(prompt)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  return [
    ...new Set(
      tokens.flatMap((token) => {
        const variants = [token];
        if (token.endsWith("es")) variants.push(token.slice(0, -2), `${token.slice(0, -2)}or`);
        if (token.endsWith("s")) variants.push(token.slice(0, -1));
        return variants.filter((item) => item.length > 2);
      })
    )
  ];
}

function contactHaystack(contact) {
  return normalize(
    [
      contact.name,
      contact.description,
      contactValue(contact, "problemSolved", "problem_solved"),
      contactValue(contact, "currentDemand", "current_demand"),
      contact.company,
      contact.role,
      contact.area,
      contact.tags?.join(" "),
      contactValue(contact, "internalNotes", "internal_notes")
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function matchedFieldsForToken(contact, token) {
  const fields = [
    ["name", contact.name],
    ["description", contact.description],
    ["problem_solved", contactValue(contact, "problemSolved", "problem_solved")],
    ["current_demand", contactValue(contact, "currentDemand", "current_demand")],
    ["company", contact.company],
    ["role", contact.role],
    ["area", contact.area],
    ["tags", contact.tags?.join(" ")],
    ["internal_notes", contactValue(contact, "internalNotes", "internal_notes")]
  ];
  const regex = wordRegex(token);
  return fields.filter(([, value]) => regex.test(normalize(value || ""))).map(([field]) => field);
}

function inferIntent(prompt) {
  const value = normalize(prompt);
  if (value.includes("adicion") && value.includes("tag")) return "propose_tag_update";
  if (value.includes("resolve") || value.includes("problema")) return "find_problem_solver";
  if (value.includes("presta") || value.includes("servico")) return "find_service_provider";
  return "search_contacts";
}

function parseTagIntent(prompt, contacts) {
  const tagMatch = prompt.match(/tag\s+['"]?([^'"]+)['"]?/i);
  const contact = contacts.find((item) => normalize(prompt).includes(normalize(item.name)));
  if (!tagMatch || !contact) return null;
  return {
    type: "contact.add_tag",
    label: `Adicionar tag "${tagMatch[1].trim()}" a ${contact.name}`,
    payload: {
      contactId: contact.id,
      tag: tagMatch[1].trim()
    }
  };
}

export function searchContactsFromPrompt(prompt, contacts) {
  const cleanedPrompt = prompt.toLowerCase().trim();
  const intent = inferIntent(cleanedPrompt);
  const tokens = tokensFromPrompt(cleanedPrompt);
  const action = intent === "propose_tag_update" ? parseTagIntent(prompt, contacts) : null;

  if (tokens.length === 0) {
    return {
      intent,
      query: prompt,
      tokens,
      summary: "Prompt sem termos de busca validos.",
      results: [],
      action
    };
  }

  const results = contacts
    .map((contact) => {
      const haystack = contactHaystack(contact);
      let score = 0;
      const matchedTerms = [];
      const matchedFields = new Set();

      tokens.forEach((token) => {
        const regex = wordRegex(token);
        if (!regex.test(haystack)) return;

        score += 1;
        matchedTerms.push(token);
        matchedFieldsForToken(contact, token).forEach((field) => matchedFields.add(field));

        const isTagMatch = contact.tags?.some((tag) => normalize(tag) === token);
        if (isTagMatch) score += 2;

        const problemSolved = normalize(contactValue(contact, "problemSolved", "problem_solved") || "");
        if (regex.test(problemSolved)) score += 3;
      });

      return {
        contact,
        score,
        matchedTerms,
        metadata: {
          source: "local_contacts",
          matchedFields: [...matchedFields],
          contactId: contact.id
        }
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    intent,
    query: prompt,
    tokens,
    summary: results.length
      ? `Identifiquei ${results.length} ${results.length === 1 ? "conexao altamente qualificada" : "conexoes altamente qualificadas"} na sua constelacao para esta demanda.`
      : "Nao encontrei correspondencias exatas para os criterios informados na base local.",
    results,
    action
  };
}
