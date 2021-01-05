'use strict';

const fs = require('fs');
const child_process = require('child_process');
const semver = require('../src/node_modules/semver');

/*

Usage

node bin/release.js patch

*/
const usage = 'node bin/release.js [patch/minor/major] -- example: "node bin/release.js patch"';

const release = process.argv[2];

if(!release) {
  console.log(usage);
  throw new Error('No release type included');
}

const changelog = fs.readFileSync('CHANGELOG.md', {encoding: 'utf8', flag: 'r'});
let packageJson = fs.readFileSync('./src/package.json', {encoding: 'utf8', flag: 'r'});
packageJson = JSON.parse(packageJson);
const currentVersion = packageJson.version;

const newVersion = semver.inc(currentVersion, release);
if(!newVersion) {
  console.log(usage);
  throw new Error('Unable to generate new version from input');
}

const changelogIncludesVersion = changelog.indexOf(newVersion) !== -1;

if(!changelogIncludesVersion) {
  throw new Error('No changelog record for ', newVersion, ' - please create changelog record');
}

console.log('Okay looks good, lets create the package.json and package-lock.json');

packageJson.version = newVersion;

fs.writeFileSync('src/package.json', JSON.stringify(packageJson, null, 2));

// run npm version `release` where release is patch, minor or major
child_process.execSync('npm install --package-lock-only', {cwd: `src/`});
// run npm install --package-lock-only <-- required???

child_process.execSync(`git checkout -b release/${newVersion}`);
child_process.execSync(`git add src/package.json`);
child_process.execSync(`git add src/package-lock.json`);
child_process.execSync(`git commit -m 'bump version'`);
child_process.execSync(`git push origin release/${newVersion}`);


child_process.execSync(`make docs`);
child_process.execSync(`git clone git@github.com:ether/ether.github.com.git`);
child_process.execSync(`cp -R out/doc/ ether.github.com/doc/v${newVersion}`);

console.log('Once merged into master please run the following commands');
console.log(`git tag -a ${newVersion} -m ${newVersion} && git push origin master`);
console.log(`cd ether.github.com && git add . && git commit -m '${newVersion} docs'`);
console.log(`Build the windows zip`)
console.log(`Visit https://github.com/ether/etherpad-lite/releases/new and create a new release with 'master' as the target and the version is ${newVersion}.  Include the windows zip as an assett`)
console.log('Once the new docs are uploaded then modify the download link on etherpad.org and then pull master onto develop');
console.log('Finally go public with an announcement via our comms channels :)');
