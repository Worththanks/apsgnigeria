from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
attr = re.compile(r'''(?:href|src)=["']([^"']+)["']''', re.I)
ignore_prefix = ('http://','https://','mailto:','tel:','sms:','whatsapp:','data:','blob:','javascript:','#')
missing = []
for f in root.rglob('*.html'):
    if any(part.startswith('.') for part in f.relative_to(root).parts):
        continue
    text = f.read_text(errors='ignore')
    for m in attr.finditer(text):
        url = m.group(1).strip()
        if not url or '${' in url or '{{' in url or url.startswith(ignore_prefix) or url.startswith('//'):
            continue
        path = url.split('#',1)[0].split('?',1)[0]
        if not path:
            continue
        target = root / path.lstrip('/') if path.startswith('/') else (f.parent / path)
        if not target.exists():
            missing.append((str(f.relative_to(root)), url, str(target.relative_to(root))))
if missing:
    print('BROKEN_LOCAL_LINKS=%d' % len(missing))
    for row in missing:
        print(' | '.join(row))
    raise SystemExit(1)
print('BROKEN_LOCAL_LINKS=0')
