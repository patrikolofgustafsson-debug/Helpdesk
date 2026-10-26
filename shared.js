// shared.js - Gemensam motor för menyer och behörighet
function renderSidebar() {
    const user = JSON.parse(localStorage.getItem('loggedUser'));
    if (!user || window.location.href.includes('login.html')) return;

    const sidebar = document.createElement('div');
    sidebar.className = "fixed left-0 top-0 h-full w-64 bg-slate-900 text-white p-8 flex flex-col z-40";
    
    const isAdmin = user.role === 'admin';

    sidebar.innerHTML = `
        <h1 class="text-xl font-black uppercase tracking-tighter mb-12 italic">Eventful Desk</h1>
        <nav class="flex-1 space-y-2">
            <a href="index.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('index') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-chart-pie w-5"></i> Dashboard</a>
            <a href="tickets.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('tickets') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-ticket-alt w-5"></i> Ärenden</a>
            <a href="customers.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('customers') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-users w-5"></i> Kunder</a>
            <a href="kb.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('kb') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-book w-5"></i> Kunskapsbas</a>
            ${isAdmin ? `<a href="agents.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('agents') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-user-shield w-5"></i> Agenter</a>` : ''}
            ${isAdmin ? `<a href="settings.html" class="flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition uppercase text-[10px] tracking-widest font-black ${window.location.href.includes('settings') ? 'text-blue-400 bg-white/5' : 'text-slate-400'}"><i class="fas fa-cog w-5"></i> Inställningar</a>` : ''}
			<a href="agents.html" class="flex items-center gap-3 px-4 py-5 rounded-xl font-black uppercase text-[11px] tracking-widest text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition duration-200">
    <i class="fas fa-user-shield text-base w-6"></i>
    <span>Agenter</span>
</a>
        </nav>
        <div class="mt-auto pt-8 border-t border-white/10 text-xs font-black uppercase text-slate-500">
            ${user.name}<br><button onclick="localStorage.removeItem('loggedUser');location.href='login.html'" class="mt-2 text-red-400 hover:text-red-300">Logga ut</button>
        </div>
    `;
    document.body.prepend(sidebar);
}

// Globala funktioner för alla sidor
window.openModal = (id) => document.getElementById(id)?.classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id)?.classList.add('hidden');
window.ensureArray = (data) => Array.isArray(data) ? data : (data ? [data] : []);

document.addEventListener('DOMContentLoaded', renderSidebar);