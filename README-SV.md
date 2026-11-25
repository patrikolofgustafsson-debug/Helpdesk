# Eventful Desk AI v1 – Workers AI

Det här paketet bygger vidare på den senaste kompletta Eventful Desk-Workern och den aktuella detaljsidan för ärenden.

## Paketets filer

- `worker.js` – komplett ersättnings-Worker. Alla befintliga funktioner finns kvar och AI-rutterna är tillagda.
- `ticket.html` – komplett ersättningssida med AI-panelen.
- `wrangler.toml.example` – exempel om Workern distribueras med Wrangler.
- `TESTRESULTAT.md` – utförda kontroller.
- `CHECKSUMS-SHA256.txt` – kontrollsummor.

## Funktioner

AI-panelen på `ticket.html` innehåller:

1. **Summera ärendet** – sammanfattar beskrivning, kommunikation, interna anteckningar och dokumenterat läge.
2. **Hitta liknande ärenden** – använder den flerspråkiga embeddingmodellen `@cf/baai/bge-m3` och visar fem relevanta lösta ärenden.
3. **Föreslå lösning** – hämtar relevanta lösta ärenden och KB-artiklar och skapar ett grundat felsökningsförslag.
4. **Föreslå kundsvar** – skapar ett utkast som agenten kan infoga i svarsfältet. Inget skickas automatiskt.

Textgenerering använder som standard `@cf/google/gemma-4-26b-a4b-it`. Båda modellnamnen kan ändras med Worker-variabler.

## Installera

### 1. Säkerhetskopiera

Spara en kopia av den nuvarande Cloudflare Workern och den publicerade `ticket.html`.

### 2. Lägg till Workers AI-binding

I Cloudflare Dashboard för Workern:

1. Öppna **Settings** → **Bindings**.
2. Välj **Add binding** → **Workers AI**.
3. Ange variabelnamnet exakt:

```text
AI
```

Ingen separat AI-API-nyckel behövs när bindingen används.

Om Workern distribueras med Wrangler, lägg till:

```toml
[ai]
binding = "AI"
```

### 3. Behåll befintliga secrets

Följande befintliga secrets/variabler ska ligga kvar:

```text
GITHUB_TOKEN
ADMIN_KEY
AUTH_SECRET
MS_TENANT_ID
MS_CLIENT_ID
MS_CLIENT_SECRET
MAILBOX
```

### 4. Valfria modellvariabler

Standardmodellerna fungerar utan dessa variabler. De kan anges om modellerna ska kunna bytas utan kodändring:

```text
AI_TEXT_MODEL=@cf/google/gemma-4-26b-a4b-it
AI_EMBEDDING_MODEL=@cf/baai/bge-m3
```

### 5. Publicera Workern

Ersätt hela Worker-koden med paketets `worker.js` och välj **Deploy**.

Workern har fyra nya, personal-skyddade rutter:

```text
POST /api/ai/tickets/{id}/summary
POST /api/ai/tickets/{id}/similar
POST /api/ai/tickets/{id}/solution
POST /api/ai/tickets/{id}/reply
```

Vanliga helpdeskfunktioner påverkas inte om AI-bindingen tillfälligt saknas. Endast AI-rutterna svarar då med ett tydligt konfigurationsfel.

### 6. Publicera ärendesidan

Ersätt `ticket.html` i det publika Helpdesk-repot med paketets `ticket.html`. Vänta på en grön GitHub Pages-deployment och kör därefter `Ctrl+F5`.

## Testa efter publicering

1. Öppna ett ärende som agent eller administratör.
2. Klicka på **Summera ärendet**.
3. Klicka på **Hitta liknande ärenden** och öppna ett träffat originalärende.
4. Klicka på **Föreslå lösning** och kontrollera källorna.
5. Klicka på **Föreslå kundsvar** och därefter **Infoga i kundsvar**.
6. Kontrollera texten manuellt innan **Skicka svar** används.
7. Logga in som kund och verifiera att AI-rutterna inte är åtkomliga.

## Säkerhets- och integritetsval

- AI-rutterna kräver rollen `admin` eller `agent`.
- Kundnamn och kundens e-postadress läggs inte in i AI-underlaget.
- Ärende- och KB-innehåll behandlas som opålitlig data; modellen instrueras att inte följa instruktioner som råkar finnas i materialet.
- Resultaten sparas inte automatiskt i ärendet.
- AI:n ändrar inte status, tilldelning eller andra fält.
- AI:n skickar aldrig e-post eller portalsvar automatiskt.
- Förslag visas med en kontrollpåminnelse och måste granskas av agenten.

## Hur v1 hittar liknande material

V1 skapar embeddings på begäran för det aktuella ärendet och ett begränsat urval av tidigare material:

- upp till 60 senast uppdaterade lösta/stängda ärenden;
- upp till 40 KB-artiklar.

Det är lämpligt för en första version och kräver ingen ny databas. När mängden ärenden växer till många hundra eller tusentals bör nästa steg vara ett beständigt index i Cloudflare Vectorize, där embeddings skapas när ett ärende löses eller en KB-artikel uppdateras.

## Viktig begränsning

Testerna i paketet är lokala och använder simulerade GitHub- och Workers AI-svar. De verifierar kodvägarna, behörighetskontrollen och svarsformaten, men inte den verkliga Cloudflare-kontots modellåtkomst, kostnad eller latens. Därför ska samtliga fyra knappar testas efter deployment.
