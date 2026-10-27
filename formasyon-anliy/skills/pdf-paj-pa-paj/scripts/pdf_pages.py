#!/usr/bin/env python3
"""Zouti PDF paj pa paj: info | text | split | images | resize.

Fòma prezantasyon Canva: 1920 x 1280 px (3:2) = 1440 x 960 pt nan PDF.
"""
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


W_PX, H_PX = 1920, 1280  # fòma Canva prezantasyon
W_PT, H_PT = W_PX * 0.75, H_PX * 0.75  # 96 dpi -> pwen PDF


def _fitz():
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz
    return fitz


def images(pdf, out):
    """Imaj PNG egzakteman 1920x1280 px pou chak paj."""
    fitz = _fitz()
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf)
    for i, page in enumerate(doc, 1):
        r = page.rect
        z = min(W_PX / r.width, H_PX / r.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
        canvas = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, W_PX, H_PX), False)
        canvas.set_rect(canvas.irect, (255, 255, 255))
        pix.set_origin((W_PX - pix.width) // 2, (H_PX - pix.height) // 2)
        canvas.copy(pix, pix.irect)
        canvas.save(out / f"paj-{i:03d}.png")
    print(f"{len(doc)} imaj {W_PX}x{H_PX} nan {out}")


def resize(pdf, out_pdf):
    """Mete chak paj sou yon kanva 1920x1280 px (1440x960 pt), santre."""
    fitz = _fitz()
    src = fitz.open(pdf)
    dst = fitz.open()
    for page in src:
        r = page.rect
        z = min(W_PT / r.width, H_PT / r.height)
        w, h = r.width * z, r.height * z
        new = dst.new_page(width=W_PT, height=H_PT)
        new.show_pdf_page(fitz.Rect((W_PT - w) / 2, (H_PT - h) / 2, (W_PT + w) / 2, (H_PT + h) / 2), src, page.number)
    dst.save(out_pdf)
    print(f"{len(dst)} paj mete an {W_PX}x{H_PX} px -> {out_pdf}")


CMDS = {"info": (info, 1), "text": (text, 2), "split": (split, 2), "images": (images, 2), "resize": (resize, 2)}

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in CMDS:
        sys.exit("Itilizasyon: pdf_pages.py info|text|split|images|resize <fichye.pdf> <sòti>")
    fn, n = CMDS[sys.argv[1]]
    if len(sys.argv) - 2 != n:
        sys.exit(f"{sys.argv[1]} bezwen {n} agiman")
    fn(*sys.argv[2:])
