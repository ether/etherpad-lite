'use strict';

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const semver = require('semver');

/*

Usage

node src/bin/release.js patch

*/
const usage =
    'node src/bin/release.js [patch/minor/major] -- example: "node src/bin/release.js patch"';

const release = process.argv[2];

if (!release) {
  console.log(usage);
  throw new Error('No release type included');
}

const cwd = path.join(fs.realpathSync(__dirname), '../../');
process.chdir(cwd);

const run = childProcess.execSync;

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, {encoding: 'utf8', flag: 'r'}));
const writeJson = (filename, obj) => {
  let json = JSON.stringify(obj, null, 2);
  if (json !== '' && !json.endsWith('\n')) json += '\n';
  fs.writeFileSync(filename, json);
};

const changelog = fs.readFileSync('CHANGELOG.md', {encoding: 'utf8', flag: 'r'});
const pkg = readJson('./src/package.json');
const currentVersion = pkg.version;

const newVersion = semver.inc(currentVersion, release);
if (!newVersion) {
  console.log(usage);
  throw new Error('Unable to generate new version from input');
}

const changelogIncludesVersion = changelog.indexOf(newVersion) !== -1;

if (!changelogIncludesVersion) {
  throw new Error(`No changelog record for ${newVersion}, please create changelog record`);
}

console.log('Okay looks good, lets create the package.json and package-lock.json');

pkg.version = newVersion;

writeJson('./src/package.json', pkg);

// run npm version `release` where release is patch, minor or major
run('npm install --package-lock-only', {cwd: 'src/'});
// run npm install --package-lock-only <-- required???

// Many users will be using the latest LTS version of npm, and the latest LTS version of npm uses
// lockfileVersion 1. Enforce v1 so that users don't see a (benign) compatibility warning.
if (readJson('./src/package-lock.json').lockfileVersion !== 1) {
  throw new Error('Please regenerate package-lock.json with npm v6.x.');
}

run('git add src/package.json');
run('git add src/package-lock.json');
run('git commit -m "bump version"');


run('make docs');
run('cd .. && git clone git@github.com:ether/ether.github.com.git');
run(`cp -R out/doc/ ../ether.github.com/doc/v${newVersion}`);

console.log('Once merged into master please run the following commands');
console.log(`git checkout master && git tag -a ${newVersion} -m ${newVersion} && git push origin master`);
console.log(`cd ../ether.github.com && git add . && git commit -m '${newVersion} docs' && git push`);
console.log('bin/buildForWindows.sh');
console.log('Visit https://github.com/ether/etherpad-lite/releases/new and create a new release ' +
            `with 'master' as the target and the version is ${newVersion}.  Include the windows ` +
            'zip as an asset');
console.log(`Once the new docs are uploaded then modify the download
   links (replace ${currentVersion} with ${newVersion} on etherpad.org and then pull master onto develop`);
console.log('Finally go public with an announcement via our comms channels :)');
