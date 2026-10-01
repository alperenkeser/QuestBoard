from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SIZE = 256
SCALE = SIZE / 24


def point(value: float) -> int:
    return round(value * SCALE)


ASSETS.mkdir(parents=True, exist_ok=True)
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

draw.rounded_rectangle(
    (point(2.75), point(2.75), point(21.25), point(21.25)),
    radius=point(5),
    fill=(16, 22, 33, 255),
    outline=(125, 211, 252, 255),
    width=point(1.5),
)

for left, top in ((7, 7), (13, 7), (7, 13)):
    draw.rounded_rectangle(
        (point(left), point(top), point(left + 4), point(top + 4)),
        radius=point(0.7),
        fill=(186, 230, 253, 255),
    )

draw.line(
    ((point(13.4), point(15)), (point(14.65), point(16.25)), (point(17.5), point(13.5))),
    fill=(186, 230, 253, 255),
    width=point(1.7),
    joint="curve",
)

png_path = ASSETS / "questboard-icon.png"
ico_path = ASSETS / "questboard-icon.ico"
image.save(png_path, format="PNG", optimize=True)
image.save(
    ico_path,
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print(f"Generated {png_path} and {ico_path}")
