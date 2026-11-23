# Installera kundundersökningar i Eventful Desk

Paketet är byggt som en **direkt utökning av nuvarande arkitektur**: GitHub Pages för gränssnittet, Cloudflare Worker för API och det privata repot `Helpdesk-data` för JSON-lagring.

## Filer i paketet

| Fil | Placering | Funktion |
|---|---|---|
| `worker.js` | Cloudflare Worker | Komplett Worker med alla tidigare funktioner och nya survey-rutter |
| `survey.html` | Roten i publika `Helpdesk`-repot | Publik engångsundersökning för kunden |
| `surveys.html` | Roten i publika `Helpdesk`-repot | Adminvy med KPI:er, filter, agentstatistik, väntande utskick och CSV-export |
| `index.html` | Roten i publika `Helpdesk`-repot | Befintlig dashboard med en ny knapp till Kundundersökningar |

## 1. Publicera sidorna

1. Kopiera `survey.html` och `surveys.html` till roten i det publika `Helpdesk`-repot.
2. Ersätt nuvarande `index.html` med paketets `index.html` om du vill ha knappen **Kundundersökningar** direkt på dashboarden.
3. Commit och invänta en grön GitHub Pages-deployment.

Sidorna använder samma `js/config.js`, `js/api.js` och `js/auth.js` som resten av Eventful Desk.

## 2. Ersätt Workern

1. Öppna Eventful Desks Cloudflare Worker.
2. Välj **Edit code**.
3. Markera all befintlig kod och ersätt den med hela innehållet i `worker.js`.
4. Deploya Workern.
5. Behåll de befintliga secrets:
   - `GITHUB_TOKEN`
   - `ADMIN_KEY`
   - `AUTH_SECRET`
   - `MS_TENANT_ID`
   - `MS_CLIENT_ID`
   - `MS_CLIENT_SECRET`
   - `MAILBOX`

Workern behåller tidigare ärenden, kundportal, agenter, kunder, mailintegration, automationsregler, papperskorg, klassificering, inställningar och Supportbanken.

## 3. Rekommenderad miljövariabel

Lägg till följande variabel i Cloudflare Worker:

```text
SURVEY_BASE_URL=https://patrikolofgustafsson-debug.github.io/Helpdesk/survey.html
```

Detta är länken som läggs i undersökningsmejlet. Om variabeln saknas används samma adress som standard.

Valfritt kan giltighetstiden ändras:

```text
SURVEY_EXPIRY_DAYS=30
```

Tillåtet intervall är 1–365 dagar. Standard är 30 dagar.

## 4. Så fungerar flödet

1. En agent ändrar ett ärende från öppet till `Resolved`, `Closed`, `Löst` eller `Stängd`.
2. Workern skapar en personlig engångslänk.
3. Inbjudan sparas i det privata datarepot.
4. Om Microsoft Graph-mail är konfigurerat skickas länken automatiskt till kundens e-postadress.
5. Kunden svarar på `survey.html` utan att logga in.
6. Svaret sparas och länken stängs för ytterligare svar.
7. Admin öppnar `surveys.html` för KPI:er, filter, kommentarer, agentstatistik, väntande svar och CSV-export.

Om ett utskick misslyckas blockeras inte stängningen av ärendet. Inbjudan finns kvar och kan skickas igen från adminvyn.

## 5. Lagring i Helpdesk-data

Mapparna skapas automatiskt första gången de används:

```text
survey-invitations/<invitation-id>.json
surveys/<response-id>.json
```

Inbjudan innehåller ärendekontext, leveransstatus och giltighetstid. Svaret innehåller:

- nöjdhetsbetyg 1–5
- om problemet blev helt/delvis/inte löst
- enkelhet 1–5
- rekommendationsbetyg 0–10
- valfri kommentar
- om kunden tillåter uppföljande kontakt
- kund, agent, tjänst, kategori och ärende-ID för analys

## 6. Kontroll efter driftsättning

1. Öppna ett testärende med en e-postadress du kontrollerar.
2. Ändra status till `Resolved` och spara.
3. Kontrollera att en fil skapas under `survey-invitations`.
4. Kontrollera att mejlet kommer fram.
5. Öppna länken och skicka ett testsvar.
6. Kontrollera att en fil skapas under `surveys`.
7. Öppna `surveys.html` som administratör och kontrollera KPI:er och svarsraden.
8. Försök använda samma länk igen; sidan ska visa att undersökningen redan är besvarad.

## Säkerhet

- Den publika sidan visar bara systemnamn samt ärendenummer och ämne för den aktuella länken.
- Token är ett slumpmässigt UUID, lagras i privat repo och kan användas en gång.
- Svar valideras i Workern; webbläsarvalidering är endast ett extra lager.
- Kommentarer behandlas som text och begränsas till 5 000 tecken.
- Admin-API:t kräver administratörsroll.
- Länkar löper automatiskt ut.
