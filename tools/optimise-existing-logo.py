"""Export the approved logo for the 36–42px header; preserve original and alpha."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / "src" / "assets"
source = assets / "mel-one-logo.png"
target = assets / "mel-one-logo-168.webp"
with Image.open(source) as image:
    if image.size != (1402, 1122):
        raise ValueError(f"Unexpected approved logo dimensions: {image.size}")
    logo = image.convert("RGBA")
    logo.thumbnail((168, 168), Image.Resampling.LANCZOS)
    logo.save(target, "WEBP", lossless=True, method=6, exact=True)
    print(f"{source.name}: {source.stat().st_size} bytes; {target.name}: {logo.width}x{logo.height}, {target.stat().st_size} bytes")
