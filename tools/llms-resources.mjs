import {JSDOM} from 'jsdom';
import {normalize} from './i18n.mjs';

// The selection is editorial; titles and excerpts always come from current built HTML.
export function createLlms(pages, origin, brand, description, selection) {
  const url = new URL(origin);
  if(url.protocol !== 'https:' || url.origin !== origin || /localhost|127\.0\.0\.1|\.vercel\.app$/.test(url.hostname)) throw new Error('llms requires the confirmed public HTTPS origin');
  const languages = pages.has('/zh/') ? ['', '/zh'] : [''];
  const entries=[];
  const used=new Set();
  for(const selected of selection) for(const prefix of languages) {
    const route=prefix+selected.route;
    if(!/^\/(?:[a-z0-9-]+\/)*$/.test(route) || /(?:api|__editor|privacy|404)/.test(route) || used.has(route)) throw new Error('Invalid or duplicate llms selection: '+route);
    used.add(route);
    const html=pages.get(route);
    if(!html) throw new Error('Missing llms page: '+route);
    const dom=new JSDOM(html), d=dom.window.document;
    try {
      const main=d.querySelector('main'), h1=main?.querySelector('h1'), source=main?.querySelector(selected.selector);
      if(!h1 || !source) throw new Error('Missing llms body evidence: '+route);
      if(/\b(?:noindex|none)\b/i.test(d.querySelector('meta[name="robots"]')?.content || '')) throw new Error('Non-indexable llms page: '+route);
      if(d.querySelector('link[rel="canonical"]')?.getAttribute('href') !== origin+route) throw new Error('Non-owner llms URL: '+route);
      const language=prefix?'zh-Hans':'en-AU';
      if(prefix ? d.documentElement.lang!=='zh-Hans' : !/^en(?:-AU)?$/i.test(d.documentElement.lang)) throw new Error('Wrong llms language: '+route);
      if(languages.length===2) for(const [lang,target] of [['en-AU',selected.route],['zh-Hans','/zh'+selected.route]]) {
        if(d.querySelector(`link[hreflang="${lang}"]`)?.getAttribute('href') !== origin+target) throw new Error('Unpaired llms page: '+route);
      }
      const evidence=normalize(source.textContent);
      const sentence=prefix?evidence.match(/^.*?[。！？]/u)?.[0]:evidence.match(/^.*?[.!?](?:\s|$)/u)?.[0];
      entries.push({route,url:origin+route,language,pairedUrl:languages.length===2?origin+(prefix?'':'/zh')+selected.route:null,group:selected.group,title:normalize([...h1.childNodes].map(n=>n.textContent.trim()).filter(Boolean).join(' ')),summary:(sentence||evidence).trim(),selector:selected.selector,evidence,reason:selected.reason,hasProjectPhotos:!!main.querySelector('.project-gallery')});
    } finally { dom.window.close(); }
  }
  const lines=[`# ${brand}`,'',`> ${description} English and 简体中文 content is available below.`,''];
  const groups=[['English services',e=>e.group==='services'&&e.language==='en-AU'],['中文服务',e=>e.group==='services'&&e.language==='zh-Hans'],['Company, service areas and contact / 公司、服务地区与联系',e=>e.group==='company'],['Guides / 实用指南',e=>e.group==='guides']];
  for(const [heading,include] of groups) {
    const chosen=entries.filter(include); if(!chosen.length) continue;
    lines.push('## '+heading,...chosen.map(e=>`- [${e.title.replaceAll('[','\\[').replaceAll(']','\\]')}](${e.url}): ${e.summary}`),'');
  }
  return {markdown:lines.join('\n'),entries};
}
