const {regions}=require('../src/content-pack/city-streets.json');

// Only the ten existing bilingual region pages and their known HTML aliases.
// This function is shared by the Vercel middleware and the loopback preview.
function streetRedirect(input, method='GET') {
  if (!['GET','HEAD'].includes(method)) return null;
  let url;try { url=new URL(input,'https://www.adelaidecarpentryhub.com.au'); } catch { return null; }
  const match=url.pathname.match(/^(\/zh)?\/service-areas\/([a-z-]+)(?:\/index\.html|\/)?$/);
  const region=match&&regions.find(item=>item.slug===match[2]);
  if (!region || !url.searchParams.has('street')) return null;
  const street=url.searchParams.get('street');
  // Preserve unrelated query bytes, including duplicate keys and their encoding.
  const query=url.search.slice(1).split('&').filter(part=>{
    try{return decodeURIComponent(part.split('=')[0].replace(/\+/g,' '))!=='street';}catch{return true;}
  }).join('&');
  const route=`${match[1]||''}/service-areas/${region.slug}/`;
  const hash=region.locations.includes(street)?`#book-area-work&street=${encodeURIComponent(street)}`:'#book-area-work';
  return {status:308,location:route+(query?'?'+query:'')+hash};
}
module.exports={streetRedirect};
