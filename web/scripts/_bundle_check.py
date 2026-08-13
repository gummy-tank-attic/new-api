from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
idx = next((root / "dist/static/js").glob("index.*.js"))
print("index", idx.name, round(idx.stat().st_size / 1e6, 2), "MB")
text = idx.read_text(encoding="utf-8", errors="ignore")
for n in [
    "lobehub",
    "OpenAI",
    "Claude",
    "gemini",
    "katex",
    "marked",
    "i18next",
    "zhCN",
    "Pricing",
    "antd",
    "vendor-lobehub",
]:
    print(f"{text.count(n):6d}  {n}")

html = (dist / "index.html").read_text(encoding="utf-8")
print("--- html ---")
print(html)
scripts = re.findall(r'src="(/static/js/[^"]+)"', html)
total = 0
for s in scripts:
    p = dist / s.lstrip("/")
    # dist structure is dist/static/...
    p = dist / Path(s).as_posix().lstrip("/")
    if not p.exists():
        p = root / "dist" / s[1:]
    if p.exists():
        total += p.stat().st_size
        print(round(p.stat().st_size / 1e6, 2), "MB", s)
    else:
        print("missing", s, p)
print("INITIAL_JS_MB", round(total / 1e6, 2))

# lobe async present?
lobe = list((dist / "static/js/async").glob("*lobehub*"))
print("lobe_async", [(p.name, round(p.stat().st_size / 1e6, 2)) for p in lobe])
