"""Convert the Lumina-SIS Markdown documentation into a print-ready HTML.

Usage:
    python /app/scripts/build_docs.py

Produces:
    /app/docs/LUMINA_SIS_DOCUMENTATION.html   (styled, printable)
    /app/backend/uploads/lumina-sis-documentation.md
    /app/backend/uploads/lumina-sis-documentation.html
"""
import markdown
from pathlib import Path
import shutil

SRC = Path("/app/docs/LUMINA_SIS_DOCUMENTATION.md")
OUT_HTML = Path("/app/docs/LUMINA_SIS_DOCUMENTATION.html")
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

CSS = """
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #0f172a;
    line-height: 1.6;
    max-width: 960px;
    margin: 0 auto;
    padding: 48px 32px;
    background: #ffffff;
}
h1, h2, h3, h4 { color: #0b1220; letter-spacing: -0.01em; }
h1 { font-size: 34px; margin: 0 0 8px; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; }
h2 { font-size: 24px; margin-top: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
h3 { font-size: 18px; margin-top: 28px; color: #1e293b; }
h4 { font-size: 15px; margin-top: 20px; color: #334155; }
p, li { font-size: 14.5px; }
a { color: #4f46e5; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
    background: #f1f5f9; padding: 2px 6px; border-radius: 4px;
    font-family: "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 0.92em; color: #0f172a;
}
pre {
    background: #0b1220; color: #e2e8f0; padding: 16px 20px;
    border-radius: 10px; overflow-x: auto; font-size: 13px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}
pre code { background: transparent; color: inherit; padding: 0; }
table {
    border-collapse: collapse; width: 100%; margin: 14px 0 24px;
    background: #ffffff; border: 1px solid #e2e8f0; font-size: 13.5px;
}
th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; vertical-align: top; }
th { background: #f8fafc; color: #0f172a; font-weight: 600; }
tr:last-child td { border-bottom: none; }
blockquote {
    border-left: 4px solid #4f46e5; margin: 16px 0;
    padding: 8px 16px; background: #eef2ff; color: #312e81;
    border-radius: 4px;
}
hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
.doc-cover {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #ffffff; padding: 48px; border-radius: 16px;
    margin-bottom: 40px; box-shadow: 0 12px 32px rgba(79, 70, 229, 0.25);
}
.doc-cover h1 { color: #ffffff; border: none; margin: 0 0 16px; font-size: 44px; }
.doc-cover p { margin: 6px 0; opacity: 0.95; }
.doc-cover .meta { font-size: 13px; opacity: 0.8; margin-top: 20px; }
.badge {
    display: inline-block; padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; margin-right: 6px;
}
.badge-blue { background: #dbeafe; color: #1e3a8a; }
.badge-green { background: #dcfce7; color: #14532d; }
.badge-red { background: #fee2e2; color: #7f1d1d; }
@media print {
    body { padding: 24px; max-width: 100%; }
    pre { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
    .doc-cover { background: #4f46e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { break-inside: auto; }
    tr { break-inside: avoid; break-after: auto; }
}
"""

COVER = """
<div class="doc-cover">
  <h1>Lumina-SIS</h1>
  <p style="font-size:18px;font-weight:500;">Comprehensive System Documentation</p>
  <p>Multi-tenant Student Information System · Full-stack (FastAPI + React 19)</p>
  <p class="meta">Version 1.0 &middot; July 2025 &middot; Auto-generated from source</p>
</div>
"""


def build():
    md_text = SRC.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_text,
        extensions=["extra", "tables", "toc", "fenced_code", "sane_lists"],
    )
    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lumina-SIS · Comprehensive Documentation</title>
<style>{CSS}</style>
</head>
<body>
{COVER}
{html_body}
</body>
</html>
"""
    OUT_HTML.write_text(html_doc, encoding="utf-8")
    # Also copy to backend/uploads so it's downloadable via /api/uploads/{filename}
    shutil.copy(SRC, UPLOAD_DIR / "lumina-sis-documentation.md")
    shutil.copy(OUT_HTML, UPLOAD_DIR / "lumina-sis-documentation.html")
    print(f"wrote {OUT_HTML}")
    print(f"wrote {UPLOAD_DIR / 'lumina-sis-documentation.md'}")
    print(f"wrote {UPLOAD_DIR / 'lumina-sis-documentation.html'}")


if __name__ == "__main__":
    build()
