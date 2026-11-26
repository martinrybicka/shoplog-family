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

Veřejný GitHub byl skutečně vytvořen: https://github.com/martinrybicka/shoplog-family, default `main`. Implementace a produkční profil byly zveřejněné v commitu `d7240bd`. Kontrola celé Git historie i zveřejňovaného patche pomocí Gitleaks nenašla tajné údaje. Lokální kontrola připravených souborů neobsahovala provozní data ani vygenerovaná tajemství.

Znovu 18. 11. 2026 skutečně prošlo 37 backendových testů včetně lokálního OCR (10,80 s), 8 frontendových testů, frontend lint/TypeScript/build, Ruff a kontrola migrací (No changes detected). Kontrola `config --quiet` kombinace Portainer+build profilů prošla se syntetickými proměnnými, bez výpisu tajemství. Poslední doložené prohlížečové testy jsou z 17. 11. a v tomto vydání nebyly znovu spuštěné; rozhraní se při přípravě nasazení neměnilo.

**Nasazení nebylo provedeno.** Veřejná správa `https://portainer.mrybicka.com` vrací Cloudflare HTTP 530 / Tunnel error 1033 (ověřeno přes web i API). `nakupy.mrybicka.com` se zatím nepřekládá v DNS. DOCKER01 ani docker01.local ani docker01.int.mrybicka.com se z tohoto počítače nepřekládají a není přístupná SSH relace nebo klíč. Uživateli byla položena otázka na funkční adresu správy/přihlášení. Bez obnoveného tunelu nebo jiné dostupné cesty nelze vytvořit stack, sestavit image ani ověřit nový port. Existující TankLog HTTPS odpovídá 200; nebyl proveden žádný zásah do jeho stacku ani dat.

Produkční profil, oddělené image/tagy a postup jsou připravené. Zbývá funkční správcovský přístup, inventura DOCKER01/portu, sestavení image, čistý Portainer stack, DNS/NPM/HTTPS a závěrečná akceptace výše. Žádné nové produkční tajné hodnoty ani demo účty zatím nebyly vytvořené.

Automatické off-host zálohy a obnova nejsou součástí hotových funkcí projektu; samotný Docker volume není záloha.

## Nasazení na DOCKER01 – 18. 11. 2026

Portainer sestavil všechny tři obrazy `1.0.0` a založil stack `shoplog-family` (ID 52) z revize `197e8c5`. Databáze a backend hlásily `healthy`. Web publikuje `0.0.0.0:8090`; přímo na DOCKER01 vrátil endpoint prvního spuštění `available: true`. Instalační kód je v prostředí stacku jako `SHOPLOG_SETUP_TOKEN`.

Autoritativní DNS už vrací adresu veřejné proxy. Při kontrole veřejný server dosud odmítal TLS pro novou doménu. Zbývá dokončit Proxy Host a certifikát v Nginx Proxy Manageru a ověřit HTTPS.

## Veřejné ověření HTTPS

Po dokončení NPM uživatelem 18. 11. 2026 veřejné `https://nakupy.mrybicka.com/` odpovědělo HTTP 200 s platným TLS ověřeným curl. `GET /api/v1/auth/setup/` vrátil 200 a `available: true`, anonymní seznam nákupů vrátil 403. API vrací `Cache-Control: private, no-store`. První správce může dokončit instalaci pomocí `SHOPLOG_SETUP_TOKEN` z prostředí Portainer stacku. Počet jednotlivých databázových záznamů a úplný průchod přihlášením nebyly při tomto ověření kontrolovány.

## Položky košíku – verze 1.1.2

Aktualizace 18. 11. 2026 byla sestavena na DOCKER01 z revize `106d081` a nasazena přes Portainer stack 52. Web a backend používají tag 1.1.2, backend je stejný obraz jako 1.1.1, databáze zůstává na 1.0.0. Všechny tři kontejnery hlásily healthy a databázový svazek byl po aktualizaci shodný. Veřejné HTTPS poskytuje nový JavaScript obsahující nabídku potravin a upozornění na prázdné položky. Anonymní přístup k API košíků vrátil 403. Komponentový test skutečně ověřil 20 potravin, přidání řádku a uložení jen vyplněných položek. Přihlášený produkční průchod nebyl proveden.

## Instalace na telefon – verze 1.1.3

Nasazeno 26. 11. 2026 přes Portainer na DOCKER01 z revize `600fbb6`. Web má manifest se samostatným režimem a ikony pro Android a iOS. Backend používá stejný obraz jako ve verzi 1.1.2 a databázový svazek je shodný. Pro práci s daty je potřeba internetové připojení.

Prošlo sestavení, lint a 9 frontendových testů. Chromium s emulovaným mobilním zobrazením načetlo veřejný manifest bez chyb instalovatelnosti. Veřejné ověření dále potvrdilo typ manifestu, rozměry všech čtyř PNG, odpověď 404 pro chybějící ikonu a 403 pro anonymní přístup ke košíkům. Instalace na fyzických telefonech nebyla provedena.

## Tlačítko instalace – verze 1.1.4

Nasazeno 26. 11. 2026 přes Portainer z revize `262d886`. Tlačítko je u přihlášení a v horní liště po přihlášení. Prošlo sestavení, lint a 11 frontendových testů. Na veřejném přihlášení Chromium ověřilo otevření návodu a volání simulovaného instalačního dialogu. Instalace na fyzických telefonech nebyla součástí ověření.

## Automatické OCR po nahrání – verze 1.1.5

Nasazeno 26. 11. 2026 přes Portainer z revize `5de7b10` na DOCKER01 se shodným databázovým svazkem. Po nahrání se automaticky doplní rozpoznané údaje do prázdných kolonek a nákup se ukládá až po potvrzení. Parser umí také data ve formátu rok–měsíc–den.

Prošlo 38 backendových a 11 frontendových testů, lint, sestavení a dva prohlížečové průchody se syntetickou účtenkou a skutečným lokálním OCR. Na produkčním snímku OCR bez zápisu rozpoznalo obchod, datum a částku. Datum i částka souhlasily s uloženým záznamem. Veřejné HTTPS poskytlo nový web a anonymní požadavek ke košíkům vrátil 403.
