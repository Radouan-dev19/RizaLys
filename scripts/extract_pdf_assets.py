from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Maquettes" / "Maquette_Site_Fleurs_Exception.pdf"
OUT = ROOT / "public" / "images"
REFERENCE_OUT = ROOT / "tmp" / "pdfs" / "source-pages"


def save_crop(page: Image.Image, name: str, box: tuple[int, int, int, int]) -> None:
    crop = page.crop(box)
    crop.save(OUT / f"{name}.webp", "WEBP", quality=96, method=6)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    REFERENCE_OUT.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(PDF)
    pages = [Image.open(BytesIO(page.images[0].data)).convert("RGB") for page in reader.pages]

    for index, page in enumerate(pages, start=1):
        page.save(REFERENCE_OUT / f"reference-page-{index}.png", optimize=True)

    home, custom = pages

    # Page 1: the image-only areas of the three creation cards.
    save_crop(home, "creation-anniversaire", (36, 287, 340, 616))
    save_crop(home, "creation-amour", (361, 287, 664, 616))
    save_crop(home, "creation-retrouvailles", (685, 287, 988, 616))

    # Page 1: bouquet cut-outs. The source artwork is on the same warm-white ground.
    save_crop(home, "budget-35", (72, 995, 333, 1257))
    save_crop(home, "budget-55", (390, 984, 651, 1257))
    save_crop(home, "budget-85", (690, 956, 972, 1257))

    # Page 2: wrapping paper and individual flowers.
    save_crop(custom, "wrap-white", (52, 309, 348, 499))
    save_crop(custom, "wrap-gold", (365, 309, 660, 499))
    save_crop(custom, "wrap-embossed", (679, 309, 972, 499))
    save_crop(custom, "flower-rose", (52, 704, 348, 882))
    save_crop(custom, "flower-lily", (365, 704, 660, 882))
    save_crop(custom, "flower-eucalyptus", (679, 704, 972, 882))

    # Page 2: gifts are free-standing compositions, cropped before their labels.
    save_crop(custom, "extra-compagnon", (53, 1154, 346, 1361))
    save_crop(custom, "extra-douceur", (365, 1154, 660, 1361))
    save_crop(custom, "extra-protecteur", (679, 1147, 972, 1361))


if __name__ == "__main__":
    main()
