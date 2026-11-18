import { API_BASE } from "./config.js";
import { articleList, escapeHtml, isPublicArticle, normalizeArticle, plainText, sanitizeHtml } from "./kb-core.js";

const $ = selector => document.querySelector(selector);
const state = { articles: [] };
const elements = {
  grid: $("#publicGrid"), empty: $("#publicEmpty"), status: $("#publicStatus"), search: $("#publicSearch"), category: $("#publicCategory"),
  reader: $("#publicReader"), readerTitle: $("#publicReaderTitle"), readerCategory: $("#publicReaderCategory"), readerContent: $("#publicReaderContent"), title: $("#publicTitle"), brand: $("#publicBrand")
};

function filtered() {
  const query = elements.search.value.trim().toLocaleLowerCase("sv");
  return state.articles.filter(article => (!elements.category.value || article.category === elements.category.value) &&
    (!query || `${article.title} ${article.category} ${plainText(article.content)}`.toLocaleLowerCase("sv").includes(query)));
}

function render() {
  const items = filtered();
  elements.grid.innerHTML = items.map(article => `<article class="article-card" tabindex="0" role="button" data-id="${escapeHtml(article.id)}">
    <div class="card-top"><span class="category">${escapeHtml(article.category)}</span></div>
    <h3>${escapeHtml(article.title)}</h3><p class="excerpt">${escapeHtml(plainText(article.content).slice(0, 220))}</p>
    <div class="card-actions"><span class="text-button">Läs artikel →</span></div></article>`).join("");
  elements.empty.classList.toggle("hidden", items.length > 0);
  elements.status.textContent = `${items.length} publika artiklar`;
}

function openArticle(id) {
  const article = state.articles.find(item => item.id === id); if (!article) return;
  elements.readerCategory.textContent = article.category;
  elements.readerTitle.textContent = article.title;
  elements.readerContent.innerHTML = sanitizeHtml(article.content);
  elements.reader.showModal();
  history.replaceState(null, "", `#artikel=${encodeURIComponent(article.id)}`);
}

async function load() {
  try {
    const response = await fetch(`${String(API_BASE).replace(/\/$/, "")}/api/public/kb`, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    state.articles = articleList(payload).map(normalizeArticle).filter(isPublicArticle);
    const systemName = String(payload.systemName || "").trim();
    if (systemName) {
      document.title = `${systemName} – Supportbanken`;
      elements.title.textContent = systemName;
      elements.brand.textContent = systemName.toUpperCase();
    }
    const categories = [...new Set(state.articles.map(article => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
    elements.category.innerHTML = `<option value="">Alla kategorier</option>${categories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}`;
    render();
    const id = new URLSearchParams(location.hash.replace(/^#/, "")).get("artikel"); if (id) openArticle(id);
  } catch (error) {
    elements.status.textContent = `Kunde inte läsa den publika kunskapsbasen: ${error.message}`;
    elements.empty.classList.remove("hidden");
  }
}

elements.search.addEventListener("input", render);
elements.category.addEventListener("change", render);
elements.grid.addEventListener("click", event => { const card = event.target.closest("[data-id]"); if (card) openArticle(card.dataset.id); });
elements.grid.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { const card = event.target.closest("[data-id]"); if (card) { event.preventDefault(); openArticle(card.dataset.id); } } });
$("#publicReaderClose").addEventListener("click", () => { elements.reader.close(); history.replaceState(null, "", location.pathname + location.search); });
elements.reader.addEventListener("close", () => { if (location.hash) history.replaceState(null, "", location.pathname + location.search); });

load();
