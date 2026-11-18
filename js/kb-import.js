import { get, post, put, remove } from "./kb-api.js";
import { articleList, basename, escapeHtml, isPublicArticle, normalizeArticle, plainText, sanitizeHtml } from "./kb-core.js";

const $ = selector => document.querySelector(selector);
const state = { articles: [], editingId: "", dirty: false };
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const elements = {
  grid: $("#articleGrid"), empty: $("#emptyState"), status: $("#listStatus"),
  search: $("#searchInput"), categoryFilter: $("#categoryFilter"), visibilityFilter: $("#visibilityFilter"),
  dialog: $("#editorDialog"), form: $("#articleForm"), heading: $("#editorHeading"),
  title: $("#titleInput"), category: $("#categoryInput"), categoryList: $("#categoryList"), public: $("#publicInput"), editor: $("#contentEditor"),
  docInput: $("#documentInput"), dropZone: $("#dropZone"), progress: $("#importProgress"), progressText: $("#importProgressText"), notice: $("#importNotice"),
  save: $("#saveArticleBtn"), delete: $("#deleteArticleBtn"), toast: $("#toast"),
  words: $("#wordCount"), size: $("#contentSize"),
  reader: $("#readerDialog"), readerTitle: $("#readerTitle"), readerCategory: $("#readerCategory"), readerVisibility: $("#readerVisibility"), readerContent: $("#readerContent")
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
}

function showNotice(message = "", type = "success") {
  elements.notice.textContent = message;
  elements.notice.className = message ? `notice ${type}` : "notice hidden";
}

function setBusy(busy, message = "Läser dokument…") {
  elements.progressText.textContent = message;
  elements.progress.classList.toggle("hidden", !busy);
  elements.save.disabled = busy;
}

function updateEditorMeta() {
  const text = plainText(elements.editor.innerHTML);
  const words = text ? text.split(/\s+/).length : 0;
  const bytes = new Blob([elements.editor.innerHTML]).size;
  elements.words.textContent = `${words} ord`;
  elements.size.textContent = `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
  state.dirty = true;
}

function refreshCategories() {
  const categories = [...new Set(state.articles.map(article => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
  elements.categoryFilter.innerHTML = `<option value="">Alla kategorier</option>${categories.map(c => `<option>${escapeHtml(c)}</option>`).join("")}`;
  elements.categoryList.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}"></option>`).join("");
}

function filteredArticles() {
  const query = elements.search.value.trim().toLocaleLowerCase("sv");
  const category = elements.categoryFilter.value;
  const visibility = elements.visibilityFilter.value;
  return state.articles.filter(article => {
    const searchable = `${article.title} ${article.category} ${plainText(article.content)}`.toLocaleLowerCase("sv");
    return (!query || searchable.includes(query)) && (!category || article.category === category) &&
      (!visibility || (visibility === "public") === isPublicArticle(article));
  }).sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function card(article) {
  const visibility = isPublicArticle(article) ? "public" : "internal";
  const label = visibility === "public" ? "Publik" : "Intern";
  const excerpt = plainText(article.content).slice(0, 220) || "Artikeln saknar innehåll.";
  return `<article class="article-card" data-id="${escapeHtml(article.id)}">
    <div class="card-top"><span class="category">${escapeHtml(article.category)}</span><span class="badge ${visibility}">${label}</span></div>
    <h3>${escapeHtml(article.title)}</h3><p class="excerpt">${escapeHtml(excerpt)}</p>
    <div class="card-actions"><button class="text-button" type="button" data-action="read">Läs</button><button class="text-button" type="button" data-action="edit">Redigera</button></div>
  </article>`;
}

function render() {
  const articles = filteredArticles();
  elements.grid.innerHTML = articles.map(card).join("");
  elements.empty.classList.toggle("hidden", articles.length > 0);
  elements.status.textContent = `${articles.length} av ${state.articles.length} artiklar visas`;
}

async function loadArticles() {
  elements.status.textContent = "Läser in artiklar…";
  try {
    const payload = await get("/api/kb");
    state.articles = articleList(payload).map(normalizeArticle);
    refreshCategories();
    render();
  } catch (error) {
    elements.status.textContent = `Kunde inte läsa artiklar: ${error.message}`;
    elements.empty.classList.remove("hidden");
  }
}

function resetEditor(article = null) {
  state.editingId = article?.id || "";
  elements.heading.textContent = article ? "Redigera artikel" : "Ny artikel";
  elements.title.value = article?.title || "";
  elements.category.value = article?.category || "";
  elements.public.checked = article ? isPublicArticle(article) : false;
  elements.editor.innerHTML = article ? sanitizeHtml(article.content) : "";
  elements.delete.classList.toggle("hidden", !article);
  elements.docInput.value = "";
  showNotice();
  state.dirty = false;
  updateEditorMeta();
  state.dirty = false;
}

function openEditor(article = null) {
  resetEditor(article);
  elements.dialog.showModal();
  setTimeout(() => elements.title.focus(), 0);
}

function closeEditor(force = false) {
  if (!force && state.dirty && !confirm("Du har osparade ändringar. Vill du stänga ändå?")) return;
  elements.dialog.close();
  state.dirty = false;
}

function openReader(article) {
  elements.readerCategory.textContent = article.category;
  elements.readerTitle.textContent = article.title;
  elements.readerVisibility.innerHTML = isPublicArticle(article) ? `<span class="badge public">Publik</span>` : `<span class="badge internal">Intern</span>`;
  elements.readerContent.innerHTML = sanitizeHtml(article.content);
  elements.reader.showModal();
}

async function saveArticle(event) {
  event.preventDefault();
  const title = elements.title.value.trim();
  const content = sanitizeHtml(elements.editor.innerHTML);
  if (!title) { elements.title.focus(); showToast("Rubrik måste fyllas i."); return; }
  if (!plainText(content)) { elements.editor.focus(); showToast("Artikeln måste ha innehåll."); return; }
  const previous = state.articles.find(article => article.id === state.editingId) || {};
  const now = new Date().toISOString();
  const payload = {
    ...previous,
    title,
    category: elements.category.value.trim() || "Övrigt",
    content,
    isPublic: elements.public.checked,
    public: elements.public.checked,
    visibility: elements.public.checked ? "public" : "internal",
    createdAt: previous.createdAt || now,
    updatedAt: now
  };
  elements.save.disabled = true;
  try {
    if (state.editingId) await put(`/api/kb/${encodeURIComponent(state.editingId)}`, payload);
    else await post("/api/kb", payload);
    state.dirty = false;
    elements.dialog.close();
    await loadArticles();
    showToast(elements.public.checked ? "Artikeln är sparad och publik." : "Artikeln är sparad internt.");
  } catch (error) { showToast(`Kunde inte spara: ${error.message}`); }
  finally { elements.save.disabled = false; }
}

async function deleteArticle() {
  if (!state.editingId || !confirm("Vill du ta bort artikeln permanent?")) return;
  elements.delete.disabled = true;
  try {
    await remove(`/api/kb/${encodeURIComponent(state.editingId)}`);
    state.articles = state.articles.filter(article => article.id !== state.editingId);
    state.dirty = false; elements.dialog.close(); refreshCategories(); render(); showToast("Artikeln är borttagen.");
  } catch (error) { showToast(`Kunde inte ta bort: ${error.message}`); }
  finally { elements.delete.disabled = false; }
}

async function importDocx(file) {
  if (!window.mammoth) throw new Error("DOCX-biblioteket kunde inte laddas.");
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.convertToHtml({ arrayBuffer }, {
    includeDefaultStyleMap: true,
    convertImage: window.mammoth.images.imgElement(image => image.read("base64").then(data => ({ src: `data:${image.contentType};base64,${data}` })))
  });
  return { html: sanitizeHtml(result.value), title: basename(file.name), warnings: result.messages.map(message => message.message) };
}

function groupPdfLines(items) {
  const lines = [];
  items.forEach(item => {
    const text = String(item.str || "").trim();
    if (!text) return;
    const x = item.transform?.[4] || 0;
    const y = item.transform?.[5] || 0;
    let line = lines.find(candidate => Math.abs(candidate.y - y) < 3);
    if (!line) { line = { y, items: [] }; lines.push(line); }
    line.items.push({ x, text });
  });
  return lines.sort((a, b) => b.y - a.y).map(line => line.items.sort((a, b) => a.x - b.x).map(item => item.text).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

async function importPdf(file) {
  if (!window.pdfjsLib) throw new Error("PDF-biblioteket kunde inte laddas.");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const parts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    setBusy(true, `Läser PDF-sida ${pageNumber} av ${pdf.numPages}…`);
    const page = await pdf.getPage(pageNumber);
    const lines = groupPdfLines((await page.getTextContent()).items);
    if (lines.length) parts.push(`<h2>Sida ${pageNumber}</h2>${lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}`);
  }
  let metadataTitle = "";
  try { metadataTitle = (await pdf.getMetadata()).info?.Title || ""; } catch (_) { /* Metadata is optional. */ }
  const html = sanitizeHtml(parts.join(""));
  const warning = plainText(html).length < 40 ? ["Nästan ingen text hittades. Dokumentet kan vara skannat och behöver då OCR."] : [];
  return { html, title: metadataTitle || basename(file.name), warnings: warning };
}

async function importDocument(file) {
  if (!file) return;
  if (file.size > MAX_DOCUMENT_BYTES) { showNotice("Filen är större än 20 MB.", "error"); return; }
  const extension = file.name.split(".").pop().toLowerCase();
  if (!["docx", "pdf"].includes(extension)) { showNotice("Välj en fil i formatet DOCX eller PDF.", "error"); return; }
  setBusy(true, `Läser ${file.name}…`); showNotice();
  try {
    const result = extension === "docx" ? await importDocx(file) : await importPdf(file);
    if (!plainText(result.html)) throw new Error("Dokumentet innehöll ingen läsbar text.");
    elements.title.value = elements.title.value.trim() || result.title;
    elements.category.value = elements.category.value.trim() || "Importerad";
    elements.editor.innerHTML = result.html;
    updateEditorMeta();
    const sizeKb = new Blob([result.html]).size / 1024;
    const messages = [`${file.name} importerades (${Math.round(sizeKb)} KB artikelinnehåll).`];
    if (sizeKb > 750) messages.push("Artikeln är stor. Inbäddade bilder kan göra sparningen långsammare.");
    messages.push(...result.warnings);
    showNotice(messages.join("\n"), result.warnings.length || sizeKb > 750 ? "warning" : "success");
  } catch (error) { showNotice(`Importen misslyckades: ${error.message}`, "error"); }
  finally { setBusy(false); }
}

function insertLink() {
  const url = prompt("Länkadress, till exempel https://example.com");
  if (!url) return;
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) { showToast("Använd en fullständig http-, https- eller mailto-adress."); return; }
  document.execCommand("createLink", false, url);
  state.dirty = true;
}

function insertImage(file) {
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) { showToast("Bilden får vara högst 4 MB."); return; }
  const reader = new FileReader();
  reader.onload = () => { document.execCommand("insertImage", false, reader.result); updateEditorMeta(); };
  reader.readAsDataURL(file);
}

$("#newArticleBtn").addEventListener("click", () => openEditor());
$("#closeEditorBtn").addEventListener("click", () => closeEditor());
$("#cancelEditorBtn").addEventListener("click", () => closeEditor());
$("#closeReaderBtn").addEventListener("click", () => elements.reader.close());
$("#chooseDocumentBtn").addEventListener("click", () => elements.docInput.click());
elements.docInput.addEventListener("change", event => importDocument(event.target.files[0]));
elements.dropZone.addEventListener("click", () => elements.docInput.click());
elements.dropZone.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); elements.docInput.click(); } });
["dragenter", "dragover"].forEach(name => elements.dropZone.addEventListener(name, event => { event.preventDefault(); elements.dropZone.classList.add("dragging"); }));
["dragleave", "drop"].forEach(name => elements.dropZone.addEventListener(name, event => { event.preventDefault(); elements.dropZone.classList.remove("dragging"); }));
elements.dropZone.addEventListener("drop", event => importDocument(event.dataTransfer.files[0]));
elements.form.addEventListener("submit", saveArticle);
elements.delete.addEventListener("click", deleteArticle);
[elements.search, elements.categoryFilter, elements.visibilityFilter].forEach(element => element.addEventListener(element.tagName === "INPUT" ? "input" : "change", render));
elements.grid.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const article = state.articles.find(item => item.id === button.closest("[data-id]").dataset.id); if (!article) return;
  button.dataset.action === "edit" ? openEditor(article) : openReader(article);
});
$("#editorToolbar").addEventListener("click", event => {
  const button = event.target.closest("button[data-command]"); if (!button) return;
  elements.editor.focus(); document.execCommand(button.dataset.command, false, button.dataset.value || null); updateEditorMeta();
});
$("#linkBtn").addEventListener("click", insertLink);
$("#imageBtn").addEventListener("click", () => $("#imageInput").click());
$("#imageInput").addEventListener("change", event => insertImage(event.target.files[0]));
[elements.title, elements.category, elements.public].forEach(element => element.addEventListener("input", () => { state.dirty = true; }));
elements.editor.addEventListener("input", updateEditorMeta);
elements.dialog.addEventListener("cancel", event => { if (state.dirty && !confirm("Du har osparade ändringar. Vill du stänga ändå?")) event.preventDefault(); else state.dirty = false; });
window.addEventListener("beforeunload", event => { if (state.dirty && elements.dialog.open) { event.preventDefault(); event.returnValue = ""; } });

loadArticles();
