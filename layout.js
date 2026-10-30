import { logout, user } from './auth.js';

export function mount(active) {
  const currentUser = user();
  const links = [
    ['index.html', 'Dashboard', 'fa-chart-line'],
    ['tickets.html', 'Ärenden', 'fa-ticket'],
    ['customers.html', 'Kunder', 'fa-building'],
    ['agents.html', 'Agenter', 'fa-users'],
    ['kb.html', 'Kunskapsbas', 'fa-book'],
    ['reports.html', 'Rapporter', 'fa-chart-column'],
    ['settings.html', 'Inställningar', 'fa-gear']
  ];

  document.body.insertAdjacentHTML('afterbegin', `
    <button id="menuToggle" class="menu"><i class="fa fa-bars"></i></button>
    <aside id="deskSidebar" class="sidebar">
      <div class="brand">
        <small>SUPPORT MANAGEMENT</small>
        <h2>Eventful Desk v2</h2>
      </div>
      <nav class="nav">
        ${links.map(([href, label, icon]) => `
          <a href="${href}" class="${active === href ? 'active' : ''}">
            <i class="fa ${icon}"></i>${label}
          </a>
        `).join('')}
      </nav>
      <button id="logoutButton" class="logout">
        Logga ut${currentUser ? ' · ' + currentUser.name : ''}
      </button>
    </aside>
  `);

  const menuButton = document.getElementById('menuToggle');
  const sidebar = document.getElementById('deskSidebar');
  const logoutButton = document.getElementById('logoutButton');

  if (menuButton && sidebar) {
    menuButton.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      if (window.confirm('Vill du logga ut?')) {
        logout();
      }
    });
  }
}
