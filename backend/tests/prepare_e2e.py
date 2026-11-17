"""Vytvoří pouze syntetický obrázek pro izolované lokální E2E; nezakládá účty."""

from pathlib import Path

from .synthetic_receipt import receipt_bytes

if __name__ == "__main__":
    target = Path(__file__).resolve().parents[2] / ".runtime/receipt.png"
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(receipt_bytes())
    print("Syntetická účtenka pro E2E připravena v .runtime/receipt.png.")
