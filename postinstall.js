import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve('./package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const devDependencies = packageJson.devDependencies || {};
let allDevDependenciesInstalled = true;

for (const dep in devDependencies) {
  try {
    console.log(dep)
    fs.statSync('node_modules/' + dep);
  } catch (error) {
    allDevDependenciesInstalled = false;
    console.error(`DevDependency ${dep} is not installed.`);
  }
}

if (allDevDependenciesInstalled) {
  execSync('pnpm run build:etherpad', { stdio: 'inherit' });
}
