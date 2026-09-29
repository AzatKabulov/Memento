"""Regenerate Memento's launch and app icon assets after npm install."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT = (
    ROOT
    / "node_modules/@expo-google-fonts/instrument-serif/400Regular"
    / "InstrumentSerif_400Regular.ttf"
)
ASSETS = ROOT / "assets"
BROWN = "#4B3026"
IVORY = "#F6EBDC"
AMBER = "#D8AD78"
SCALE = 3


def mark(size: int, background: bool) -> Image.Image:
    dimension = size * SCALE
    canvas = Image.new(
        "RGBA", (dimension, dimension), BROWN if background else (0, 0, 0, 0)
    )
    font = ImageFont.truetype(str(FONT), int(dimension * 0.75))
    bounds = font.getbbox("M")
    glyph = Image.new("RGBA", (bounds[2] - bounds[0], bounds[3] - bounds[1]))
    ImageDraw.Draw(glyph).text((-bounds[0], -bounds[1]), "M", font=font, fill=IVORY)
    x = (dimension - glyph.width) // 2 - int(dimension * 0.025)
    y = (dimension - glyph.height) // 2 + int(dimension * 0.03)
    canvas.alpha_composite(glyph, (x, y))

    # A small amber moment on the upper right doubles as the mark's time cue.
    draw = ImageDraw.Draw(canvas)
    cx, cy = int(dimension * 0.77), int(dimension * 0.27)
    radius = int(dimension * 0.036)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=AMBER)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


mark(1024, True).convert("RGB").save(ASSETS / "icon.png", optimize=True)
mark(1024, False).save(ASSETS / "adaptive-foreground.png", optimize=True)
mark(512, False).save(ASSETS / "splash-mark.png", optimize=True)
