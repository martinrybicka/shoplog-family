"""Lokální OCR: výstup je vždy pouze návrh ke kontrole."""

import csv
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageOps

from apps.core.errors import Problem


def parse_tsv(tsv):
    lines = {}
    for token in csv.DictReader(io.StringIO(tsv), delimiter="\t"):
        text = token.get("text", "").strip()
        if text:
            key = tuple(token.get(k, "") for k in ["page_num", "block_num", "par_num", "line_num"])
            lines.setdefault(key, []).append(text)
    texts = [" ".join(tokens) for tokens in lines.values()]
    raw = "\n".join(texts)[:60000]
    found = {}
    for index, text in enumerate(texts):
        amount = re.search(
            r"\b(?:celkem(?:\s+k\s*[úu]hrad[eě])?|k\s*[úu]hrad[eě]|total)\s*[:=]?\s*((?:\d{1,3}(?:[ \u00a0]\d{3})+|\d+)[,.]\d{2})(?=\s*(?:K[čc]\b|CZK\b|$))",
            text,
            re.I,
        )
        if amount:
            value = re.sub(r"\s", "", amount[1]).replace(",", ".")
            if Decimal(value) < Decimal("1000000000000"):
                found.setdefault("total_amount", set()).add(value)
        for match in re.finditer(
            r"(?<![\d./-])(?:(20\d{2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})"
            r"|(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(20\d{2}))(?![\d./-])",
            text,
        ):
            y, m, d, local_d, local_m, local_y = match.groups()
            try:
                value = date(int(y or local_y), int(m or local_m), int(d or local_d))
            except ValueError:
                continue
            if value <= timezone.localdate():
                found.setdefault("date", set()).add(str(value))
        if (
            index < 5
            and re.search(r"\b(?:s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?)(?=\s|$)", text, re.I)
            and len(text) <= 150
        ):
            found.setdefault("store", set()).add(text)
    return raw, {key: next(iter(values)) for key, values in found.items() if len(values) == 1}


def engine(raw, psm=6):
    binary = shutil.which(settings.OCR_BINARY)
    data = Path(settings.OCR_DATA)
    if not binary or not data.exists():
        raise Problem(
            "ocr_not_configured",
            "Lokální OCR není nainstalované. Údaje lze zadat ručně.",
            503,
        )
    try:
        version = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=3)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Problem(
            "ocr_not_configured", "OCR engine není dostupný. Údaje lze zadat ručně.", 503
        ) from error
    if "tesseract 5.5.4" not in version.stdout:
        raise Problem("ocr_not_configured", "OCR neodpovídá zamčené verzi 5.5.4.", 503)
    lock = json.loads(Path(settings.OCR_LOCK_FILE).read_text())
    for language, spec in lock["models"].items():
        path = data / (language + ".traineddata")
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != spec["sha256"]:
            raise Problem("ocr_not_configured", "OCR modely neodpovídají zamčeným součtům.", 503)
    with tempfile.TemporaryDirectory(prefix="shoplog-ocr-") as folder:
        folder = Path(folder)
        source = folder / "receipt.png"
        output = folder / "output"
        with Image.open(io.BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image).convert("L")
            image.thumbnail((2000, 2000))
            image.save(source, "PNG")
        command = [
            sys.executable,
            str(Path(__file__).with_name("ocr_worker.py")),
            binary,
            str(source),
            str(output),
            "--tessdata-dir",
            str(data),
            "-l",
            "ces+eng",
            "--oem",
            "1",
            "--psm",
            str(psm),
            "-c",
            "tessedit_create_tsv=1",
        ]
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env={
                    "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
                    "OMP_THREAD_LIMIT": "1",
                    "LANG": "C.UTF-8",
                },
            )
            deadline = time.monotonic() + 15
            try:
                while process.poll() is None:
                    if time.monotonic() > deadline:
                        raise subprocess.TimeoutExpired(command, 15)
                    if sys.platform == "darwin":
                        try:
                            memory = subprocess.check_output(
                                ["/bin/ps", "-o", "rss=", "-p", str(process.pid)],
                                text=True,
                            )
                            if int(memory.strip() or "0") > 512 * 1024:
                                raise Problem("ocr_limit", "OCR překročilo limit paměti.", 422)
                        except subprocess.CalledProcessError:
                            pass
                    time.sleep(0.05)
                if process.returncode != 0:
                    raise Problem(
                        "ocr_failed",
                        "OCR obrázek nezpracovalo. Zadejte údaje ručně.",
                        422,
                    )
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
            tsv = output.with_suffix(".tsv")
            if tsv.stat().st_size > 2 * 1024**2:
                raise Problem("ocr_failed", "Výstup OCR je příliš velký.", 422)
            return parse_tsv(tsv.read_text())
        except subprocess.TimeoutExpired as error:
            raise Problem("ocr_timeout", "Rozpoznání překročilo časový limit.", 504) from error
