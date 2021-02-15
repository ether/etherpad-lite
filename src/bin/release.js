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

// Run command capturing stdout. Trailing newlines are stripped (like the shell does).
const runc =
    (cmd, opts = {}) => childProcess.execSync(cmd, {encoding: 'utf8', ...opts}).replace(/\n+$/, '');
// Run command without capturing stdout.
const run = (cmd, opts = {}) => childProcess.execSync(cmd, {stdio: 'inherit', ...opts});

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, {encoding: 'utf8', flag: 'r'}));
const writeJson = (filename, obj) => {
  let json = JSON.stringify(obj, null, 2);
  if (json !== '' && !json.endsWith('\n')) json += '\n';
  fs.writeFileSync(filename, json);
};

const assertWorkDirClean = (opts = {}) => {
  opts.cwd = runc('git rev-parse --show-cdup', opts) || cwd;
  const m = runc('git diff-files --name-status', opts);
  if (m !== '') throw new Error(`modifications in working directory ${opts.cwd}:\n${m}`);
  const u = runc('git ls-files -o --exclude-standard', opts);
  if (u !== '') throw new Error(`untracked files in working directory ${opts.cwd}:\n${u}`);
  const s = runc('git diff-index --cached --name-status HEAD', opts);
  if (s !== '') throw new Error(`uncommitted changes in working directory ${opts.cwd}:\n${s}`);
};

const assertBranchCheckedOut = (branch, opts = {}) => {
  const b = runc('git symbolic-ref HEAD', opts);
  if (b !== `refs/heads/${branch}`) {
    const d = opts.cwd ? path.resolve(cwd, opts.cwd) : cwd;
    throw new Error(`${branch} must be checked out (cwd: ${d})`);
  }
};

const assertUpstreamOk = (branch, opts = {}) => {
  const upstream = runc(`git rev-parse --symbolic-full-name ${branch}@{u}`, opts);
  if (!(new RegExp(`^refs/remotes/[^/]+/${branch}`)).test(upstream)) {
    throw new Error(`${branch} should track origin/${branch}; see git branch --set-upstream-to`);
  }
  try {
    run(`git merge-base --is-ancestor ${branch} ${branch}@{u}`);
  } catch (err) {
    if (err.status !== 1) throw err;
    throw new Error(`${branch} is ahead of origin/${branch}; do you need to push?`);
  }
};

const dirExists = (dir) => {
  try {
    return fs.statSync(dir).isDirectory();
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return false;
  }
};

// Sanity checks for Etherpad repo.
assertWorkDirClean();
assertBranchCheckedOut('develop');
assertUpstreamOk('develop');
assertUpstreamOk('master');

// Sanity checks for documentation repo.
if (!dirExists('../ether.github.com')) {
  throw new Error('please clone documentation repo: ' +
                  '(cd .. && git clone git@github.com:ether/ether.github.com.git)');
}
assertWorkDirClean({cwd: '../ether.github.com/'});
assertBranchCheckedOut('master', {cwd: '../ether.github.com/'});
assertUpstreamOk('master', {cwd: '../ether.github.com/'});

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
run(`cp -R out/doc/ ../ether.github.com/doc/v${newVersion}`);

console.log('Once merged into master please run the following commands');
console.log(`git checkout master && git tag -a ${newVersion} -m ${newVersion} && git push origin master`);
console.log(`cd ../ether.github.com && git add . && git commit -m '${newVersion} docs' && git push`);
console.log('bin/buildForWindows.sh');
console.log('Visit https://github.com/ether/etherpad-lite/releases/new and create a new release ' +
            `with 'master' as the target and the version is ${newVersion}.  Include the windows ` +
            'zip as an asset');
console.log('Once the new docs are uploaded then modify the download links (replace ' +
            `${currentVersion} with ${newVersion} on etherpad.org and then pull master onto ` +
            'develop)');
console.log('Finally go public with an announcement via our comms channels :)');
