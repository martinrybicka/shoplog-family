"""Pouze syntetická fotografie bez skutečných nákupních údajů."""

import os
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont


def receipt_bytes():
    image = Image.new("RGB", (1100, 800), "white")
    draw = ImageDraw.Draw(image)
    from pathlib import Path

    font_path = os.environ.get("OCR_TEST_FONT") or next(
        (
            str(p)
            for p in [
                Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            ]
            if p.exists()
        ),
        "DejaVuSans.ttf",
    )
    font = ImageFont.truetype(font_path, 42)
    for i, text in enumerate(
        ["Zkusebni obchod s.r.o.", "Datum 10.01.2026", "Jablka 29,00 Kc", "CELKEM 1234,50 Kc"]
    ):
        draw.text((60, 50 + i * 100), text, font=font, fill="black")
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()
