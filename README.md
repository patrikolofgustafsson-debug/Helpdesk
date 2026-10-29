# Eventful Desk v2

## Installera frontend
1. Ändra `js/config.js` och ersätt `__WORKER_URL__` med support-Workerns exakta URL utan avslutande snedstreck.
2. Ladda upp allt utom mapparna `worker`, `data-seed` och `tools` till roten av publika GitHub-repot `Helpdesk`.
3. GitHub Pages: main / root.

## Installera Worker
1. Ersätt hela Worker-koden med `worker/worker.js`.
2. Secrets: `GITHUB_TOKEN`, `ADMIN_KEY`, `AUTH_SECRET`.
3. `GITHUB_TOKEN` behöver Contents: Read and write för privata `supportprogram-data`.
4. `ADMIN_KEY` används bara för första/särskild administratörsinloggning.
5. `AUTH_SECRET` ska vara en separat lång slumpmässig hemlighet.

## Datamodell
Varje ärende, kund, agent, användare och KB-artikel lagras som en egen JSON-fil.

## Första start
Öppna `login.html`, ange ADMIN_KEY under administratörsinloggning och skapa därefter agenter/kunder med tillfälliga lösenord.

## Säkerhet
Detta är en förbättrad v2 med serververifierade HMAC-sessioner och PBKDF2-lösenordshashning. Gör ändå säkerhetsgranskning, personuppgiftsbedömning, backupplan och belastningstest innan riktiga kundärenden används. GitHub som datalager har samtidighets- och skalningsbegränsningar.
