import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tag = process.env.GITHUB_REF_NAME ?? process.env.GITHUB_REF?.replace('refs/tags/', '');
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const version = String(packageJson.version);

if (!tag || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`Expected a semantic release tag, got: ${tag ?? '(missing)'}`);
  process.exit(1);
}

if (tag !== `v${version}`) {
  console.error(`Tag ${tag} does not match package.json version v${version}`);
  process.exit(1);
}

console.log(`Release tag ${tag} matches package.json.`);
