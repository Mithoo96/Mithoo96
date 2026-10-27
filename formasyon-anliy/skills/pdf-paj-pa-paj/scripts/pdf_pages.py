#!/usr/bin/env python3
"""Zouti PDF paj pa paj: info | text | split | images."""
import sys
from pathlib import Path


def info(pdf):
    from pypdf import PdfReader
    n = len(PdfReader(pdf).pages)
    print(f"{pdf}: {n} paj")


def text(pdf, out):
    from pypdf import PdfReader
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    pages = PdfReader(pdf).pages
    for i, p in enumerate(pages, 1):
        t = (p.extract_text() or "").strip()
        (out / f"paj-{i:03d}.txt").write_text(t, encoding="utf-8")
        print(f"paj {i}/{len(pages)}: {len(t)} karaktè" + ("  (VID: eskane? sèvi ak 'images')" if not t else ""))


def split(pdf, out):
    from pypdf import PdfReader, PdfWriter
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    pages = PdfReader(pdf).pages
    for i, p in enumerate(pages, 1):
        w = PdfWriter(); w.add_page(p)
        with open(out / f"paj-{i:03d}.pdf", "wb") as f:
            w.write(f)
    print(f"{len(pages)} paj separe nan {out}")


def images(pdf, out, zoom=2):
    import fitz
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf)
    for i, page in enumerate(doc, 1):
        page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).save(out / f"paj-{i:03d}.png")
    print(f"{len(doc)} imaj nan {out}")


CMDS = {"info": (info, 1), "text": (text, 2), "split": (split, 2), "images": (images, 2)}

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in CMDS:
        sys.exit("Itilizasyon: pdf_pages.py info|text|split|images <fichye.pdf> [dosye_sòti]")
    fn, n = CMDS[sys.argv[1]]
    if len(sys.argv) - 2 != n:
        sys.exit(f"{sys.argv[1]} bezwen {n} agiman")
    fn(*sys.argv[2:])
