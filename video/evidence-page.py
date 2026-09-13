import html
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
log = (root / 'evidence/tokens.jsonl.transcript.txt').read_text()
rows = [json.loads(line) for line in (root / 'evidence/tokens.jsonl').read_text().splitlines()]
sections = [
    ('Actual command output: connection and discovery', log.split('3. get_schema')[0]),
    ('Actual command output: schema and transformation', '3. get_schema' + log.split('3. get_schema')[1].split('   Q ')[0]),
    ('Actual generated training rows — first 2 of 20', json.dumps(rows[:2], indent=2, ensure_ascii=False)),
    ('Actual command output: provenance and stopping point', 'rows_sha256' + log.split('rows_sha256')[1]),
]
panels = ''.join(f'<section><h2>{html.escape(title)}</h2><pre>{html.escape(body)}</pre></section>' for title, body in sections)
document = '''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ainize — recorded Graph evidence</title>
<style>body{margin:0;background:#111323;color:#f4f1ff;font:22px system-ui;padding:26px 42px}header{color:#bfa5ff;font-weight:700}h1{font-size:30px;margin:14px 0}h2{font-size:23px}p{font-size:18px;color:#c7c8d9}pre{font:17px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:365px;overflow:auto;background:#20233a;padding:18px;border-radius:10px}section{display:none}section.active{display:block}footer{position:fixed;bottom:92px;font-size:18px;color:#f7c88a}</style>
<header>AINIZE / ETHONLINE 2026 / CONTINUITY</header><h1>The Graph → reviewable training rows</h1>
<p>Evidence replay from a real command run on 2026-09-13. This page displays saved output; it is not a live application or a new query.</p>''' + panels + '''<footer>Caption-only review • no human narration • ENS deployment remains unverified</footer>
<script>const panels=[...document.querySelectorAll('section')];let current=0;function show(){panels.forEach((panel,index)=>panel.classList.toggle('active',index===current));}show();setTimeout(()=>{current=1;show();},15000);setTimeout(()=>{current=2;show();},25000);</script></html>'''
document = document.replace('Caption-only review • no human narration • ENS deployment remains unverified', 'Actual Graph response → canonical rows → provenance → content hash')
output = root / 'video/work/evidence.html'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(document)
print(output)

def evidence_page(filename, title, body):
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><title>''' + html.escape(title) + '''</title><style>body{background:#111323;color:#f4f1ff;font:23px/1.45 system-ui;padding:28px 44px}h1{font-size:32px;color:#c7b1ff}p{font-size:20px}pre{font:20px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#232740;padding:20px;border-radius:12px;max-height:350px;overflow:auto}footer{position:fixed;bottom:100px;color:#f7c88a;font-size:18px}</style><h1>''' + html.escape(title) + '''</h1><p>Recorded evidence viewer. Actual saved output/source; this is not a new live request or a deployed application UI.</p><pre>''' + html.escape(body) + '''</pre><footer>Caption-only review: human narration is missing. No successful Graph training or ENS deployment is claimed.</footer></html>'''
    page = page.replace('Caption-only review: human narration is missing. No successful Graph training or ENS deployment is claimed.', 'Ainize / Continuity / Recorded evidence and source included in the main repository')
    (output.parent / filename).write_text(page)


base = json.loads((root / 'evidence/base-demo.json').read_text())
evidence_page('base.html', 'Ainize / actual base-model response',
              'Question: What is a liquidity pool? Answer in one sentence.\n\n' + base['base']['content'] +
              f"\n\nModel: {base['model']} | mode: {base['mode']} | applied patches: {len(base['applied'])}\nObserved: {base['base']['latency_ms']} ms | {base['base']['usage']['completion_tokens']} completion tokens\nOne response; no comparative or statistical performance claim.")
upload = json.loads((root / 'evidence/tokens.jsonl.upload.json').read_text())
receipt = upload['receipt']
evidence_page('upload.html', 'Ainize / real 20-row dataset upload',
              f"{receipt['name']}\n\nDataset: {receipt['dataset_id']}\nAccepted: {receipt['rows_accepted']} | rejected: {len(receipt['rows_rejected'])}\n\nStored SHA-256:\n{receipt['sha256']}\nMatches predicted hash: {receipt['sha256_matches_prediction']}\n\nTraining requested: {upload['training_requested']}\nPublication requested: {upload['publication_requested']}\nReceipt timestamp: {upload['fetched_at']}")
contract = root / 'integrations/ens/contracts/EngramRegistrar.sol'
if contract.is_file():
    source = contract.read_text().splitlines()
    start = next((index for index, line in enumerate(source) if 'if (owner !=' in line), 0)
    excerpt = '\n'.join(f'{index + 1}: {line.strip()}' for index, line in enumerate(source) if start <= index < start + 6)
    evidence_page('ens.html', 'ENS / imported registrar source',
                  'Source: integrations/ens/contracts/EngramRegistrar.sol\n8 local security tests passing, reported by integration owner.\nSepolia deployment / live resolution: pending.\n\n' + excerpt)

comparison = json.loads((root / 'evidence/quality-demo.json').read_text())
base_answer = comparison['base']
patched_answer = comparison['patched']
compare_body = f"Existing DART patch: {comparison['patch_id']}\nCatalogue status: REJECTED; this is a live test, not a verified sale.\n\nBASE — {base_answer['usage']['completion_tokens']} tokens / {base_answer['latency_ms']} ms\n{base_answer['content']}\n\nPATCHED — {patched_answer['usage']['completion_tokens']} tokens / {patched_answer['latency_ms']} ms\n{patched_answer['content']}\n\nBoth answers contain the expected address (team review).\nOne observation, not a statistical speedup or new Graph-trained improvement."
evidence_page('compare.html', 'Existing model / actual base and patch comparison', compare_body)
compare_path = output.parent / 'compare.html'
compare_html = compare_path.read_text().replace('max-height:350px;overflow:auto', 'max-height:395px;overflow:auto').replace('font:20px/1.5 monospace', 'font:17px/1.4 monospace')
compare_html = compare_html.replace('</html>', '<script>const output=document.querySelector("pre");setTimeout(()=>output.scrollTo({top:output.scrollHeight,behavior:"smooth"}),13000);</script></html>')
compare_path.write_text(compare_html)
compare_html = '''<!doctype html><html lang="en"><meta charset="utf-8"><title>Ainize actual model comparison</title><style>@font-face{font-family:NotoKR;src:url(NotoSansKR.ttf)}body{margin:0;background:#111323;color:#f4f1ff;font:21px system-ui;padding:25px 38px}h1{color:#c7b1ff;font-size:30px;margin:8px 0}p{font-size:17px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{background:#232740;border-radius:12px;padding:18px}h2{font-size:22px;margin:0 0 12px}pre{font:17px/1.5 NotoKR,system-ui;white-space:pre-wrap;overflow-wrap:anywhere;height:295px;overflow:auto;margin:0}.metrics{font-size:19px;color:#e0cbff}footer{font-size:17px;color:#f7c88a;margin-top:15px}</style><h1>Existing model / actual base and patch comparison</h1><p>Recorded public API output • source: evidence/quality-demo.json • DART address question</p><main>'''
for label, answer in [('BASE', base_answer), ('PATCHED', patched_answer)]:
    compare_html += f"<article><h2>{label}</h2><pre>{html.escape(answer['content'])}</pre><p class=metrics>{answer['usage']['completion_tokens']} completion tokens · {answer['latency_ms']} ms</p></article>"
compare_html += '''</main><footer>Both contain the expected address, per team review. One observation; no statistical speedup.<br>Existing DART patch remains REJECTED. This is not a new Graph-trained model.</footer></html>'''
compare_path.write_text(compare_html)
reproduce = (root / 'REPRODUCE.sh').read_text()
evidence_page('reproduce.html', 'One repository / reproducible integration source',
              'github.com/ainblockchain/ainize\n\nSource and tests: integrations/mcp · integrations/ens · integrations/cli\nEvidence: recorded provider calls, 20 rows, upload receipt, model responses\n\nActual root entry script excerpt:\n' + '\n'.join(reproduce.splitlines()[:10]) + '\n\nJudges: README.md → ETHONLINE2026.md → integrations/README.md')
