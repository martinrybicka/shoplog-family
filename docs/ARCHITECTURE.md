# Architektura, model a rozhodnutí

Modulární monolit: React 19 / TypeScript / Vite → jeden origin `/api/v1/` → Django 5.2 / DRF → PostgreSQL 18. Produkční příprava používá nginx a Gunicorn; lokální režim Vite proxy. Bez veřejného DB portu a bez veřejného souborového úložiště. Stejné uzamčené závislosti a autentizační vzory jako TankLog; původní doménové moduly pro vozidla nejsou součástí projektu.

- `accounts`: UUID uživatel, ADMIN/USER, profil, motiv, auth_epoch, jednorázové dočasné heslo, Installation jako trvalé uzavření prvního spuštění. DB sessions a ochrana pokusů django-axes.
- `audit`: actor, UUID entity, akce, request_id, čas a povolené změny. Nepersistuje request body, OCR, fotografie ani secrets. Bez vazby na vozidlo.
- `shopping.Purchase`: UUID, obchod do 150 znaků, DATE, Decimal(14,2), kategorie, poznámka, položky JSON s desetinnými řetězci, autor/editor, verze a časy. CHECK pro kategorii, nezápornou částku a kladnou verzi.
- `shopping.Receipt`: OneToOne CASCADE na nákup, originál a náhled bytea, skutečně ověřené MIME. SQL CHECK kontroluje délku obou bytea.
- `shopping.ReceiptDraft`: UUID, autor PROTECT, bytea originál/náhled, MIME, čas, soukromý OCR text a návrhy JSON. Stejné SQL CHECK velikostí. Po dokončení se řádek odstraní.
- `shopping.Submission`: účet, klientské UUID, hash normalizovaného těla a UUID výsledku bez FK, čas. UNIQUE účet+klíč. Tombstone zůstává i po smazání nákupu; opakování nevytvoří nákup znovu. Automatická expirace zatím není.

Položky jsou řízený JSON seznam, nikoli katalog produktů. Serializer odmítá neznámá pole, nepřijímá autorství/role ani vypočtené součty. Všechna podporovaná doménová vytváření a úpravy jdou přes servisní vrstvu. `Decimal` výpočet a konzistentní souhrny jsou v `shopping/services.py`. Přehled používá jediný SQL GROUP BY category/store, všechny další součty jsou odvozené z téhož výsledku. Žádná čísla se nesčítají v JavaScriptu; ten pouze formátuje částky a šířky grafických pruhů.

Zápisy zamykají uživatele a znovu kontrolují aktivitu/verzi session. Nákup a návrh se zamykají při editaci/potvrzení, verze odmítá zastaralou opravu i smazání. UUID není autorizační mechanismus. Jedna instalace je jedna rodina, proto aktivní plná session opravňuje číst všechny dokončené nákupy. Návrhy vyžadují filtr autora.

OCR je převzatý omezený subprocess Tesseract 5.5.4, ces+eng s SHA-256 modelů, 15s timeout, limity CPU/souborů/paměti, prostředí bez Django secrets. Dočasná PNG zanikne po procesu. Jeden globální transakční advisory lock chrání slot, tři pokusy na účet/minutu. Raw text a návrhy zůstávají pouze v DB návrhu. Parser navrhuje jen jednoznačné celkové částky/datum a firmu v záhlaví; nejde o účetní interpretaci.

Obrázky ani API nejsou v trvalé browser cache. Cookie jména mají prefix shoplog; společný hostname ale není doporučen, aplikace má mít vlastní origin. Serverové sessions a CSRF odpovídají [Django sessions](https://docs.djangoproject.com/en/5.2/topics/http/sessions/) a [DRF SessionAuthentication](https://www.django-rest-framework.org/api-guide/authentication/#sessionauthentication). UI vychází z [React](https://react.dev/) a [Vite](https://vite.dev/guide/). Lock soubory byly převzaté bez změny verzí a znovu nainstalované; OCR zdroje a kontrolní součty jsou v `infra/ocr/dependencies.lock.json`.
