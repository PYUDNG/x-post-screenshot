import { rmSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const cwd = resolve(process.cwd());
const target = resolve(cwd, 'dist');

if (dirname(target) !== cwd || !target.startsWith(`${cwd}${sep}`)) {
  throw new Error(`Refusing to remove a directory outside the workspace: ${target}`);
}

rmSync(target, { recursive: true, force: true });
console.log(`Cleaned ${target}`);
