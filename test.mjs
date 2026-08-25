import fs from 'node:fs';
const sites=JSON.parse(fs.readFileSync(new URL('./sites.json',import.meta.url)));
if(sites.length!==10)throw new Error('expected exactly 10 sites');
for(const site of sites){const p=new URL(`./${site.slug}.html`,import.meta.url);if(!fs.existsSync(p))throw new Error(`missing ${site.slug}`);const html=fs.readFileSync(p,'utf8');for(const required of [site.name,'<canvas','app.js','Preview reservation',`$${site.price}`,'Prototype · no payments'])if(!html.includes(required))throw new Error(`${site.slug} missing ${required}`);if(!html.includes('Demo claimed')&&!html.includes('Illustrative demo'))throw new Error(`${site.slug} missing truthful demo label`);if(html.includes('£'))throw new Error(`${site.slug} still contains GBP pricing`)}
console.log('10/10 generated storefront checks passed');

const flagship=fs.readFileSync(new URL('./agent-wall.html',import.meta.url),'utf8');
for(const required of ['Preview a placement','Proposed one-time price','no pay-to-rank claims','no personal data requested','creates no hold'])if(!flagship.includes(required))throw new Error(`flagship positioning missing ${required}`);
if((flagship.match(/btn primary/g)||[]).length!==2)throw new Error('flagship must keep one primary journey expressed at hero and selected-tile action');
console.log('Agent Wall positioning and trust checks passed');
