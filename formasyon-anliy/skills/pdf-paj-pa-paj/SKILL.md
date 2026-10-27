---
name: pdf-paj-pa-paj
description: Trete ak livre nenpòt PDF paj pa paj. Itilize l chak fwa itilizatè a bay yon PDF (pou li, rezime, analize, tradui, korije) OSWA mande pou kreye yon PDF (kou, manyèl, fich, sètifika). Li fòse travay la fèt paj pa paj, ak yon sòti separe pou chak paj.
---

# PDF paj pa paj

Règ prensipal: **pa janm trete yon PDF an gwo bloke**. Toujou paj pa paj.

## Si itilizatè a BAY yon PDF (antre)

1. Konte paj yo: `python3 scripts/pdf_pages.py info <fichye.pdf>`
2. Di itilizatè a konbyen paj ki genyen.
3. Ekstrè tèks chak paj: `python3 scripts/pdf_pages.py text <fichye.pdf> <dosye_sòti>`
   (kreye `paj-001.txt`, `paj-002.txt`, ...). Si yon paj vid (PDF eskane), fè OCR oswa konvèti l an imaj:
   `python3 scripts/pdf_pages.py images <fichye.pdf> <dosye_sòti>`, epi gade imaj la.
4. Reponn **paj pa paj**, nan fòma sa a pou CHAK paj:

   ```
   ## Paj N / TOTAL
   - Kontni prensipal: ...
   - Pwen kle: ...
   - Obsèvasyon / erè / sa ki manke: ...
   ```
5. Pa sote okenn paj. Si PDF a gen plis pase 20 paj, travay pa gwoup 10 paj epi mande si itilizatè a vle kontinye.
6. Nan fen, bay yon rezime global kout (apre tout paj yo).
7. Si itilizatè a mande yon paj presi, travay sou paj sa a sèlman.

## Si itilizatè a mande pou KREYE yon PDF (sòti)

1. Planifye plan paj yo anvan (tit chak paj, kisa k ap ladan l). Montre plan an.
2. Konstwi dokiman an paj pa paj: chak paj gen yon sèl lide/leson, ak nimewo paj.
3. Livre **twa bagay**:
   - PDF konplè a (`non.pdf`)
   - Chak paj separe: `python3 scripts/pdf_pages.py split non.pdf sòti/` → `paj-001.pdf`, `paj-002.pdf`, ...
   - Yon apèsi imaj chak paj: `python3 scripts/pdf_pages.py images non.pdf sòti/` → `paj-001.png`, ...
4. Montre chak paj ba itilizatè a youn apre lòt (imaj la) ak yon liy: "Paj N/TOTAL: <tit>". Mande validasyon anvan ou finalize si dokiman an long.

## Règ yo
- Toujou endike "Paj N sou TOTAL".
- Pa melanje kontni de paj nan yon sèl rezime.
- Si yon kòmand echwe, di sa klèman epi pwopoze yon altènativ; pa envante kontni.
- Reponn nan lang itilizatè a (Kreyòl, Franse, Anglè...).

## Depandans
`pip install pypdf pymupdf` (pymupdf fè rann imaj san poppler).
