#!/usr/bin/env python3
"""Derive WebP sizes for the two supplied 2:1 guide photos using Pillow.

Copy the unchanged supplied PNGs to the named src/assets files first.
No cropping, upscaling, retouching or attribution metadata is added.
This optional utility is not a site build dependency.
"""

from pathlib import Path

from PIL import Image


ASSETS = Path(__file__).resolve().parents[1] / "src" / "assets"
FAMILIES = (
    "insight-adelaide-carpentry-cost-guide",
    "insight-outdoor-timber-selection-adelaide",
)


def main():
    for family in FAMILIES:
        original = ASSETS / f"{family}.png"
        with Image.open(original) as image:
            if image.size != (1774, 887):
                raise ValueError(f"Unexpected original dimensions: {original}: {image.size}")
            rgb = image.convert("RGB")
            for width in (480, 960, 1672):
                height = round(image.height * width / image.width)
                resized = rgb.resize((width, height), Image.Resampling.LANCZOS)
                target = ASSETS / f"{family}-{width}.webp"
                resized.save(target, "WEBP", quality=82, method=6, exact=True)
                print(f"{target.name}: {width}x{height}, {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
