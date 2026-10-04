# Medusa Multi-Brand-Demo: Einrichtung

Diese Anleitung beschreibt, wie das Projekt auf einem anderen Rechner oder Server zum Laufen kommt. Es gibt drei Wege:

| Weg | Wofür | Aufwand |
|---|---|---|
| [A. Demo komplett in Docker](#a-demo-komplett-in-docker) | Vorführen auf einem beliebigen Rechner. Nur Docker nötig. | 3 Befehle, ca. 20 Minuten Wartezeit |
| [B. Coolify](#b-coolify) | Demo für den Kunden unter echten Domains | Repository verbinden, Variablen und Domains eintragen |
| [C. Entwicklungsumgebung](#c-entwicklungsumgebung) | Am Code arbeiten, mit Hot-Reload | Node, pnpm und Docker nötig |

## Was hier läuft

Ein Medusa-Backend (Version 2.21) verwaltet vier Marken. Jede Marke hat einen eigenen Shop.

```
                     ┌──────────────────────────┐
  Shop Marke 1 ────► │                          │
  Shop Marke 2 ────► │  Medusa-Backend + Admin  │ ──► PostgreSQL
  Shop Marke 3 ────► │                          │ ──► Redis
  Shop Marke 4 ────► │                          │
                     └──────────────────────────┘
```

- **Backend und Admin** laufen zusammen auf Port 9000. Das Admin-Dashboard liegt unter `/app`.
- **Die vier Shops** sind dieselbe Next.js-Anwendung, viermal gestartet. Jeder Shop bekommt einen anderen Schlüssel und einen anderen Namen.
- **PostgreSQL** speichert alle Daten, **Redis** übernimmt Events, Cache und Hintergrundaufgaben.

### So funktioniert Multi-Shop in Medusa

Medusa trennt Shops über **Sales Channels** (Vertriebskanäle).

1. **Jede Marke ist ein Sales Channel.** Im Admin unter *Settings > Sales Channels*.
2. **Jedes Produkt wird einem oder mehreren Sales Channels zugeordnet.** Im Admin auf der Produktseite im Bereich *Sales Channels*. Ein Produkt kann in mehreren Shops gleichzeitig verkauft werden.
3. **Jeder Sales Channel hat einen eigenen Publishable API Key.** Im Admin unter *Settings > Publishable API Keys*. Der Shop schickt diesen Schlüssel bei jeder Anfrage mit und bekommt nur die Produkte seines Kanals zurück.
4. **Bestellungen tragen ihren Sales Channel.** In der Bestellübersicht lässt sich nach Marke filtern.
5. **Lager, Kunden, Preise und Versand** werden zentral gepflegt. Alle vier Kanäle hängen am selben Lagerstandort.

Die Demo-Daten enthalten vier Platzhalter-Marken mit zusammen 26 Anzügen:

| Marke | Kürzel | Ausrichtung | Produkte |
|---|---|---|---|
| Albrecht & Söhne | `albrecht` | klassisch, Premium | 8 |
| Nordkant | `nordkant` | modern, Slim Fit | 7 |
| Festwerk | `festwerk` | Hochzeit und Abend | 7 |
| Kontor 9 | `kontor9` | Business zum Einstiegspreis | 6 |

Zwei Produkte gehören bewusst zu zwei Marken, um das Prinzip zu zeigen: *Smoking Wien Schwarz* (Festwerk und Albrecht & Söhne) und *Anzug Basic Schwarz* (Kontor 9 und Nordkant).

Die Produktfotos sind von Unsplash eingebunden und reine Platzhalter.

---

## A. Demo komplett in Docker

Voraussetzung: Docker (Docker Desktop unter Windows und macOS) mit mindestens 6 GB Arbeitsspeicher für Docker, dazu Git.

**1. Projekt holen**

```bash
git clone <repository-url> medusa-test
cd medusa-test
```

**2. Konfiguration anlegen**

```bash
cp .env.prod.example .env.prod
```

In `.env.prod` fünf Werte eintragen:

- `POSTGRES_PASSWORD`, `JWT_SECRET`, `COOKIE_SECRET`: je ein Zufallswert. Erzeugen mit `openssl rand -hex 32`. Nur Buchstaben und Ziffern verwenden.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: das Login für das Admin-Dashboard.

Die URLs in der Vorlage passen bereits für einen lokalen Start.

**3. Starten**

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod up -d --build
```

Der erste Start dauert etwa 20 Minuten: Die Images werden gebaut, die Datenbank wird eingerichtet, und die vier Shops bauen nacheinander ihre Seiten. Spätere Starts dauern rund zwei Minuten, weil alles zwischengespeichert ist.

Fortschritt ansehen:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod logs -f backend
```

**4. Aufrufen**

| Was | Adresse |
|---|---|
| Admin-Dashboard | http://localhost:9000/app |
| Shop Albrecht & Söhne | http://localhost:8001 |
| Shop Nordkant | http://localhost:8002 |
| Shop Festwerk | http://localhost:8003 |
| Shop Kontor 9 | http://localhost:8004 |

**Stoppen** (Daten bleiben erhalten):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod down
```

**Alles löschen**, auch Datenbank und Uploads: denselben Befehl mit `-v` am Ende.

### Was beim Start automatisch passiert

Das Backend führt bei jedem Start diese Schritte aus ([deploy/backend-start.sh](deploy/backend-start.sh)). Alle sind wiederholbar und ändern nichts, wenn die Daten schon da sind.

1. Datenbank-Migrationen, inklusive Grunddaten wie Region Europa, Lager und Versandarten.
2. Demo-Katalog mit den vier Marken ([seed-brands.ts](apps/backend/src/scripts/seed-brands.ts)). Abschaltbar mit `SEED_DEMO_BRANDS=false`.
3. Admin-Benutzer anlegen.
4. Die Publishable Keys der vier Marken für die Shops bereitstellen.
5. Medusa starten.

Jeder Shop wartet auf seinen Schlüssel und auf das Backend, baut dann seine Seiten und startet ([deploy/storefront-start.sh](deploy/storefront-start.sh)).

---

## B. Coolify

Diese Variante nutzt dieselbe Compose-Datei, aber ohne die lokale Zusatzdatei. Coolify übernimmt Domains und HTTPS.

Hinweis: Dieser Weg ist vorbereitet, aber noch nicht auf einem echten Coolify-Server erprobt. Lokal in Docker ist der Stack getestet.

Server: mindestens 4 vCPU und 8 GB RAM. Der Bau der Shop-Seiten braucht kurzzeitig viel Speicher.

**1. DNS.** Fünf Einträge auf die Server-IP zeigen lassen, zum Beispiel:

```
api.example.de        Backend und Admin
albrecht.example.de   Shop 1
nordkant.example.de   Shop 2
festwerk.example.de   Shop 3
kontor9.example.de    Shop 4
```

Im Endausbau bekommt jede Marke ihre eigene Domain. Für die Demo reichen Subdomains.

**2. Ressource anlegen.** In Coolify: *New Resource > Docker Compose* aus dem Git-Repository. Als Compose-Datei `/docker-compose.prod.yml` eintragen.

**3. Variablen setzen.** Coolify zeigt die Pflichtvariablen nach dem Laden der Compose-Datei an:

| Variable | Wert |
|---|---|
| `BACKEND_URL` | `https://api.example.de` |
| `STOREFRONT_URL_ALBRECHT` | `https://albrecht.example.de` |
| `STOREFRONT_URL_NORDKANT` | `https://nordkant.example.de` |
| `STOREFRONT_URL_FESTWERK` | `https://festwerk.example.de` |
| `STOREFRONT_URL_KONTOR9` | `https://kontor9.example.de` |
| `POSTGRES_PASSWORD` | Zufallswert, nur Buchstaben und Ziffern |
| `JWT_SECRET` | Zufallswert |
| `COOKIE_SECRET` | Zufallswert |
| `ADMIN_EMAIL` | Login für den Kunden |
| `ADMIN_PASSWORD` | sicheres Passwort |

`INSECURE_COOKIES` nicht setzen oder auf `false` lassen.

**4. Domains zuordnen.** Im Feld *Domains* jedes Dienstes die Domain mit dem internen Port eintragen:

| Dienst | Domain-Eintrag |
|---|---|
| `backend` | `https://api.example.de:9000` |
| `storefront-albrecht` | `https://albrecht.example.de:8000` |
| `storefront-nordkant` | `https://nordkant.example.de:8000` |
| `storefront-festwerk` | `https://festwerk.example.de:8000` |
| `storefront-kontor9` | `https://kontor9.example.de:8000` |

Die Domains müssen exakt zu den URL-Variablen aus Schritt 3 passen. Sonst blockiert der Browser die Anfragen der Shops ans Backend (CORS).

**5. Deployen.** Der erste Lauf dauert etwa 20 Minuten. Die Shops erscheinen nacheinander.

Wird eine URL später geändert, bauen die betroffenen Shops beim nächsten Start ihre Seiten automatisch neu.

---

## C. Entwicklungsumgebung

Hier laufen nur PostgreSQL und Redis in Docker. Medusa und ein Shop laufen direkt auf dem Rechner, mit Hot-Reload.

Voraussetzungen:

- Node.js 22.22 oder neuer (Node 24 geht auch)
- pnpm: `npm install -g pnpm`
- Docker
- Git

**1. Projekt holen und Pakete installieren**

```bash
git clone <repository-url> medusa-test
cd medusa-test
pnpm install
```

**2. Datenbank und Redis starten**

```bash
pnpm run infra:up
```

**3. Backend konfigurieren**

```bash
cp apps/backend/.env.template apps/backend/.env
```

In `apps/backend/.env` die Datenbank eintragen:

```
DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa-test
```

**4. Datenbank einrichten, Demo-Daten einspielen, Admin anlegen**

```bash
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa exec ./src/scripts/seed-brands.ts
pnpm exec medusa user -e admin@example.com -p ein-passwort
```

**5. Shop konfigurieren**

```bash
cd ../storefront
cp .env.template .env.local
```

Der Shop braucht den Publishable Key seiner Marke. Den Schlüssel im Admin unter *Settings > Publishable API Keys* kopieren (dafür muss das Backend laufen, siehe Schritt 6) oder alle vier Schlüssel in Dateien schreiben lassen:

```bash
# im Ordner apps/backend, Git Bash / macOS / Linux
PUBLISHABLE_KEY_DIR=.keys pnpm exec medusa exec ./src/scripts/export-publishable-keys.ts

# PowerShell
$env:PUBLISHABLE_KEY_DIR=".keys"; pnpm exec medusa exec ./src/scripts/export-publishable-keys.ts
```

Danach liegt je Marke eine Datei in `apps/backend/.keys/`. Den Inhalt bei `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `apps/storefront/.env.local` eintragen. Mit `NEXT_PUBLIC_STORE_NAME` und dem Schlüssel einer anderen Marke zeigt derselbe Shop den Katalog dieser Marke.

**6. Starten** (aus dem Projektordner, in zwei Terminals)

```bash
pnpm run backend:dev       # http://localhost:9000, Admin unter /app
pnpm run storefront:dev    # http://localhost:8000
```

---

## Marken anpassen

Die Namen sind Platzhalter. Für die echten Marken:

1. **Namen und Kürzel** in [apps/backend/src/lib/brands.ts](apps/backend/src/lib/brands.ts) ändern.
2. **Produkte** in [apps/backend/src/scripts/seed-brands.ts](apps/backend/src/scripts/seed-brands.ts) anpassen. Das Feld `brands` eines Produkts legt fest, in welchen Shops es erscheint.
3. **Dienstnamen und Variablen** in [docker-compose.prod.yml](docker-compose.prod.yml) umbenennen (`storefront-<kürzel>`, `BRAND_SLUG`, `STOREFRONT_URL_<KÜRZEL>`), ebenso in [docker-compose.prod.local.yml](docker-compose.prod.local.yml) und [.env.prod.example](.env.prod.example).

Das Seed-Skript legt nur an, was fehlt. Umbenannte Marken entstehen deshalb als neue Sales Channels neben den alten. Am saubersten ist es, die Namen vor dem ersten Start zu ändern oder mit einer leeren Datenbank neu zu beginnen.

Eine fünfte Marke ist ein weiterer Eintrag in `brands.ts` und ein weiterer `storefront-`Dienst in der Compose-Datei. Im laufenden Betrieb geht dasselbe ohne Code im Admin: Sales Channel anlegen, Publishable Key erzeugen und verknüpfen, Produkte zuordnen.

## Stolperfallen

- **pnpm ab Version 11 blockiert Build-Skripte.** Die nötigen Freigaben stehen in [pnpm-workspace.yaml](pnpm-workspace.yaml) unter `allowBuilds`. Kommt ein neues natives Paket dazu, meldet pnpm `ERR_PNPM_IGNORED_BUILDS`, dann dort ergänzen.
- **Admin-Login schlägt über http fehl**, wenn `INSECURE_COOKIES` nicht auf `true` steht. Im Produktivmodus verschickt Medusa Cookies sonst nur über HTTPS. Auf einem öffentlichen Server muss der Wert `false` bleiben.
- **Shop zeigt alte Daten.** Next.js speichert Antworten des Backends zwischen. Änderungen aus dem Admin erscheinen auf Produkt- und Kategorieseiten deshalb erst nach bis zu 60 Sekunden und einem erneuten Seitenaufruf. Die Shop-Übersicht und die Suche sind sofort aktuell. Die Frist lässt sich je Shop mit der Variable `STOREFRONT_REVALIDATE_SECONDS` ändern. Im Entwicklungsmodus hilft ein harter Reload (Strg+Shift+R).
- **Zeilenenden unter Windows.** Die Skripte in `deploy/` brauchen Unix-Zeilenenden. [.gitattributes](.gitattributes) stellt das sicher. Ein Editor, der sie auf CRLF umstellt, macht die Container unstartbar.
- **Passwort der Datenbank** nur aus Buchstaben und Ziffern wählen. Es steht in einer URL, Sonderzeichen brechen sie.
- **Ports belegt.** Variante A und Variante C nutzen beide Port 9000. Nicht gleichzeitig laufen lassen.

## Was für einen echten Shop noch fehlt

Diese Umgebung ist eine Demo. Vor einem Livegang kommen dazu:

- **Zahlungsanbieter**, zum Beispiel Stripe oder PayPal. Aktuell gibt es nur die Testzahlung.
- **E-Mail-Versand** für Bestellbestätigungen und Passwort-Reset.
- **Dateispeicher** für Produktbilder. Aktuell landen Uploads auf der Festplatte des Containers. Für den Betrieb ist ein S3-kompatibler Speicher vorgesehen.
- **Getrennte Server- und Worker-Instanz** des Backends. Die Konfiguration ist vorbereitet (`MEDUSA_WORKER_MODE`).
- **Backups** der Datenbank.
- **Markentrennung im Warenkorb absichern.** Die Shops zeigen nur das eigene Sortiment. Die Warenkorb-Schnittstelle von Medusa nimmt bei einem direkten Aufruf aber auch Produkte einer anderen Marke an. Über die Shop-Oberfläche ist das nicht erreichbar. Für den Livebetrieb gehört eine Prüfung im Warenkorb-Workflow dazu.
- **Eigenes Design je Marke.** Die vier Shops unterscheiden sich bisher nur in Name, Slogan und Sortiment.
- **Deutsche Shop-Texte, Steuern und Rechtstexte** wie Impressum, AGB und Widerruf.
