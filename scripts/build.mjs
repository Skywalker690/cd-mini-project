/* Optional packaging step. Opening index.html requires no build or Node.js. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid static output path.');
await fs.access(path.join(root, 'index.html'));
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'compiler.js', 'examples.js', 'ast-tree.js', 'app.js', '.nojekyll']) {
  await fs.copyFile(path.join(root, file), path.join(output, file));
}
await fs.cp(path.join(root, 'compiler'), path.join(output, 'compiler'), { recursive: true });
for (const folder of ['docs', 'submission']) {
  await fs.mkdir(path.join(output, folder), { recursive: true });
}
for (const file of ['docs/grammar.md', 'submission/Project_Report.docx', 'submission/Presentation.pptx']) {
  await fs.copyFile(path.join(root, file), path.join(output, file));
}
console.log('Static site ready in dist/. Upload its contents to any static host.');
