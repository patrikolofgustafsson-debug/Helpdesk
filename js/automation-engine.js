const TEXT_FIELDS = new Set([
  "subject", "description", "status", "priority", "service", "category",
  "assignedAgentId", "assignedAgentName", "customerId", "customerName", "tags",
  "event", "changedField", "actorRole"
]);

const NUMBER_FIELDS = new Set(["ageHours", "inactiveHours"]);

export const TRIGGERS = [
  { value: "ticket.created", label: "När ett ärende skapas" },
  { value: "ticket.updated", label: "När ett ärende uppdateras" },
  { value: "reply.customer", label: "När kunden svarar" },
  { value: "reply.agent", label: "När en agent svarar" },
  { value: "schedule.hourly", label: "Varje timme" },
  { value: "manual", label: "Endast manuell körning" }
];

export const CONDITION_FIELDS = [
  ["status", "Status"], ["priority", "Prioritet"], ["service", "Tjänst"],
  ["category", "Kategori"], ["assignedAgentId", "Tilldelad agent"],
  ["subject", "Ämne"], ["description", "Beskrivning"],
  ["customerName", "Kundnamn"], ["tags", "Taggar"],
  ["ageHours", "Ärendets ålder (timmar)"], ["inactiveHours", "Tid utan aktivitet (timmar)"],
  ["changedField", "Ändrat fält"], ["actorRole", "Utförarens roll"]
].map(([value, label]) => ({ value, label }));

export const OPERATORS = [
  ["equals", "är lika med"], ["not_equals", "är inte lika med"],
  ["contains", "innehåller"], ["not_contains", "innehåller inte"],
  ["starts_with", "börjar med"], ["in", "är något av (kommaseparerat)"],
  ["empty", "är tomt"], ["not_empty", "är inte tomt"],
  ["greater_than", "är större än"], ["less_than", "är mindre än"]
].map(([value, label]) => ({ value, label }));

export const ACTIONS = [
  ["set_status", "Sätt status"], ["set_priority", "Sätt prioritet"],
  ["assign_agent", "Tilldela agent"], ["unassign_agent", "Ta bort tilldelning"],
  ["set_service", "Sätt tjänst"], ["set_category", "Sätt kategori"],
  ["add_tag", "Lägg till tagg"], ["remove_tag", "Ta bort tagg"],
  ["add_internal_note", "Lägg till intern anteckning"]
].map(([value, label]) => ({ value, label }));

export function normalizeRule(rule = {}, index = 0) {
  const now = new Date().toISOString();
  return {
    id: String(rule.id || `rule-${Date.now()}-${index}`),
    name: String(rule.name || "Ny regel").trim(),
    description: String(rule.description || "").trim(),
    enabled: rule.enabled !== false,
    order: Number.isFinite(Number(rule.order)) ? Number(rule.order) : index + 1,
    trigger: String(rule.trigger || "ticket.created"),
    match: rule.match === "any" ? "any" : "all",
    conditions: Array.isArray(rule.conditions) ? rule.conditions.map((c, i) => ({
      id: String(c.id || `condition-${i + 1}`),
      field: String(c.field || "status"),
      operator: String(c.operator || "equals"),
      value: c.value == null ? "" : String(c.value)
    })) : [],
    actions: Array.isArray(rule.actions) ? rule.actions.map((a, i) => ({
      id: String(a.id || `action-${i + 1}`),
      type: String(a.type || "set_status"),
      value: a.value == null ? "" : String(a.value),
      label: a.label == null ? "" : String(a.label)
    })) : [],
    stopProcessing: Boolean(rule.stopProcessing),
    createdAt: String(rule.createdAt || now),
    updatedAt: String(rule.updatedAt || now)
  };
}

export function validateRule(input) {
  const rule = normalizeRule(input);
  const errors = [];
  if (!rule.name) errors.push("Regeln måste ha ett namn.");
  if (!TRIGGERS.some(x => x.value === rule.trigger)) errors.push("Ogiltig utlösare.");
  if (!rule.actions.length) errors.push("Regeln måste ha minst en åtgärd.");
  for (const condition of rule.conditions) {
    if (![...TEXT_FIELDS, ...NUMBER_FIELDS].includes(condition.field)) errors.push(`Ogiltigt villkorsfält: ${condition.field}.`);
    if (!OPERATORS.some(x => x.value === condition.operator)) errors.push(`Ogiltig operator: ${condition.operator}.`);
    if (!["empty", "not_empty"].includes(condition.operator) && condition.value === "") {
      errors.push("Alla villkor måste ha ett värde, utom 'är tomt' och 'är inte tomt'.");
    }
  }
  for (const action of rule.actions) {
    if (!ACTIONS.some(x => x.value === action.type)) errors.push(`Ogiltig åtgärd: ${action.type}.`);
    if (!actionValueOptional(action.type) && !action.value.trim()) errors.push(`Åtgärden '${action.type}' saknar värde.`);
  }
  return { valid: errors.length === 0, errors, rule };
}

export function actionValueOptional(type) {
  return type === "unassign_agent";
}

export function getFieldValue(ticket, field, context = {}) {
  const now = context.now ? new Date(context.now) : new Date();
  if (field === "event") return context.event || "";
  if (field === "changedField") return context.changedField || "";
  if (field === "actorRole") return context.actor?.role || "";
  if (field === "ageHours") return hoursBetween(ticket.createdAt, now);
  if (field === "inactiveHours") return hoursBetween(ticket.updatedAt || ticket.createdAt, now);
  if (field === "tags") return Array.isArray(ticket.tags) ? ticket.tags : splitList(ticket.tags);
  return ticket[field] ?? "";
}

function hoursBetween(value, now) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / 3600000) : 0;
}

function splitList(value) {
  return String(value || "").split(",").map(x => x.trim()).filter(Boolean);
}

function folded(value) {
  return String(value ?? "").trim().toLocaleLowerCase("sv-SE");
}

export function evaluateCondition(condition, ticket, context = {}) {
  const actual = getFieldValue(ticket, condition.field, context);
  const expected = condition.value ?? "";
  const values = Array.isArray(actual) ? actual : [actual];
  const asText = values.map(folded);
  const needle = folded(expected);
  switch (condition.operator) {
    case "equals": return asText.some(x => x === needle);
    case "not_equals": return asText.every(x => x !== needle);
    case "contains": return asText.some(x => x.includes(needle));
    case "not_contains": return asText.every(x => !x.includes(needle));
    case "starts_with": return asText.some(x => x.startsWith(needle));
    case "in": {
      const accepted = splitList(expected).map(folded);
      return asText.some(x => accepted.includes(x));
    }
    case "empty": return values.length === 0 || values.every(x => folded(x) === "");
    case "not_empty": return values.some(x => folded(x) !== "");
    case "greater_than": return Number(actual) > Number(expected);
    case "less_than": return Number(actual) < Number(expected);
    default: return false;
  }
}

export function evaluateRule(ruleInput, ticket, context = {}) {
  const rule = normalizeRule(ruleInput);
  if (!rule.enabled) return { matched: false, results: [], reason: "disabled" };
  if (context.event && rule.trigger !== context.event && !(context.event === "manual" && context.forceRule)) {
    return { matched: false, results: [], reason: "trigger" };
  }
  const results = rule.conditions.map(condition => ({
    condition,
    matched: evaluateCondition(condition, ticket, context)
  }));
  const matched = !results.length || (rule.match === "any"
    ? results.some(result => result.matched)
    : results.every(result => result.matched));
  return { matched, results, reason: matched ? "matched" : "conditions" };
}

export function simulateRules(rules, ticket, context = {}) {
  const ordered = (rules || []).map(normalizeRule).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "sv"));
  const working = structuredCloneSafe(ticket);
  const matches = [];
  for (const rule of ordered) {
    const evaluation = evaluateRule(rule, working, context);
    if (!evaluation.matched) continue;
    const changes = rule.actions.map(action => previewAction(action, working)).filter(Boolean);
    matches.push({ rule, evaluation, changes });
    if (rule.stopProcessing) break;
  }
  return { matches, matchedCount: matches.length };
}

export function previewAction(action, ticket) {
  const value = action.value;
  switch (action.type) {
    case "set_status": return { field: "status", from: ticket.status || "", to: value };
    case "set_priority": return { field: "priority", from: ticket.priority || "", to: value };
    case "assign_agent": return { field: "assignedAgentId", from: ticket.assignedAgentId || "", to: value, label: action.label || value };
    case "unassign_agent": return { field: "assignedAgentId", from: ticket.assignedAgentId || "", to: "", label: "Ej tilldelad" };
    case "set_service": return { field: "service", from: ticket.service || "", to: value };
    case "set_category": return { field: "category", from: ticket.category || "", to: value };
    case "add_tag": return { field: "tags", from: (ticket.tags || []).join?.(", ") || "", to: `+ ${value}` };
    case "remove_tag": return { field: "tags", from: (ticket.tags || []).join?.(", ") || "", to: `− ${value}` };
    case "add_internal_note": return { field: "internalNotes", from: "", to: value };
    default: return null;
  }
}

function structuredCloneSafe(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
