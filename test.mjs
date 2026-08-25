import fs from 'node:fs';
const sites=JSON.parse(fs.readFileSync(new URL('./sites.json',import.meta.url)));
if(sites.length!==10)throw new Error('expected exactly 10 sites');
for(const site of sites){const p=new URL(`./${site.slug}.html`,import.meta.url);if(!fs.existsSync(p))throw new Error(`missing ${site.slug}`);const html=fs.readFileSync(p,'utf8');for(const required of [site.name,'<canvas','app.js','Preview reservation',`$${site.price}`,'Prototype · no payments','Demo claimed'])if(!html.includes(required))throw new Error(`${site.slug} missing ${required}`);if(html.includes('£'))throw new Error(`${site.slug} still contains GBP pricing`)}
console.log('10/10 generated storefront checks passed');
