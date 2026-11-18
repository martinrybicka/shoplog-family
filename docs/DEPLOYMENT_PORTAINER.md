# GitHub a Portainer – 18. 11. 2026

Uživatel výslovně povolil samostatný GitHub a nasazení na DOCKER01 přes Portainer, doména `nakupy.mrybicka.com`. Toto povolení nemění TankLog ani jiné služby. První instalace musí zůstat čistá bez demo účtů a importu lokálních dat.

## Oddělení

- Repozitář: `martinrybicka/shoplog-family`, hlavní větev `main`.
- Stack: `shoplog-family`, vlastní volume `shoplog-family_postgres_data`.
- Image: `shoplog-family-db`, `shoplog-family-backend`, `shoplog-family-web`, první verze `1.0.0`.
- Webový host port: 8090, před nasazením ověřit, že je na DOCKER01 volný. Publikuje se web, nikdy DB ani backend.
- Vlastní náhodné `DJANGO_SECRET_KEY`, `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `SHOPLOG_SETUP_TOKEN`; nic nepřebírat z TankLogu nebo místního `.env`.
- Jednorázový instalační kód zůstane v prostředí stacku. Prvního správce vytvoří uživatel s vlastním heslem na HTTPS stránce.

## Build a stack

Oddělený build jako u TankLogu obchází známý problém vzdáleného BuildKitu přes Portainer Edge. `compose.portainer.yaml` obsahuje jen lokální image a `pull_policy: never`. `compose.build.yaml` doplňuje sestavení.

Na DOCKER01 v čistém checkoutu přesného vydání sestavit:

```sh
docker compose --env-file .env.portainer -f compose.portainer.yaml -f compose.build.yaml config --quiet
docker compose --env-file .env.portainer -f compose.portainer.yaml -f compose.build.yaml build
```

Přes Portainer vytvořit Git Repository stack s URL repozitáře, `refs/heads/main` a souborem `compose.portainer.yaml`. Proměnné zadat do prostředí stacku podle `.env.portainer.example`; tajné hodnoty negenerovat do veřejných souborů, issue ani výstupu příkazů. Obraz DB a aplikační obrazy mohou mít nezávislé tagy pro budoucí aktualizace. Žádné prune, `down -v`, import dumpu ani zásah do TankLog stacku.

## DNS, NPM a HTTPS

DNS `nakupy.mrybicka.com` musí vést ke stávající reverzní proxy. V Nginx Proxy Manageru přidat nový samostatný Proxy Host: doména nakupy.mrybicka.com, HTTP → skutečná adresa DOCKER01:8090, HTTPS certifikát a Force SSL, v Advanced `client_max_body_size 12m;`. Zachovat ostatní Proxy Hosts. Web konfiguračně předává backendu schéma HTTPS a přepisuje klientské forwarded hlavičky. Přímý HTTP host port neslouží k přihlášení.

## Akceptace

1. Ověřit všechny tři služby healthy, image tagy a nový vlastní volume. Zkontrolovat nepřítomnost veřejného DB/backend portu.
2. `manage.py check --deploy` v backendu; HSTS zůstává do ověření HTTPS na 0, případné varování explicitně zaznamenat.
3. Zkontrolovat nulový počet uživatelů, nákupů, návrhů a příloh; úvodní nastavení musí vracet `available:true`. Nezakládat zkušební účet v produkci.
4. Veřejné HTTPS: platný certifikát, frontendové cesty, CSRF cookie Secure/HttpOnly/SameSite, setup dostupný, anonymní seznam a fotografie odmítnuté, API bez cache.
5. Tesseract musí hlásit 5.5.4, ces/eng modely odpovídat uzamčeným SHA-256. OCR lze ověřit čistým syntetickým vstupem bez ukládání nákupů.
6. Zapsat skutečný stav, odkazy a limity do tohoto dokumentu. Samotný commit/Compose není dokončené nasazení.

## Stav při přípravě

Produkční profil, oddělené image/tagy, prostředí a tento postup jsou připravené. Nasazení zatím nebylo provedeno. Veřejná správa `https://portainer.mrybicka.com` při kontrole vracela Cloudflare HTTP 530; `nakupy.mrybicka.com` zatím neměla dostupný DNS záznam. Je nutné ověřit funkční správcovský přístup a skutečnou konfiguraci DNS/NPM.

Automatické off-host zálohy a obnova nejsou součástí hotových funkcí projektu; samotný Docker volume není záloha.
