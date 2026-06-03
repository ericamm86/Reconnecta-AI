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
      contact.problemSolved,
      contact.currentDemand,
      contact.company,
      contact.role,
      contact.area,
      contact.tags?.join(" "),
      contact.internalNotes
    ]
      .filter(Boolean)
      .join(" ")
  );
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
  const intent = inferIntent(prompt);
  const tokens = tokensFromPrompt(prompt);
  const action = intent === "propose_tag_update" ? parseTagIntent(prompt, contacts) : null;

  const results = contacts
    .map((contact) => {
      const haystack = contactHaystack(contact);
      const matches = tokens.filter((token) => haystack.includes(token));
      const tagBoost = contact.tags?.some((tag) => tokens.includes(normalize(tag))) ? 2 : 0;
      const problemBoost = tokens.some((token) => normalize(contact.problemSolved || "").includes(token)) ? 2 : 0;
      const score = matches.length + tagBoost + problemBoost;
      return { contact, score, matchedTerms: matches };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    intent,
    query: prompt,
    tokens,
    summary: results.length
      ? `Encontrei ${results.length} contato${results.length === 1 ? "" : "s"} com sinais relevantes na sua rede.`
      : "Nao encontrei correspondencias diretas na base local.",
    results,
    action
  };
}
