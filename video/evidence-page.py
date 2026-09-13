import html
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
log = (root / 'evidence/graph-run.txt').read_text()
rows = [json.loads(line) for line in (root / 'evidence/graph-rows.jsonl').read_text().splitlines()]
sections = [
    ('Actual command output: connection and discovery', log.split('3. get_schema')[0]),
    ('Actual command output: schema and transformation', '3. get_schema' + log.split('3. get_schema')[1].split('   Q ')[0]),
    ('Actual generated training rows', json.dumps(rows, indent=2, ensure_ascii=False)),
    ('Actual command output: provenance and stopping point', 'rows_sha256' + log.split('rows_sha256')[1]),
]
panels = ''.join(f'<section><h2>{html.escape(title)}</h2><pre>{html.escape(body)}</pre></section>' for title, body in sections)
document = '''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ainize — recorded Graph evidence</title>
<style>body{margin:0;background:#111323;color:#f4f1ff;font:22px system-ui;padding:26px 42px}header{color:#bfa5ff;font-weight:700}h1{font-size:30px;margin:14px 0}h2{font-size:23px}p{font-size:18px;color:#c7c8d9}pre{font:17px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:365px;overflow:auto;background:#20233a;padding:18px;border-radius:10px}section{display:none}section.active{display:block}footer{position:fixed;bottom:92px;font-size:18px;color:#f7c88a}</style>
<header>AINIZE / ETHONLINE 2026 / CONTINUITY</header><h1>The Graph → reviewable training rows</h1>
<p>Evidence replay from a real command run on 2026-09-13. This page displays saved output; it is not a live application or a new query.</p>''' + panels + '''<footer>Caption-only review • no human narration • ENS deployment remains unverified</footer>
<script>const panels=[...document.querySelectorAll('section')];let current=0;function show(){panels.forEach((panel,index)=>panel.classList.toggle('active',index===current));}show();setInterval(()=>{current=(current+1)%panels.length;show();},22000);</script></html>'''
output = root / 'video/work/evidence.html'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(document)
print(output)
