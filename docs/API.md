# API

Základ `/api/v1/`, JSON, chyby `{error:{code,message,fields?,request_id?}}`. Desetinné hodnoty jsou řetězce s tečkou; datum ISO DATE. Každý endpoint kromě setup/login/csrf a health potřebuje aktivní plnou session. Zápisy navíc CSRF. JSON API a obrázky vrací `Cache-Control: private, no-store`.

## Účty

`GET auth/csrf/` vrátí csrf_token, který se přikládá jako X-CSRFToken. `GET auth/setup/` vrací available. `POST auth/setup/` přijme setup_token, username, display_name, password, password_confirmation; první správce se přihlásí, další setup vrací 409. `POST auth/login/`, `POST auth/logout/`, `GET auth/me/`, `POST auth/password/change/`, `GET/PATCH profile/`. Profil/účty používají ETag a If-Match; 428 při chybějícím a 412 při zastaralém.

Správce: `GET/POST admin/users/`, `GET/PATCH admin/users/{id}/`, `POST admin/users/{id}/{activate|deactivate|password-reset}/`, `GET admin/audit/`, `GET admin/system/`. Vytváření/reset vyžaduje vlastní current_password; nové heslo se zobrazí jednou a uživatel je musí změnit. Posledního správce nelze deaktivovat/degradovat. Další detaily a skutečná validační pole v serializerech `accounts`.

## Nákupy

| Metoda a cesta | Chování |
| --- | --- |
| GET shopping/purchases/ | Stránkování po 25: count/next/previous/results. search hledá obchod/poznámku, category, date_from/date_to, page. |
| POST shopping/purchases/ | request_key UUID, store, date, total_amount, category, note, items, volitelné draft_id. Nový nákup 201, přesné opakování 200, jiné tělo/odstraněný výsledek 409. |
| GET shopping/purchases/{id}/ | Detail sdílený rodině. |
| PATCH shopping/purchases/{id}/ | Celá sada editovatelných polí jako při vytvoření, navíc version; bez request_key/draft_id. Autor/ADMIN. Konflikt 409, cizí editace 403. |
| DELETE shopping/purchases/{id}/ | JSON `{version:1}`; autor/ADMIN, smazání nákupu i přílohy 204. |
| GET shopping/purchases/{id}/receipt/ | Očištěný JPEG náhled, `?original=1` validovaný originál JPEG/PNG. |
| GET shopping/summary/?month=2026-01 | month, currency CZK, count, total_amount, categories a stores (nejvýše 8 dle částky). Výchozí současný měsíc v Praze. |

Položka vstupu: `{name,quantity,unit_price}`. Výstup přidá `total`. Detail navíc obsahuje id, author, can_edit, has_receipt, version, currency, items_total, difference. Neexistující objekty vrací 404. Neplatná data 400. Klient opakuje stejný request_key i tělo při nejasném síťovém výsledku; klíč se při úpravě nového formuláře změní.

## Rozpracované fotografie a OCR

| Metoda a cesta | Chování |
| --- | --- |
| POST shopping/drafts/ | Multipart file, JPEG/PNG do 10 MiB; vrací `{id}` 201. Nejvýše 30 návrhů na autora. |
| GET shopping/drafts/ | Vlastní návrhy `{id,created_at}`, bez binárního obsahu. |
| DELETE shopping/drafts/{id}/ | Jen autor; odstraní originál/náhled/OCR. |
| GET shopping/drafts/{id}/image/ | Jen autor; JPEG náhled. |
| POST shopping/drafts/{id}/recognize/ | Jen autor, spustí lokální OCR, vrátí `{suggestions,raw_text}`. 429 při obsazeném slotu/limitu, 503 pokud engine není připraven, 422 vadný OCR výstup, 504 timeout. |
| GET shopping/drafts/{id}/recognize/ | Jen autor; dosavadní OCR výsledek. |

Při vytvoření nákupu se ověří vlastnictví draft_id a fotografie se přesune v téže transakci. Nový request_key s už spotřebovaným draft_id vrací 404. Přesné opakování původní žádosti vrátí původní nákup. Cizí návrh je 404 i pro správce; dokončené účtenky jsou sdílené rodině.
