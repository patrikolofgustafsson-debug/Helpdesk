export function isPublicArticle(article = {}) {
  return article.isPublic === true || article.public === true || String(article.visibility || "").toLowerCase() === "public";
}

export function articleList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function plainText(html = "") {
  const node = document.createElement("div");
  node.innerHTML = html;
  return (node.textContent || "").replace(/\s+/g, " ").trim();
}

export function escapeHtml(text = "") {
  return String(text).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

export function sanitizeHtml(input = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const forbidden = new Set(["SCRIPT", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "META", "LINK", "BASE", "SVG", "MATH"]);
  doc.body.querySelectorAll("*").forEach(element => {
    if (forbidden.has(element.tagName)) { element.remove(); return; }
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "srcdoc" || name === "style") element.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && /^javascript:/i.test(value)) element.removeAttribute(attribute.name);
      if (name === "src" && /^data:/i.test(value) && !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) element.removeAttribute(attribute.name);
    });
    if (element.tagName === "A") {
      element.setAttribute("rel", "noopener noreferrer");
      if (/^https?:/i.test(element.getAttribute("href") || "")) element.setAttribute("target", "_blank");
    }
  });
  return doc.body.firstElementChild?.innerHTML || "";
}

export function normalizeArticle(article = {}) {
  return {
    ...article,
    id: String(article.id || article.articleId || ""),
    title: String(article.title || "Utan rubrik"),
    category: String(article.category || "Övrigt"),
    content: String(article.content || article.html || ""),
    isPublic: isPublicArticle(article)
  };
}

export function basename(fileName = "") {
  return fileName.replace(/\.(docx|pdf)$/i, "").replace(/[_-]+/g, " ").trim();
}
