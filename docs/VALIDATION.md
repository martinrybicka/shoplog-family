# Skutečné ověření – 17. 11. 2026

První samostatná lokální etapa. Všechna data v testech jsou syntetická. Žádné připojení k databázi TankLogu, přenos skutečných účtenek, GitHub nebo produkční zásah. Původní pracovní strom TankLogu zůstal čistý.

## Výsledky

| Kontrola | Skutečný výsledek |
| --- | --- |
| Instalace backendu `uv sync --project backend --frozen` | Úspěšná do vlastní backend/.venv, 30 uzamčených balíčků. |
| Instalace frontendu `npm ci --ignore-scripts` | Úspěšná do vlastního node_modules, 204 balíčků, audit 0 zranitelností při tomto běhu. |
| Backend PostgreSQL `RUN_OCR_INTEGRATION=1 pytest -q` | **37 prošlo**, včetně skutečného Tesseract 5.5.4 / ces+eng a syntetického obrázku. |
| Frontend `npm run test` | **8 prošlo** ve 4 souborech. |
| Playwright Chromium desktop 1440 × 1100 a mobil 390 × 664 | **6 prošlo**: ruční položkový nákup → oprava → filtrování → smazání; fotografie → skutečné OCR → potvrzení → privátní příloha → logout; přístupnost přehledu/formuláře ve světlém i tmavém motivu. |
| axe ve výše uvedených 4 kombinacích obrazovek/motivu na desktopu i mobilu | Bez nálezů serious/critical. Nejde o úplný audit WCAG ani ruční čtečku obrazovky. |
| Frontend lint, TypeScript, produkční Vite build | Prošlo; největší vstupní JS 407,53 kB / gzip 128,53 kB. Rozdělené načítání administračních a profilových obrazovek. |
| Ruff backend + infra | Prošlo. |
| Django check | Bez problémů. |
| Migrace do nových lokálních PostgreSQL databází | Prošly všechny migrace včetně SQL omezení velikostí bytea. |
| makemigrations --check --dry-run | No changes detected. |
| Compose lokální profil a spojení s compose.prod.yaml | Config --quiet prošlo; pro produkční šablonu použita pouze syntetická doména nakupy.example.invalid. |
| nginx -t pro lokálně vyrenderovanou šablonu s místním upstreamem | Syntaxe a konfigurace prošly. Není to test image ani produkční proxy. |
| Restart izolovaného testovacího PostgreSQL | Po restartu shodný počet nákupů, součet a kontrolní otisky bytea účtenek. |
| Vlastní infra/dev.py bez Dockeru | Ověřen čistý start nového clusteru s heslem, migrace, Vite/API a první spuštění v prohlížeči. Bez demo účtů. |
| Vizuální kontrola | Prohlédnuty skutečné snímky počítačového a mobilního přehledu. Mobil nemá horizontální přetečení v testovaném průchodu. |

Před implementací výpočetní služby byl spuštěn test Decimal s očekáváním 0,125 × 29,00 = 3,63 Kč; sběr testu správně selhal kvůli chybějící službě. Po implementaci prošel. Testy pokrývají i rozdíl částky/položek, souhrny, CSRF, anonymní i omezené sessions, deaktivaci, cizí editaci, soukromé návrhy, vadný obrázek, idempotenci, tombstone a konflikt verzí. OCR parser odmítá nejednoznačné celkové částky; OCR endpoint nikdy sám nezaloží nákup a omezuje frekvenci.

## Opakování backendu

Použijte vlastní izolovaný PostgreSQL a účet s oprávněním vytvořit testovací DB. Tyto proměnné nesmějí odkazovat na produkci:

```sh
cd backend
export DJANGO_SECRET_KEY=synthetic-local-test-key
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439
export POSTGRES_USER=shoplog_test POSTGRES_DB=shoplog_test
# Heslo nastavte soukromě v prostředí pro svůj izolovaný cluster.
uv run --frozen pytest -q
# Při instalovaném Tesseract 5.5.4 a ověřených modelech navíc:
RUN_OCR_INTEGRATION=1 uv run --frozen pytest -q
uv run --frozen python manage.py check
uv run --frozen python manage.py makemigrations --check --dry-run
uv run --frozen ruff check . ../infra
```

Bez RUN_OCR_INTEGRATION je skutečný OCR integrační test výslovně přeskočený. Font pro syntetický obrázek lze určit OCR_TEST_FONT; Mac Arial nebo linuxový DejaVu jsou výchozí kandidáti. Modely ověřuje `python3 infra/ocr/install_models.py`.

## Opakování E2E

Pouze vlastní prázdná DB `shoplog_e2e` a izolované lokální API/web. E2E výslovně používá syntetický instalační token a syntetický účet; nesmí se spustit proti běžné rodinné instalaci. Konfigurace odmítá vzdálený hostname. Připravte samostatný testovací cluster, vytvořte shoplog_e2e a v shellu nastavte vlastní POSTGRES_* a DJANGO_SECRET_KEY:

```sh
# Z kořene projektu:
export POSTGRES_DB=shoplog_e2e
export DJANGO_SETTINGS_MODULE=config.settings.development
export DJANGO_DEBUG=false
export DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:8090
export SHOPLOG_SETUP_TOKEN=synthetic-e2e-installation-token-1234567890
backend/.venv/bin/python backend/manage.py migrate --noinput
(cd backend && .venv/bin/python -m tests.prepare_e2e)
backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:18091 --noreload
# V dalším shellu:
cd frontend
API_PROXY_TARGET=http://127.0.0.1:18091 HMR_CLIENT_PORT=8090 npm run dev -- --host 127.0.0.1 --port 8090
# A v dalším shellu, také z frontend/:
npm run test:e2e
```

Playwright potřebuje Chromium (`npx playwright install chromium`). Testovací fotografie zůstává pouze v ignorovaném `.runtime`. V běžné aplikaci se žádné účty ani nákupy automaticky nevytvářejí.

## Ruční převzetí

1. Otevřít lokální aplikaci, prvního správce založit vlastním jménem/heslem s kódem z `.env`. Zkusit druhý setup – musí být uzavřený.
2. Správce založí člena rodiny a soukromě mu předá jednorázové heslo. Člen musí nastavit nové; ověřit druhý prohlížeč.
3. Vyfotit syntetickou účtenku, vyvolat Rozpoznat údaje, zkontrolovat a použít návrhy, případně vše ručně opravit. Přidat položky a porovnat rozdíl se zaplacenou částkou.
4. Uložit, dohledat podle obchodu/data/kategorie, otevřít náhled/originál. Jiný člen čte, opravovat smí autor a správce.
5. Rozpracovanou fotografii ponechat, přihlásit se znovu a dokončit ji z Domů. Ručně rozepsaná metadata se reloadem neuchovávají; uložená fotografie ano.
6. Zkusit dvě souběžné editace, zrušit potvrzení mazání, potom potvrdit smazání. Ověřit odhlášení a nedostupnost přímé fotografie.
7. Projít klávesnicí, otestovat svůj telefon a čtečku obrazovky. Tyto člověkem provedené akceptační kroky zde nejsou vydávány za splněné.

## Neověřeno a hranice

Docker Engine/CLI v tomto prostředí není dostupný. Skutečné `docker compose up --build`, start/restart kontejnerů a image OCR build **nebyly provedené**. K dispozici byl samostatný Compose binární nástroj pro kontrolu konfigurace a místní nginx pro syntaxi šablony. Před provozem spustit příkazy README na hostiteli s Dockerem a ověřit zachování dat po restartu bez mazání volumes.

Žádný GitHub/push, veřejná doména, Portainer, TLS certifikát, vzdálený server, off-host záloha nebo obnova nebyly provedené. Není ověřené rozpoznávání reprezentativní sady skutečných obchodních účtenek ani OCR jednotlivých položek. PWA/offline, export, rozpočty, více měn, PDF/HEIC a retence rozpracovaných návrhů nejsou hotové funkce této etapy. Ruční zoom/VoiceOver a jiné prohlížeče nejsou ověřené.

Místní náhled při předání běží na http://localhost:8091 s vlastní prázdnou DB v `.runtime/native-postgres`; instalační kód zůstává pouze v `.env`. Syntetická E2E data jsou v odděleném testovacím clusteru, nikoli v tomto náhledu.

## Přehled záruk – 26. 11. 2026

Prošlo 39 backendových testů v PostgreSQL včetně OCR, 11 frontendových testů a 8 průchodů Playwright v Chromium na počítači a v mobilní emulaci. Backendový test ověřil rodinná oprávnění, vynechání potravin, výpočet pro 29. únor a hranice stavů. Prohlížeč ověřil navigaci, datum konce, vyloučení potravin, filtr po uplynutí a dostupnost přílohy. axe na testovaných obrazovkách ve světlém a tmavém motivu nenašel závažné ani kritické problémy. Prošly také Vite build, TypeScript, lint, Ruff a kontroly Django včetně kontroly migrací.
