# Rodinné nákupy

Samostatná česká aplikace pro rodinnou evidenci nákupů a účtenek, postavená na stejných technických a bezpečnostních principech jako TankLog. TankLog ani jeho data se nemění.

Jedna instalace = jedna rodina. Aktivní členové sdílí historii nákupů, soukromé fotografie účtenek a měsíční souhrny. Každý upravuje a maže vlastní záznamy; správce také ostatní. Správce zakládá účty, může je deaktivovat a vydat jednorázové dočasné heslo.

## Co funguje

- Fotografie účtenky → kontrola údajů → uložení; také čistě ruční zápis.
- Lokální OCR Tesseract ces+eng navrhuje obchod, datum a celkovou částku. Návrhy se použijí až tlačítkem uživatele. Nejednoznačné částky se nedoplňují.
- Obchod, datum, částka v Kč, kategorie, poznámka a nepovinné položky s množstvím a jednotkovou cenou.
- Součet položek se počítá přesně s Decimal a půl nahoru na haléře. Skutečně zaplacená částka se nikdy nepřepisuje podle položek; rozdíl se zobrazí.
- Sdílená historie s hledáním obchodu/poznámky, kategorií, daty a stránkováním. Měsíční přehled částek a kategorií.
- Opravy s ochranou před přepsáním souběžné změny, potvrzované smazání včetně účtenky, ochrana proti duplicitě při opakování uložení.
- Rozpracované fotografie uložené v DB, dostupné pouze autorovi; dokončení z domovské stránky.
- První správce pomocí jednorázového instalačního kódu, serverové sessions, CSRF, omezení přihlašování, odvolání sessions, profil a motiv v DB, audit.
- Responzivní rozhraní pro mobil a počítač. Fotografie, náhledy, OCR a ostatní uložená data jsou v PostgreSQL.

**Omezení:** pouze CZK, kategorie na úrovni celého nákupu, ruční přepis jednotlivých položek. OCR nenavrhuje položky a není zárukou správnosti. Bez PDF/HEIC, rozpočtů, exportu, rozdělování plateb, více domácností, offline ukládání a PWA instalace. Produkční nasazení a Docker runtime zatím nejsou ověřené. Přesné výsledky v [docs/VALIDATION.md](docs/VALIDATION.md).

## GitHub a Portainer

Samostatné nasazení na DOCKER01 a doménu `nakupy.mrybicka.com` uživatel schválil 18. 11. 2026. Profil `compose.portainer.yaml` používá vlastní image, DB a volume; `compose.build.yaml` doplňuje samostatný build jako u TankLogu. Prostředí popisuje `.env.portainer.example`. [Postup a skutečný stav](docs/DEPLOYMENT_PORTAINER.md).

## Lokální spuštění přes Docker

```sh
python3 infra/setup_env.py
docker compose config --quiet
docker compose up --build -d
```

Otevřete **http://localhost:8090**. Na první instalaci si zvolte vlastní účet správce a zadejte `SHOPLOG_SETUP_TOKEN` z místního `.env`. Kód nikam neposílejte. Po vytvoření správce je instalace trvale uzavřená a kód lze odstranit z prostředí. Ostatní účty vytváří správce; žádný výchozí účet neexistuje.

Vývojový port je pouze na loopbacku. PostgreSQL ani backend nemají veřejný port; DB má samostatný volume `shoplog-family_postgres_data`. Zastavení `docker compose stop` zachová data. Nepoužívejte `down -v`. Aplikační DB role nemá superuser/CREATEDB/CREATEROLE práva. `compose.prod.yaml` je pouze příprava pro budoucí HTTPS proxy; nejde o schválení ani ověření nasazení. Lokální HTTP nastavení nesmí být vystaveno do internetu.

## Lokální spuštění bez Dockeru

Předpoklady: Python 3.14, uv 0.13.6, Node 26 a PostgreSQL 18 (`initdb`, `pg_ctl`, `psql`, `createdb` v PATH).

```sh
uv sync --project backend --frozen
npm ci --prefix frontend
python3 infra/ocr/install_models.py
# Pro OCR musí být v PATH Tesseract přesně 5.5.4; bez něj funguje ruční zápis.
python3 infra/dev.py
```

Skript vytvoří vlastní místní PostgreSQL cluster v ignorovaném `.runtime/native-postgres`, používá port 55440 a heslo z `.env`, API 18092 a web 8090. Nevytváří demo účty. Ctrl+C zastaví procesy a cluster, zachová data. Jde o vývojové prostředí; produkční zálohy ani provozní garance nejsou součástí tohoto skriptu. Nemění existující PostgreSQL ani TankLog.

## Kontroly

```sh
npm run test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
cd backend
# Nastavte DJANGO_SECRET_KEY a POSTGRES_* pro vlastní izolovanou testovací DB.
uv run --frozen pytest
uv run --frozen python manage.py check
uv run --frozen python manage.py makemigrations --check --dry-run
uv run --frozen ruff check . ../infra
```

Pytest vytváří `test_<POSTGRES_DB>`; nikdy nenastavujte produkční databázi. E2E používá samostatnou DB a syntetické podklady podle [docs/VALIDATION.md](docs/VALIDATION.md). Při běžném spuštění se nic neseeduje.

[Specifikace a UX](docs/SPECIFICATION.md) · [Architektura a model](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Bezpečnost](docs/SECURITY.md) · [Etapy](docs/ROADMAP.md) · [Ověření](docs/VALIDATION.md)
