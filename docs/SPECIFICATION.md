# Specifikace a UX

Uživatel 17. 11. 2026 požádal o aplikaci na způsob rodinného TankLogu a potvrdil samostatnou aplikaci. První lokální etapa přináší funkční evidenci, vlastní účty a databázi. Název: Rodinné nákupy. Žádné sdílení instalace nebo databáze s TankLogem.

Domovská stránka nabízí přidání účtenky, výběr měsíce, celkové výdaje, počet nákupů, rozdělení kategorií, poslední nákupy a vlastní rozpracované fotografie. Poslední nákupy jsou nejnovější v celé historii, měsíční čísla používají vybrané období. Prázdný stav neobsahuje fiktivní údaje. Vzhled: světlá zelená, krémové plochy, jemný fialový akcent, přístupná navigace a spodní navigace na telefonu.

Základní cesta: vybrat JPEG/PNG (nejvýše 10 MiB, 24 MP, bez animace), uložit soukromou fotografii do DB, zkontrolovat/vyplnit údaje vedle náhledu a potvrdit nákup. Po nahrání fotografie se automaticky spustí lokální OCR. Rozpoznaný obchod, datum a částka se doplní do prázdných polí ke kontrole. Uložení nákupu vždy potvrzuje uživatel. Chybějící engine nebo nejednoznačné údaje neblokují ruční práci. Originál je soukromý; očištěný náhled má nejvýše 1600 × 1600 px / 2 MiB.

Ruční zápis vyžaduje obchod, nebudoucí obchodní datum v Europe/Prague, nezápornou částku s nejvýše dvěma desetinnými místy a jednu kategorii. Nula je povolená například při úplném zaplacení poukázkou; evidence neslouží účetnictví ani výpočtu DPH. Kategorie: potraviny, domácnost, drogerie, oblečení, elektronika, ostatní. Poznámka nejvýše 2000 znaků. Měna je pevně CZK. Záporné vratky nejsou v této etapě podporované.

Položky jsou nepovinné, nejvýše 200 na nákup. Název, kladné množství s nejvýše třemi desetinnými místy, nezáporná jednotková cena s nejvýše dvěma místy. Řádek = množství × cena, ROUND_HALF_UP na haléře, následně součet zaokrouhlených řádků. Příklad 0,125 × 29,00 = 3,63 Kč. Slevu či nezadanou položku lze zachytit rozdílem mezi součtem a zaplacenou částkou; rozhodující pro souhrn je zaplacená částka.

Jedna rodina sdílí všechny uložené nákupy a jejich přílohy. Autor zůstává původní i při editaci správcem. Aktivní člen může opravovat/smazat vlastní nákup, správce všechny. Smazání se jmenovitě potvrzuje, nevratně smaže nákup i obrázek; audit a tombstone žádosti zůstanou. Rozpracované fotografie a text OCR čte/maže jen autor. Limit 30 rozpracovaných fotografií na účet. Smazání fotografie z formuláře nemění ručně rozepsaná pole.

Rozepsaná metadata jsou pouze v paměti okna, reload je zahodí. Uložená fotografie zůstává v DB do dokončení nebo ručního odstranění. Po dokončení se fotografie atomicky přesune k nákupu a návrh včetně OCR smaže. Uživatelé nemají veřejnou registraci; první správce jednorázově a další účty prostřednictvím správce s dočasným heslem.

Budoucí funkce, nyní neimplementované: OCR položek, export, rozpočty, více měn/rodin, cenová historie produktů, položkové kategorie, PDF/HEIC, automatická retence návrhů, offline práce a automatické zálohování mimo hostitele. Vyžadují další zadání.

Při vytváření košíku se nákupní seznam zadává po jednotlivých položkách. Po vyplnění posledního řádku se zobrazí další prázdný řádek. Prázdné řádky se při uložení vynechají. Tlačítko plus u řádku nabízí 20 běžných potravin a vybraná potravina vyplní daný řádek. Uložení používá dosavadní textové pole se seznamem odděleným novými řádky, takže dříve uložené košíky zůstávají čitelné.

V navigaci je rodinný přehled Záruky. Zahrnuje i dříve uložené nákupy s kategorií jinou než Potraviny a počítá orientační konec dva kalendářní roky od zadaného data nákupu. Pro nákup z 29. února vychází datum konce na 28. února nepřestupného roku. Jeden řádek odpovídá jednomu nákupu. Přehled nabízí stav, filtr kategorie, hledání, odkaz na detail a přímý odkaz na přiloženou účtenku. Při výchozím zobrazení probíhajících lhůt jsou nejbližší termíny nahoře.
