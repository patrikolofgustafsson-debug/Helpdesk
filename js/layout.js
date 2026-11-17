import { logout, user } from './auth.js';
import { get } from './api.js';
export async function mount(active){
  const u=user();let systemName='Eventful Desk';
  try{const s=await get('/api/settings');systemName=(s.systemName||systemName).trim()||systemName}catch{}
  document.title=document.title.replace(/Eventful Desk/g,systemName);
  const links=[['index.html','Dashboard','fa-chart-line'],['tickets.html','Ärenden','fa-ticket'],['customers.html','Kunder','fa-building'],['agents.html','Agenter','fa-users'],['kb.html','Kunskapsbas','fa-book'],['reports.html','Rapporter','fa-chart-column'],['categories.html','Klassificering','fa-tags'],['settings.html','Inställningar','fa-gear']];
  document.body.insertAdjacentHTML('afterbegin',`<button id="menuToggle" class="menu"><i class="fa fa-bars"></i></button><aside id="deskSidebar" class="sidebar"><div class="brand"><small>SUPPORT MANAGEMENT</small><h2>${escapeHtml(systemName)}</h2></div><nav class="nav">${links.map(([h,l,i])=>`<a href="${h}" class="${active===h?'active':''}"><i class="fa ${i}"></i>${l}</a>`).join('')}</nav><button id="logoutButton" class="logout">Logga ut${u?' · '+escapeHtml(u.name):''}</button></aside>`);
  const menu=document.getElementById('menuToggle'),side=document.getElementById('deskSidebar'),out=document.getElementById('logoutButton');if(menu&&side)menu.onclick=()=>side.classList.toggle('open');if(out)out.onclick=()=>{if(confirm('Vill du logga ut?'))logout()};
}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
