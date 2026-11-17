"""Vygeneruje lokální konfiguraci bez předvyplněného účtu a výpisu tajemství."""

import os
import secrets
from pathlib import Path

path = Path(__file__).resolve().parents[1] / ".env"
content = (
    "\n".join(
        f"{name}={secrets.token_urlsafe(48)}"
        for name in [
            "DJANGO_SECRET_KEY",
            "POSTGRES_PASSWORD",
            "POSTGRES_ADMIN_PASSWORD",
            "SHOPLOG_SETUP_TOKEN",
        ]
    )
    + "\nSHOPLOG_HTTP_PORT=8090\n"
)
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    raise SystemExit("Soubor .env již existuje; nebyl změněn.")
with os.fdopen(fd, "w") as output:
    output.write(content)
print("Soubor .env byl vytvořen s právy 600. Instalační kód najdete pouze v něm.")
