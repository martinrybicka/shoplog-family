import hashlib
import re
import warnings
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from apps.core.errors import Problem

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 24_000_000


def validate_image(upload):
    if upload.size > MAX_BYTES:
        raise Problem("file_too_large", "Účtenka smí mít nejvýše 10 MiB.", 413)
    original = upload.read(MAX_BYTES + 1)
    if not original or len(original) > MAX_BYTES:
        raise Problem("file_too_large", "Účtenka je prázdná nebo přesahuje 10 MiB.", 413)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(original)) as image:
                content_type = {"JPEG": "image/jpeg", "PNG": "image/png"}.get(image.format)
                if not content_type or content_type != upload.content_type:
                    raise ValidationError(
                        {"file": "Povoleny jsou pouze skutečné JPEG/PNG s odpovídajícím MIME typem."}
                    )
                if image.width * image.height > MAX_PIXELS or getattr(image, "n_frames", 1) != 1:
                    raise ValidationError(
                        {"file": "Obrázek smí mít nejvýše 24 megapixelů a nesmí být animovaný."}
                    )
                width, height = image.size
                image.verify()
            with Image.open(BytesIO(original)) as decoded:
                decoded.load()
                preview = ImageOps.exif_transpose(decoded).convert("RGBA")
                preview.thumbnail((1600, 1600))
                clean = Image.new("RGB", preview.size, "white")
                clean.paste(preview, mask=preview.getchannel("A"))
                output = BytesIO()
                clean.save(output, format="JPEG", quality=80, optimize=True)
                preview_bytes = output.getvalue()
                if len(preview_bytes) > 2 * 1024 * 1024:
                    raise ValidationError({"file": "Náhled přesahuje povolenou velikost."})
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as error:
        raise ValidationError({"file": "Obrázek je poškozený, nepodporovaný nebo příliš velký."}) from error
    name = upload.name.replace("\\", "/").split("/")[-1]
    name = re.sub(r"[^\w .-]", "_", name, flags=re.UNICODE).strip(" .")[:140] or "uctenka"
    # Přípona odpovídá ověřenému obsahu, nikoli původní cestě klienta.
    name = name.rsplit(".", 1)[0] + (".jpg" if content_type == "image/jpeg" else ".png")
    return {
        "original_bytes": original,
        "preview_bytes": preview_bytes,
        "content_type": content_type,
        "size_bytes": len(original),
        "width": width,
        "height": height,
        "sha256": hashlib.sha256(original).hexdigest(),
        "original_filename": name,
    }
