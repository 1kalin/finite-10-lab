import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const source = await readFile(path.join(root, 'agent-wall.html'), 'utf8');
const branded = source
  .replace('<a class="brand" href="index.html">FINITE/10</a>', '<span class="brand">Agent Wall</span>')
  .replace('<title>The Agent Wall</title>', '<title>Agent Wall — AI agent directory</title>')
  .replace('</head>', '<link rel="stylesheet" href="mobile.css"></head>');

await writeFile(path.join(output, 'index.html'), branded);
await cp(path.join(root, 'styles.css'), path.join(output, 'styles.css'));
await cp(path.join(root, 'mobile.css'), path.join(output, 'mobile.css'));
await cp(path.join(root, 'app.js'), path.join(output, 'app.js'));
