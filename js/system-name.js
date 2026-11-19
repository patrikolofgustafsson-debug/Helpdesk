import { get } from './api.js';

const CACHE_KEY = 'eventfulDesk.systemName';
const FALLBACK_NAME = 'Eventful Desk';
const MAX_NAME_LENGTH = 80;

const PAGE_TITLES = Object.freeze({
  'index.html': 'Dashboard',
  'tickets.html': 'Ärenden',
  'ticket.html': 'Ärende',
  'customers.html': 'Kunder',
  'agents.html': 'Agenter',
  'kb.html': 'Kunskapsbas',
  'reports.html': 'Rapporter',
  'categories.html': 'Klassificering',
  'settings.html': 'Inställningar',
  'automations.html': 'Automatiska regler',
  'trash.html': 'Papperskorg'
});

const BRAND_SELECTORS = [
  '[data-system-name]',
  '.sidebar-brand-title',
  '.sidebar .brand',
  '.kb-brand',
  '.app-brand',
  '.brand-name',
  'aside div',
  'aside p',
  'aside h1',
  'aside h2',
  'aside strong'
].join(',');

const LEGACY_NAME = /^eventful\s*desk(?:\s*v?2)?$/i;

let currentName = readCachedName() || FALLBACK_NAME;
let observer;
let mutationQueued = false;

function cleanName(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

function readCachedName() {
  try {
    return cleanName(localStorage.getItem(CACHE_KEY));
  } catch {
    return '';
  }
}

function writeCachedName(name) {
  try {
    localStorage.setItem(CACHE_KEY, name);
  } catch {
    // The UI still works if browser storage is unavailable.
  }
}

function unwrapSettings(payload) {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.settings && typeof payload.settings === 'object') return payload.settings;
  if (payload.data && typeof payload.data === 'object') {
    if (payload.data.settings && typeof payload.data.settings === 'object') return payload.data.settings;
    return payload.data;
  }
  return payload;
}

function extractSystemName(payload) {
  const settings = unwrapSettings(payload);
  return cleanName(
    settings.systemName ??
    settings.system_name ??
    settings.helpdeskName ??
    settings.helpdesk_name ??
    ''
  );
}

function normalizedText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isNameNode(node, previousName) {
  if (!(node instanceof Element)) return false;
  if (node.hasAttribute('data-system-name')) return true;

  const text = normalizedText(node);
  if (!text) return false;
  if (LEGACY_NAME.test(text)) return true;

  const previous = cleanName(previousName);
  return Boolean(previous) && text.localeCompare(previous, 'sv', { sensitivity: 'accent' }) === 0;
}

function replaceWithStackedText(node, name) {
  const words = name.split(' ').filter(Boolean);
  const fragment = document.createDocumentFragment();

  words.forEach((word, index) => {
    if (index) fragment.append(document.createElement('br'));
    fragment.append(document.createTextNode(word.toLocaleUpperCase('sv-SE')));
  });

  node.replaceChildren(fragment);
}

function setBrandText(node, name) {
  const stacked = node.hasAttribute('data-system-name-stacked') ||
    node.classList.contains('sidebar-brand-title') ||
    node.classList.contains('kb-brand') ||
    node.querySelector('br');

  if (stacked) replaceWithStackedText(node, name);
  else node.textContent = name.toLocaleUpperCase('sv-SE');

  node.setAttribute('data-system-name', '');
  node.setAttribute('aria-label', name);
}

function updateBrandNodes(root, name, previousName) {
  const nodes = [];

  if (root instanceof Element && root.matches(BRAND_SELECTORS)) nodes.push(root);
  if (root?.querySelectorAll) nodes.push(...root.querySelectorAll(BRAND_SELECTORS));

  for (const node of new Set(nodes)) {
    if (!isNameNode(node, previousName)) continue;
    if (normalizedText(node).localeCompare(name, 'sv', { sensitivity: 'accent' }) === 0 &&
        node.hasAttribute('data-system-name')) continue;
    setBrandText(node, name);
  }
}

function pageLabel() {
  const fileName = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (PAGE_TITLES[fileName]) return PAGE_TITLES[fileName];

  const explicit = cleanName(document.documentElement.dataset.pageTitle || '');
  if (explicit) return explicit;

  const currentTitle = cleanName(document.title);
  const match = currentTitle.match(/^(.*?)\s+(?:-|·|\|)\s+.+$/);
  return cleanName(match?.[1] || currentTitle) || 'Support';
}

function updateDocumentTitle(name) {
  const nextTitle = `${pageLabel()} - ${name}`;
  if (document.title !== nextTitle) document.title = nextTitle;
}

function applyName(name, { cache = true, announce = true } = {}) {
  const nextName = cleanName(name) || FALLBACK_NAME;
  const previousName = currentName;
  currentName = nextName;

  if (cache) writeCachedName(nextName);
  updateBrandNodes(document, nextName, previousName);
  updateDocumentTitle(nextName);

  if (announce) {
    document.dispatchEvent(new CustomEvent('eventfuldesk:system-name-changed', {
      detail: { systemName: nextName }
    }));
  }

  return nextName;
}

async function refreshSystemName() {
  try {
    const payload = await get('/api/settings');
    const fetchedName = extractSystemName(payload);
    if (fetchedName) return applyName(fetchedName);
  } catch (error) {
    console.warn('Systemnamnet kunde inte hämtas. Senast sparade namn används.', error);
  }

  return applyName(readCachedName() || currentName || FALLBACK_NAME, {
    cache: false,
    announce: false
  });
}

function observeDynamicLayouts() {
  observer?.disconnect();
  observer = new MutationObserver((mutations) => {
    if (mutationQueued) return;
    if (!mutations.some((mutation) => mutation.addedNodes.length)) return;

    mutationQueued = true;
    queueMicrotask(() => {
      mutationQueued = false;
      updateBrandNodes(document, currentName, currentName);
      updateDocumentTitle(currentName);
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function handleStorage(event) {
  if (event.key !== CACHE_KEY) return;
  const name = cleanName(event.newValue || '');
  if (name) applyName(name, { cache: false });
}

function boot() {
  applyName(currentName, { cache: false, announce: false });
  observeDynamicLayouts();
  window.addEventListener('storage', handleStorage);
  void refreshSystemName();
}

window.EventfulDeskSystemName = Object.freeze({
  getName: () => currentName,
  setName: (name) => applyName(name),
  refresh: refreshSystemName
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { applyName, extractSystemName, refreshSystemName };
