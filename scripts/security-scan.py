from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
patterns = {
    'service_role_assignment': re.compile(r'(SUPABASE_SERVICE\s*=|SERVICE_ROLE\s*=|service[_-]?role[^\n]{0,80}eyJ)', re.I),
    'database_url': re.compile(r'postgres(?:ql)?://', re.I),
    'private_key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'openai_key': re.compile(r'sk-[A-Za-z0-9]{20,}'),
    'password_assignment': re.compile(r'(DB_PASSWORD|DATABASE_PASSWORD|PRIVATE_API_KEY)\s*=', re.I),
}
ignored_prefixes = ('scripts/',)
ignored_files = {'DEPLOYMENT_AUDIT.md','APSG_DEPLOYMENT_FINAL_REPORT.md','APSG_V7_PREMIUM_DEPLOYMENT_AUDIT.md'}
findings=[]
for p in root.rglob('*'):
    if p.is_dir() or p.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.webp','.ico','.pdf','.zip'}:
        continue
    rel=str(p.relative_to(root))
    if rel in ignored_files or rel.startswith(ignored_prefixes):
        continue
    text=p.read_text(errors='ignore')
    for name,rx in patterns.items():
        if rx.search(text):
            findings.append((rel,name))
if findings:
    print('SECRET_SCAN_FINDINGS=%d' % len(findings))
    for rel,name in findings:
        print(rel, name)
    raise SystemExit(1)
print('SECRET_SCAN_FINDINGS=0')
