# Rodinné nákupy

- Komunikace, UI, komentáře a dokumentace jsou česky. Technické identifikátory mohou být anglicky.
- Samostatná aplikace vychází ze vzorů TankLogu. Nikdy nepoužívat jeho databázi, volumes, tajné hodnoty, doménu ani stack.
- Zachovat React/TypeScript/Vite, Django/DRF/PostgreSQL, jeden origin, `/api/`, serverové sessions a CSRF. Žádná veřejná registrace ani JWT v prohlížeči.
- Jedna instalace představuje jednu rodinu. Všichni aktivní členové čtou rodinné nákupy a jejich účtenky; autor a ADMIN upravují/mažou. Rozpracované fotografie a OCR jsou soukromé autorovi i před ADMIN.
- Trvalá data včetně obrázků, OCR a profilu ukládat do PostgreSQL. Prohlížeč nesmí ukládat soukromá data do localStorage, IndexedDB nebo offline cache.
- Peníze a množství počítat pomocí Decimal v servisní vrstvě. Nejprve připravit testy s očekávanými výsledky. Zaplacená částka je autoritativní; položky mohou být neúplné.
- První správce se vytváří jednou s instalačním kódem z prostředí. Žádné automatické demo účty nebo seed v běžné instalaci.
- Závislosti jsou zamčené v uv.lock, package-lock.json a OCR manifestu. Nové ověřovat v oficiálních zdrojích.
- Nezveřejňovat na GitHubu a nenasazovat bez samostatného souhlasu pro tento projekt. Povolení TankLogu se sem nepřenáší. Nemazat data/volumes a neprovádět nucené Git operace.
- Etapy a skutečné ověření vést v docs/ROADMAP.md a docs/VALIDATION.md. Návrhy nezaměňovat za funkce; testy označit jako úspěšné jen po skutečném běhu. Dokončení etapy zahrnuje lokální commit a předání s omezeními.
