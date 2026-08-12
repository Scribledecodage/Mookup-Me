import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const tag = `v${version}`;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

try {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`La version ${version} doit respecter le format semver X.Y.Z.`);
  }

  const branch = git('branch', '--show-current');
  if (!branch) throw new Error('Impossible de déterminer la branche courante.');

  if (git('status', '--porcelain')) {
    throw new Error('Le dépôt contient des modifications non commitées. Commitez-les avant la release.');
  }

  const existingTag = (() => {
    try {
      return git('rev-parse', '--verify', `refs/tags/${tag}`);
    } catch {
      return '';
    }
  })();
  if (existingTag) throw new Error(`Le tag ${tag} existe déjà.`);

  console.log(`🚀 Publication de Mookup ${tag} depuis ${branch}...`);
  execFileSync('git', ['tag', '-a', tag, '-m', `Release ${tag}`], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', branch, tag], { stdio: 'inherit' });

  console.log('✅ Tag envoyé. GitHub Actions va compiler et publier les installeurs Electron Windows, macOS et Linux.');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
