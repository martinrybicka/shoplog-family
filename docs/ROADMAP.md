# Etapy

## Etapa 1 – samostatné lokální MVP (17. 11. 2026)

Zadání: vytvořit samostatnou rodinnou aplikaci na způsob TankLogu. Rozsah: účty a první správce, ruční nákupy a položky, soukromé fotografie/náhledy, lokální OCR s kontrolou, rodinná historie, měsíční přehled, opravy/mazání a místní konfigurace. Technické a funkční kontrakty: SPECIFICATION, ARCHITECTURE, API a SECURITY.

Implementované v této etapě, skutečné výsledky a neověřené části uvádí VALIDATION. Docker runtime a produkční akceptace nejsou splněné pouhou přítomností konfigurace. Po místních kontrolách a commitu se práce této etapy zastaví.

## Budoucí etapy – návrh, nejsou zahájené

1. Další formáty/lepší OCR položek, export, rozpočty a produktová analytika podle dalšího zadání.
2. Produkční příprava s měřením, šifrovanými off-host zálohami a obnovou. Vlastní doména, samostatný stack a volume.
3. GitHub a vzdálené nasazení pouze po samostatném výslovném povolení pro Rodinné nákupy. Souhlas pro TankLog nepokrývá tento projekt.

## Samostatně schválené vydání – 18. 11. 2026

Uživatel výslovně povolil GitHub a samostatný Portainer stack na DOCKER01 pro nakupy.mrybicka.com stejným způsobem jako TankLog. Příprava a skutečný stav: DEPLOYMENT_PORTAINER.md. Produkční instalace bez seed/importu; žádný zásah do stávajících stacků nebo dat.
