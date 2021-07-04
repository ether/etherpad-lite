'use strict';

/*
 * Usage -- see README.md
 *
 * Normal usage:                node src/bin/plugins/checkPlugin.js ep_whatever
 * Auto fix the things it can:  node src/bin/plugins/checkPlugin.js ep_whatever autofix
 * Auto commit, push and publish to npm (highly dangerous):
 *                              node src/bin/plugins/checkPlugin.js ep_whatever autocommit
 */

// As of v14, Node.js does not exit when there is an unhandled Promise rejection. Convert an
// unhandled rejection into an uncaught exception, which does cause Node.js to exit.
process.on('unhandledRejection', (err) => { throw err; });

const fs = require('fs');
const childProcess = require('child_process');

// get plugin name & path from user input
const pluginName = process.argv[2];

if (!pluginName) throw new Error('no plugin name specified');

const pluginPath = `node_modules/${pluginName}`;

console.log(`Checking the plugin: ${pluginName}`);

const optArgs = process.argv.slice(3);
const autoCommit = optArgs.indexOf('autocommit') !== -1;
const autoFix = autoCommit || optArgs.indexOf('autofix') !== -1;

const execSync = (cmd, opts = {}) => (childProcess.execSync(cmd, {
  cwd: `${pluginPath}/`,
  ...opts,
}) || '').toString().replace(/\n+$/, '');

const writePackageJson = (obj) => {
  let s = JSON.stringify(obj, null, 2);
  if (s.length && s.slice(s.length - 1) !== '\n') s += '\n';
  return fs.writeFileSync(`${pluginPath}/package.json`, s);
};

const updateDeps = (parsedPackageJson, key, wantDeps) => {
  const {[key]: deps = {}} = parsedPackageJson;
  let changed = false;
  for (const [pkg, verInfo] of Object.entries(wantDeps)) {
    const {ver, overwrite = true} = typeof verInfo === 'string' ? {ver: verInfo} : verInfo;
    if (deps[pkg] === ver) continue;
    if (deps[pkg] == null) {
      console.warn(`Missing dependency in ${key}: '${pkg}': '${ver}'`);
    } else {
      if (!overwrite) continue;
      console.warn(`Dependency mismatch in ${key}: '${pkg}': '${ver}' (current: ${deps[pkg]})`);
    }
    if (autoFix) {
      deps[pkg] = ver;
      changed = true;
    }
  }
  if (changed) {
    parsedPackageJson[key] = deps;
    writePackageJson(parsedPackageJson);
  }
};

const prepareRepo = () => {
  let branch = execSync('git symbolic-ref HEAD');
  if (branch !== 'refs/heads/master' && branch !== 'refs/heads/main') {
    throw new Error('master/main must be checked out');
  }
  branch = branch.replace(/^refs\/heads\//, '');
  execSync('git rev-parse --verify -q HEAD^0 || ' +
           `{ echo "Error: no commits on ${branch}" >&2; exit 1; }`);
  execSync('git rev-parse --verify @{u}'); // Make sure there's a remote tracking branch.
  const modified = execSync('git diff-files --name-status');
  if (modified !== '') throw new Error(`working directory has modifications:\n${modified}`);
  const untracked = execSync('git ls-files -o --exclude-standard');
  if (untracked !== '') throw new Error(`working directory has untracked files:\n${untracked}`);
  const indexStatus = execSync('git diff-index --cached --name-status HEAD');
  if (indexStatus !== '') throw new Error(`uncommitted staged changes to files:\n${indexStatus}`);
  execSync('git pull --ff-only', {stdio: 'inherit'});
  if (execSync('git rev-list @{u}...') !== '') throw new Error('repo contains unpushed commits');
  if (autoCommit) {
    execSync('git config --get user.name');
    execSync('git config --get user.email');
  }
};

if (autoCommit) {
  console.warn('Auto commit is enabled, I hope you know what you are doing...');
}

fs.readdir(pluginPath, (err, rootFiles) => {
  // handling error
  if (err) {
    return console.log(`Unable to scan directory: ${err}`);
  }

  // rewriting files to lower case
  const files = [];

  // some files we need to know the actual file name.  Not compulsory but might help in the future.
  let readMeFileName;
  let repository;

  for (let i = 0; i < rootFiles.length; i++) {
    if (rootFiles[i].toLowerCase().indexOf('readme') !== -1) readMeFileName = rootFiles[i];
    files.push(rootFiles[i].toLowerCase());
  }

  if (files.indexOf('.git') === -1) throw new Error('No .git folder, aborting');
  prepareRepo();

  try {
    const path = `${pluginPath}/.github/workflows/npmpublish.yml`;
    if (!fs.existsSync(path)) {
      console.log('no .github/workflows/npmpublish.yml');
      console.log('create one and set npm secret to auto publish to npm on commit');
      if (autoFix) {
        const npmpublish =
            fs.readFileSync('src/bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, npmpublish);
        console.log("If you haven't already, setup autopublish for this plugin https://github.com/ether/etherpad-lite/wiki/Plugins:-Automatically-publishing-to-npm-on-commit-to-Github-Repo");
      } else {
        console.log('Setup autopublish for this plugin https://github.com/ether/etherpad-lite/wiki/Plugins:-Automatically-publishing-to-npm-on-commit-to-Github-Repo');
      }
    } else {
      // autopublish exists, we should check the version..
      // checkVersion takes two file paths and checks for a version string in them.
      const currVersionFile = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
      const existingConfigLocation = currVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const existingValue = parseInt(
          currVersionFile.substr(existingConfigLocation + 17, existingConfigLocation.length));

      const reqVersionFile =
          fs.readFileSync('src/bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
      const reqConfigLocation = reqVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const reqValue =
          parseInt(reqVersionFile.substr(reqConfigLocation + 17, reqConfigLocation.length));

      if (!existingValue || (reqValue > existingValue)) {
        const npmpublish =
            fs.readFileSync('src/bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, npmpublish);
      }
    }
  } catch (err) {
    console.error(err);
  }


  try {
    const path = `${pluginPath}/.github/workflows/backend-tests.yml`;
    if (!fs.existsSync(path)) {
      console.log('no .github/workflows/backend-tests.yml');
      console.log('create one and set npm secret to auto publish to npm on commit');
      if (autoFix) {
        const backendTests =
            fs.readFileSync('src/bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, backendTests);
      }
    } else {
      // autopublish exists, we should check the version..
      // checkVersion takes two file paths and checks for a version string in them.
      const currVersionFile = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
      const existingConfigLocation = currVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const existingValue = parseInt(
          currVersionFile.substr(existingConfigLocation + 17, existingConfigLocation.length));

      const reqVersionFile =
          fs.readFileSync('src/bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
      const reqConfigLocation = reqVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const reqValue =
          parseInt(reqVersionFile.substr(reqConfigLocation + 17, reqConfigLocation.length));

      if (!existingValue || (reqValue > existingValue)) {
        const backendTests =
            fs.readFileSync('src/bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, backendTests);
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (files.indexOf('package.json') === -1) {
    console.warn('no package.json, please create');
  }

  if (files.indexOf('package.json') !== -1) {
    const packageJSON =
        fs.readFileSync(`${pluginPath}/package.json`, {encoding: 'utf8', flag: 'r'});
    const parsedPackageJSON = JSON.parse(packageJSON);
    if (autoFix) {
      let updatedPackageJSON = false;
      if (!parsedPackageJSON.funding) {
        updatedPackageJSON = true;
        parsedPackageJSON.funding = {
          type: 'individual',
          url: 'https://etherpad.org/',
        };
      }
      if (updatedPackageJSON) {
        writePackageJson(parsedPackageJSON);
      }
    }

    if (packageJSON.toLowerCase().indexOf('repository') === -1) {
      console.warn('No repository in package.json');
      if (autoFix) {
        console.warn('Repository not detected in package.json.  Add repository section.');
      }
    } else {
      // useful for creating README later.
      repository = parsedPackageJSON.repository.url;
    }

    updateDeps(parsedPackageJSON, 'devDependencies', {
      'eslint': '^7.28.0',
      'eslint-config-etherpad': '^2.0.0',
      'eslint-plugin-cypress': '^2.11.3',
      'eslint-plugin-eslint-comments': '^3.2.0',
      'eslint-plugin-mocha': '^9.0.0',
      'eslint-plugin-node': '^11.1.0',
      'eslint-plugin-prefer-arrow': '^1.2.3',
      'eslint-plugin-promise': '^5.1.0',
      'eslint-plugin-you-dont-need-lodash-underscore': '^6.12.0',
    });

    updateDeps(parsedPackageJSON, 'peerDependencies', {
      // Some plugins require a newer version of Etherpad so don't overwrite if already set.
      'ep_etherpad-lite': {ver: '>=1.8.6', overwrite: false},
    });

    if (packageJSON.toLowerCase().indexOf('eslintconfig') === -1) {
      console.warn('No esLintConfig in package.json');
      if (autoFix) {
        const eslintConfig = {
          root: true,
          extends: 'etherpad/plugin',
        };
        parsedPackageJSON.eslintConfig = eslintConfig;
        writePackageJson(parsedPackageJSON);
      }
    }

    if (packageJSON.toLowerCase().indexOf('scripts') === -1) {
      console.warn('No scripts in package.json');
      if (autoFix) {
        const scripts = {
          'lint': 'eslint .',
          'lint:fix': 'eslint --fix .',
        };
        parsedPackageJSON.scripts = scripts;
        writePackageJson(parsedPackageJSON);
      }
    }

    if ((packageJSON.toLowerCase().indexOf('engines') === -1) || !parsedPackageJSON.engines.node) {
      console.warn('No engines or node engine in package.json');
      if (autoFix) {
        const engines = {
          node: '>=12.13.0',
        };
        parsedPackageJSON.engines = engines;
        writePackageJson(parsedPackageJSON);
      }
    }
  }

  if (files.indexOf('package-lock.json') === -1) {
    console.warn('package-lock.json not found');
    if (!autoFix) {
      console.warn('Run npm install in the plugin folder and commit the package-lock.json file.');
    }
  }
  if (files.indexOf('readme') === -1 && files.indexOf('readme.md') === -1) {
    console.warn('README.md file not found, please create');
    if (autoFix) {
      console.log('Autofixing missing README.md file');
      console.log('please edit the README.md file further to include plugin specific details.');
      let readme = fs.readFileSync('src/bin/plugins/lib/README.md', {encoding: 'utf8', flag: 'r'});
      readme = readme.replace(/\[plugin_name\]/g, pluginName);
      if (repository) {
        const org = repository.split('/')[3];
        const name = repository.split('/')[4];
        readme = readme.replace(/\[org_name\]/g, org);
        readme = readme.replace(/\[repo_url\]/g, name);
        fs.writeFileSync(`${pluginPath}/README.md`, readme);
      } else {
        console.warn('Unable to find repository in package.json, aborting.');
      }
    }
  }

  if (files.indexOf('contributing') === -1 && files.indexOf('contributing.md') === -1) {
    console.warn('CONTRIBUTING.md file not found, please create');
    if (autoFix) {
      console.log('Autofixing missing CONTRIBUTING.md file, please edit the CONTRIBUTING.md ' +
                  'file further to include plugin specific details.');
      let contributing =
          fs.readFileSync('src/bin/plugins/lib/CONTRIBUTING.md', {encoding: 'utf8', flag: 'r'});
      contributing = contributing.replace(/\[plugin_name\]/g, pluginName);
      fs.writeFileSync(`${pluginPath}/CONTRIBUTING.md`, contributing);
    }
  }


  if (readMeFileName) {
    let readme =
        fs.readFileSync(`${pluginPath}/${readMeFileName}`, {encoding: 'utf8', flag: 'r'});
    if (readme.toLowerCase().indexOf('license') === -1) {
      console.warn('No license section in README');
      if (autoFix) {
        console.warn('Please add License section to README manually.');
      }
    }
    // eslint-disable-next-line max-len
    const publishBadge = `![Publish Status](https://github.com/ether/${pluginName}/workflows/Node.js%20Package/badge.svg)`;
    // eslint-disable-next-line max-len
    const testBadge = `![Backend Tests Status](https://github.com/ether/${pluginName}/workflows/Backend%20tests/badge.svg)`;
    if (readme.toLowerCase().indexOf('travis') !== -1) {
      console.warn('Remove Travis badges');
    }
    if (readme.indexOf('workflows/Node.js%20Package/badge.svg') === -1) {
      console.warn('No Github workflow badge detected');
      if (autoFix) {
        readme = `${publishBadge} ${testBadge}\n\n${readme}`;
        // write readme to file system
        fs.writeFileSync(`${pluginPath}/${readMeFileName}`, readme);
        console.log('Wrote Github workflow badges to README');
      }
    }
  }

  if (files.indexOf('license') === -1 && files.indexOf('license.md') === -1) {
    console.warn('LICENSE.md file not found, please create');
    if (autoFix) {
      console.log('Autofixing missing LICENSE.md file, including Apache 2 license.');
      let license =
          fs.readFileSync('src/bin/plugins/lib/LICENSE.md', {encoding: 'utf8', flag: 'r'});
      license = license.replace('[yyyy]', new Date().getFullYear());
      license = license.replace('[name of copyright owner]', execSync('git config user.name'));
      fs.writeFileSync(`${pluginPath}/LICENSE.md`, license);
    }
  }

  if (files.indexOf('.gitignore') === -1) {
    console.warn('.gitignore file not found, please create.  .gitignore files are useful to ' +
                 "ensure files aren't incorrectly commited to a repository.");
    if (autoFix) {
      console.log('Autofixing missing .gitignore file');
      const gitignore =
          fs.readFileSync('src/bin/plugins/lib/gitignore', {encoding: 'utf8', flag: 'r'});
      fs.writeFileSync(`${pluginPath}/.gitignore`, gitignore);
    }
  } else {
    let gitignore =
        fs.readFileSync(`${pluginPath}/.gitignore`, {encoding: 'utf8', flag: 'r'});
    if (gitignore.indexOf('node_modules/') === -1) {
      console.warn('node_modules/ missing from .gitignore');
      if (autoFix) {
        gitignore += 'node_modules/';
        fs.writeFileSync(`${pluginPath}/.gitignore`, gitignore);
      }
    }
  }

  // if we include templates but don't have translations...
  if (files.indexOf('templates') !== -1 && files.indexOf('locales') === -1) {
    console.warn('Translations not found, please create.  ' +
                 'Translation files help with Etherpad accessibility.');
  }


  if (files.indexOf('.ep_initialized') !== -1) {
    console.warn(
        '.ep_initialized found, please remove.  .ep_initialized should never be commited to git ' +
        'and should only exist once the plugin has been executed one time.');
    if (autoFix) {
      console.log('Autofixing incorrectly existing .ep_initialized file');
      fs.unlinkSync(`${pluginPath}/.ep_initialized`);
    }
  }

  if (files.indexOf('npm-debug.log') !== -1) {
    console.warn('npm-debug.log found, please remove.  npm-debug.log should never be commited to ' +
                 'your repository.');
    if (autoFix) {
      console.log('Autofixing incorrectly existing npm-debug.log file');
      fs.unlinkSync(`${pluginPath}/npm-debug.log`);
    }
  }

  if (files.indexOf('static') !== -1) {
    fs.readdir(`${pluginPath}/static`, (errRead, staticFiles) => {
      if (staticFiles.indexOf('tests') === -1) {
        console.warn('Test files not found, please create tests.  https://github.com/ether/etherpad-lite/wiki/Creating-a-plugin#writing-and-running-front-end-tests-for-your-plugin');
      }
    });
  } else {
    console.warn('Test files not found, please create tests.  https://github.com/ether/etherpad-lite/wiki/Creating-a-plugin#writing-and-running-front-end-tests-for-your-plugin');
  }

  // Install dependencies so we can run ESLint. This should also create or update package-lock.json
  // if autoFix is enabled.
  const npmInstall = `npm install${autoFix ? '' : ' --no-package-lock'}`;
  execSync(npmInstall, {stdio: 'inherit'});
  // The ep_etherpad-lite peer dep must be installed last otherwise `npm install` will nuke it. An
  // absolute path to etherpad-lite/src is used here so that pluginPath can be a symlink.
  execSync(
      `${npmInstall} --no-save ep_etherpad-lite@file:${__dirname}/../../`, {stdio: 'inherit'});
  // linting begins
  try {
    console.log('Linting...');
    const lintCmd = autoFix ? 'npx eslint --fix .' : 'npx eslint';
    execSync(lintCmd, {stdio: 'inherit'});
  } catch (e) {
    // it is gonna throw an error anyway
    console.log('Manual linting probably required, check with: npm run lint');
  }
  // linting ends.

  if (autoFix) {
    const unchanged = JSON.parse(execSync(
        'untracked=$(git ls-files -o --exclude-standard) || exit 1; ' +
        'git diff-files --quiet && [ -z "$untracked" ] && echo true || echo false'));
    if (!unchanged) {
      // Display a diff of changes. Git doesn't diff untracked files, so they must be added to the
      // index. Use a temporary index file to avoid modifying Git's default index file.
      execSync('git read-tree HEAD; git add -A && git diff-index -p --cached HEAD && echo ""', {
        env: {...process.env, GIT_INDEX_FILE: '.git/checkPlugin.index'},
        stdio: 'inherit',
      });
      fs.unlinkSync(`${pluginPath}/.git/checkPlugin.index`);

      const cmd = [
        'git add -A',
        'git commit -m "autofixes from Etherpad checkPlugin.js"',
        'git push',
      ].join(' && ');
      if (autoCommit) {
        console.log('Attempting autocommit and auto publish to npm');
        execSync(cmd, {stdio: 'inherit'});
      } else {
        console.log('Fixes applied. Check the above git diff then run the following command:');
        console.log(`(cd node_modules/${pluginName} && ${cmd})`);
      }
    } else {
      console.log('No changes.');
    }
  }

  console.log('Finished');
});
