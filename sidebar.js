(async function () {
  const host = document.getElementById("app-sidebar");
  if (!host) return;
  try {
    const response = await fetch("sidebar.html", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Kunde inte ladda sidebar.html (${response.status})`);
    host.innerHTML = await response.text();
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const activeAliases = {"ticket.html":"tickets.html"};
    const activePage = activeAliases[current] || current;
    host.querySelectorAll("[data-page]").forEach(link => {
      const active = link.dataset.page.toLowerCase() === activePage;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
    });
    const logout = host.querySelector("#logoutButton");
    if (logout) logout.addEventListener("click", () => {
      if (typeof window.logout === "function") window.logout();
      else location.href = "index.html";
    });
  } catch (error) {
    console.error(error);
    host.innerHTML = '<div style="padding:20px;color:white">Menyn kunde inte laddas.</div>';
  }
})();
