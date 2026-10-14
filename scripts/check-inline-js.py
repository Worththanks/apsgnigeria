from pathlib import Path
import re, subprocess, tempfile, sys
root=Path(__file__).resolve().parents[1]
script_re=re.compile(r'<script\b([^>]*)>(.*?)</script>', re.I|re.S)
bad=[]
for p in root.rglob('*.html'):
    rel=p.relative_to(root)
    text=p.read_text(errors='ignore')
    for i,(attrs,body) in enumerate(script_re.findall(text),1):
        a=attrs.lower()
        if 'src=' in a or 'application/ld+json' in a or 'application/json' in a or 'text/template' in a:
            continue
        code=body.strip()
        if not code:
            continue
        with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False) as tmp:
            tmp.write(code)
            name=tmp.name
        res=subprocess.run(['node','--check',name],capture_output=True,text=True)
        if res.returncode:
            bad.append((str(rel),i,res.stderr.splitlines()[:3]))
if bad:
    print('INLINE_JS_SYNTAX_ERRORS=%d' % len(bad))
    for rel,i,err in bad[:50]:
        print(rel,'script',i,' | '.join(err))
    sys.exit(1)
print('INLINE_JS_SYNTAX_ERRORS=0')
