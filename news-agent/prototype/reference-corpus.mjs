/**
 * Reference corpus for the news-fitness agent: Google News RSS -> publisher URL -> title + lead.
 *
 * Verified end to end on 2026-09-15, 4/4 articles. Three things the RSS feed does NOT give you, each of
 * which costs a step:
 *
 *  1. `<description>` carries only an anchor to the same Google link — there is no lead in the feed, so the
 *     article itself has to be fetched before the lead can be compared against anything.
 *  2. `<link>` is a Google redirect (`news.google.com/rss/articles/CBMi…`) that does NOT resolve server-side:
 *     following it lands back on news.google.com, and the id is protobuf rather than a base64 URL, so
 *     decoding it yields no link either. It resolves through the same batchexecute call the page itself
 *     makes, using the `data-n-a-sg` / `data-n-a-ts` pair printed into the article page.
 *  3. `<title>` is suffixed with " - Outlet", which has to come off before any length or wording is scored.
 *
 * Run: node reference-corpus.mjs  (expects g7.xml alongside; see fetchFeed below for the live query)
 */
import { readFileSync } from 'node:fs';
const xml=readFileSync('g7.xml','utf8');
const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>m[1]);
const get=(s,t)=>(s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))||[])[1];
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';

async function resolveOne(gurl){
  const id=gurl.split('/articles/')[1].split('?')[0];
  // 1) 기사 페이지에서 c-wiz 파라미터를 읽는다
  const html=await fetch(gurl,{headers:{'User-Agent':UA}}).then(r=>r.text());
  const sig=(html.match(/data-n-a-sg="([^"]+)"/)||[])[1];
  const ts =(html.match(/data-n-a-ts="([^"]+)"/)||[])[1];
  if(!sig||!ts) return {err:'no signature in page'};
  const payload=[["Fbv4je",JSON.stringify(["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],id,ts,sig]),null,"generic"]];
  const body=new URLSearchParams({'f.req':JSON.stringify([payload])});
  const res=await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute',{
    method:'POST',headers:{'User-Agent':UA,'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
  const t=await res.text();
  const m=t.match(/garturlres\\",\\"(https?:[^\\\\"]+)/);
  return m?{url:m[1].replace(/\\\\u003d/g,'=').replace(/\\\\u0026/g,'&')}:{err:'no url', head:t.slice(0,200)};
}
const strip=s=>s.replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#8217;/g,'\u2019');
const firstSentence=html=>{
  const dec=t=>t.replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&quot;/g,'"')
               .replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'").replace(/&nbsp;/g,' ').trim();
  const cut=p=>{const m=p.match(/^.*?[.!?](?=\s|$)/); return (m?m[0]:p).trim();};
  // 1) JSON-LD articleBody — 뉴스 사이트 표준
  for(const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const walk=o=>{ if(!o||typeof o!=='object')return null;
        if(typeof o.articleBody==='string'&&o.articleBody.length>80) return o.articleBody;
        for(const v of Object.values(o)){const r=walk(v); if(r)return r;} return null; };
      const b=walk(JSON.parse(m[1].trim()));
      if(b) return {lead:cut(dec(b)),via:'ld+json articleBody'};
    }catch{}
  }
  // 2) og:description / meta description
  const og=(html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{40,})["']/i)
          ||html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{40,})["']/i));
  if(og) return {lead:cut(dec(og[1])),via:'og:description'};
  // 3) 본문 <p> — 네비게이션 배제
  const body=(html.match(/<article[\s\S]*?<\/article>/i)||[html])[0]
    .replace(/<(script|style|nav|header|footer|aside)[\s\S]*?<\/\1>/gi,'');
  const ps=[...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m=>dec(m[1].replace(/<[^>]+>/g,'')))
    .filter(t=>t.split(/\s+/).length>=15 && /[.!?]/.test(t));
  return ps.length?{lead:cut(ps[0]),via:'<article> p'}:null;
};
for(const it of items.slice(0,4)){
  const raw=get(it,'title'), gurl=get(it,'link');
  const title=strip(raw).replace(/\s+-\s+[^-]{2,60}$/,'');   // " - Outlet" 제거
  const r=await resolveOne(gurl);
  console.log(`\nTITLE  ${title.slice(0,95)}`);
  if(!r.url){ console.log('  URL 실패:',r.err); continue; }
  console.log(`  URL  ${r.url.slice(0,95)}`);
  try{
    const c=new AbortController(); const to=setTimeout(()=>c.abort(),15000);
    const html=await fetch(r.url,{headers:{'User-Agent':UA},signal:c.signal,redirect:'follow'}).then(x=>x.text());
    clearTimeout(to);
    const r2=firstSentence(html);
    console.log(`  LEAD ${r2? r2.lead.slice(0,160) : '(추출 실패)'}`);
    if(r2) console.log(`       via ${r2.via}`);
  }catch(e){ console.log('  FETCH 실패:',e.name); }
}
