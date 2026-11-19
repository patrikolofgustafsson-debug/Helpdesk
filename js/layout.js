import { logout, user } from './auth.js';
import { get } from './api.js';

const FALLBACK_NAME = 'Eventful Desk';

export async function mount(active) {
  const currentUser = user();
  const systemName = await loadSystemName();

  // Uppdatera sidtiteln utan att vara beroende av vilket namn som stod där tidigare.
  const pageName = document.title.includes(' - ')
    ? document.title.split(' - ')[0]
    : document.title;
  document.title = `${pageName} - ${systemName}`;

  const links = [
    ['index.html', 'Dashboard', 'fa-chart-line'],
    ['tickets.html', 'Ärenden', 'fa-ticket'],
    ['customers.html', 'Kunder', 'fa-building'],
    ['agents.html', 'Agenter', 'fa-users'],
    ['kb.html', 'Kunskapsbas', 'fa-book'],
    ['reports.html', 'Rapporter', 'fa-chart-column'],
    ['categories.html', 'Klassificering', 'fa-tags'],
    ['settings.html', 'Inställningar', 'fa-gear']
  ];

  document.body.insertAdjacentHTML('afterbegin', `
    <button id="menuToggle" class="menu" type="button" aria-label="Öppna meny">
      <i class="fa fa-bars"></i>
    </button>
    <aside id="deskSidebar" class="sidebar">
      <div class="brand">
        <small>SUPPORT MANAGEMENT</small>
        <h2 id="sidebarSystemName">${escapeHtml(systemName)}</h2>
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
}

async function loadSystemName() {
  try {
    const settings = await get('/api/settings');
    const name = String(
      settings?.systemName ||
      settings?.helpdeskName ||
      settings?.portalTitle ||
      ''
    ).trim();
    if (name) return name;
  } catch (error) {
    console.warn('Kunde inte hämta systemnamn från /api/settings', error);
  }
  return FALLBACK_NAME;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
