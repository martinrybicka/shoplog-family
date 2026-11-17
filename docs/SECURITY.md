# Bezpečnost a provozní hranice

Účty, sessions, profil, motiv, nákupy, OCR, bytea přílohy i audit jsou v PostgreSQL. Cookie nese pouze session/CSRF identifikaci. Klientská query cache je dočasná v paměti, při odhlášení/odvolání session se čistí; žádný localStorage/IndexedDB ani service worker. Logout mezi okny používá pouze dočasný BroadcastChannel signál bez identity.

Přihlášení je Django session s rotací, CSRF i pro anonymní login/setup, HttpOnly a SameSite=Lax. Produkční settings vyžadují silný SECRET_KEY, konkrétní hosty a HTTPS CSRF originy, Secure cookies a SSL redirect. Auth epoch zneplatní session při změně/resetu hesla a deaktivaci. Omezená session před povinnou změnou hesla nesmí číst doménová data. Nginx sanitizuje forwarded hlavičky a omezuje login/setup/upload; backend nesmí mít host port.

Jednorázový instalační kód má nejméně 32 znaků a zůstává pouze v prostředí. Installation zabrání znovuotevření instalace i po odstranění všech účtů. Běžná instalace nikdy nevolá seed. E2E účty jsou výhradně syntetické a patří do oddělené testovací DB.

Jedna instalace = jedna rodina, všichni aktivní členové vidí všechny dokončené nákupy a jejich fotografie. Kdo má vidět jen část rodinných výdajů, nemá v této verzi vhodnou roli. Návrhy a OCR jsou soukromé autorovi. Nákup upravuje/maže autor nebo ADMIN, autorství nelze přepsat klientem. Exporty ani veřejné odkazy neexistují.

Originál účtenky se dekóduje a ověřuje skutečný JPEG/PNG/MIME, velikost, počet snímků a pixelů; náhled se generuje očištěný bez EXIF. Originál může obsahovat vlastní metadata a je dostupný jen přihlášené rodině. SQL kontroluje velikost obou bytea. Žádné filesystem MEDIA_URL, uživatelské cesty ani externí OCR služby. OCR dočasné soubory zanikají, process dostává jen minimální prostředí bez přístupových údajů a neukládá stderr do logu.

Compose má vlastní název projektu, databázi, volume, cookies a port 8090. DB je na interní síti, web lokálně na loopbacku. Produkční příprava vyžaduje vlastní HTTPS proxy a samostatné schválení nasazení. Při budoucím provozu je nutné nastavit šifrované off-host zálohy celé DB, retenci a ověřit obnovu do izolovaného volume. To nyní není implementované ani ověřené. Nevyužívat TankLog zálohy nebo secrets.

Závislosti jsou uzamčené, `.env`, `.runtime`, `.tools`, přílohy, databáze, dumpy a soukromé soubory jsou ignorované Gitem i build contextem. Backend loguje cestu/metodu/stav/čas, nikdy request tělo, cookies nebo hesla; neaktivovat DEBUG na veřejném serveru. Audit eviduje identitu objektu a operaci bez obrázků/OCR. Automatická retence rozpracovaných návrhů není, autor má ruční smazání a limit 30 návrhů.
