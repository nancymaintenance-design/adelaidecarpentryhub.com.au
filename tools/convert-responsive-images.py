#!/usr/bin/env python3
"""Regenerate six responsive photo families; optional Pillow utility, not a build dependency.

Run with an available Pillow installation: python tools/convert-responsive-images.py
Original PNGs remain untouched. No cropping, retouching or attribution metadata is added.
Identical inputs, Pillow/libwebp versions and options produce identical output bytes.
"""

from pathlib import Path

from PIL import Image


ASSETS = Path(__file__).resolve().parents[1] / "src" / "assets"
FAMILIES = (
    "insight-adelaide-deck-replacement",
    "insight-adelaide-heritage-timber-repairs",
    "insight-adelaide-custom-wardrobe",
    "service-renovation-carpentry",
    "service-skirting-board-installation-repairs",
    "service-door-jamb-interior-trim",
)
WIDTHS = (480, 960, 1672)


def main():
    for family in FAMILIES:
        original = ASSETS / f"{family}.png"
        with Image.open(original) as image:
            if image.size != (1672, 941):
                raise ValueError(f"Unexpected original dimensions: {original}: {image.size}")
            rgb = image.convert("RGB")
            for width in WIDTHS:
                height = round(image.height * width / image.width)
                resized = rgb.resize((width, height), Image.Resampling.LANCZOS)
                target = ASSETS / f"{family}-{width}.webp"
                resized.save(target, "WEBP", quality=82, method=6, exact=True)
                print(f"{target.name}: {width}x{height}, {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
