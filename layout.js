import { logout, user } from './auth.js';
import { get } from './api.js';

const FALLBACK_NAME = 'Eventful Desk';

// VIKTIGT: Menyn renderas omedelbart. Inget API-anrop får blockera navigeringen.
export function mount(active) {
  const currentUser = user();
  const cachedName = sessionStorage.getItem('eventfulSystemName') || FALLBACK_NAME;

  const links = [
    ['index.html', 'Dashboard', 'fa-chart-line'],
    ['tickets.html', 'Ärenden', 'fa-ticket'],
    ['customers.html', 'Kunder', 'fa-building'],
    ['agents.html', 'Agenter', 'fa-users'],
    ['kb.html', 'Kunskapsbas', 'fa-book'],
    ['reports.html', 'Rapporter', 'fa-chart-column'],
    ['surveys.html', 'Kundundersökningar', 'fa-star'],
    ['categories.html', 'Klassificering', 'fa-tags'],
    ['settings.html', 'Inställningar', 'fa-gear']
  ];

  // Skydda mot dubbel meny vid hot reload/återanrop.
  document.getElementById('deskSidebar')?.remove();
  document.getElementById('menuToggle')?.remove();

  document.body.insertAdjacentHTML('afterbegin', `
    <button id="menuToggle" class="menu" type="button" aria-label="Öppna meny">
      <i class="fa fa-bars"></i>
    </button>
    <aside id="deskSidebar" class="sidebar">
      <div class="brand">
        <small>SUPPORT MANAGEMENT</small>
        <h2 id="sidebarSystemName">${escapeHtml(cachedName)}</h2>
      </div>
      <nav class="nav">
        ${links.map(([href, label, icon]) => `
          <a href="${href}" class="${active === href ? 'active' : ''}">
            <i class="fa ${icon}"></i>${label}
          </a>
        `).join('')}
      </nav>
      <button id="logoutButton" class="logout" type="button">
        Logga ut${currentUser?.name ? ' · ' + escapeHtml(currentUser.name) : ''}
      </button>
    </aside>
  `);

  const menuButton = document.getElementById('menuToggle');
  const sidebar = document.getElementById('deskSidebar');
  const logoutButton = document.getElementById('logoutButton');

  menuButton?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  logoutButton?.addEventListener('click', () => {
    if (window.confirm('Vill du logga ut?')) logout();
  });

  setPageTitle(cachedName);

  // Hämta namnet i bakgrunden. Menyn är redan renderad och påverkas inte om API:t är långsamt.
  refreshSystemName().catch(error => {
    console.warn('Kunde inte uppdatera systemnamnet i bakgrunden.', error);
  });
}

async function refreshSystemName() {
  const settings = await withTimeout(get('/api/settings'), 3000);
  const name = String(
    settings?.systemName || settings?.helpdeskName || settings?.portalTitle || ''
  ).trim();
  if (!name) return;

  sessionStorage.setItem('eventfulSystemName', name);
  const nameElement = document.getElementById('sidebarSystemName');
  if (nameElement) nameElement.textContent = name;
  setPageTitle(name);
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout när systemnamnet hämtades')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function setPageTitle(systemName) {
  const title = document.title || 'Eventful Desk';
  const pageName = title.includes(' - ') ? title.split(' - ')[0] : title;
  document.title = `${pageName} - ${systemName}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
