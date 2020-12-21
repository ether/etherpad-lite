/*
*
* Usage -- see README.md
*
* Normal usage:                node bin/plugins/checkPlugins.js ep_whatever
* Auto fix the things it can:  node bin/plugins/checkPlugins.js ep_whatever autofix
* Auto commit, push and publish(to npm) * highly dangerous:
node bin/plugins/checkPlugins.js ep_whatever autofix autocommit

*/

const fs = require('fs');
const {exec} = require('child_process');

// get plugin name & path from user input
const pluginName = process.argv[2];

if (!pluginName) {
  console.error('no plugin name specified');
  process.exit(1);
}

const pluginPath = `node_modules/${pluginName}`;

console.log(`Checking the plugin: ${pluginName}`);

// Should we autofix?
if (process.argv[3] && process.argv[3] === 'autofix') var autoFix = true;

// Should we update files where possible?
if (process.argv[5] && process.argv[5] === 'autoupdate') var autoUpdate = true;

// Should we automcommit and npm publish?!
if (process.argv[4] && process.argv[4] === 'autocommit') var autoCommit = true;


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
  let hasAutoFixed = false;

  for (let i = 0; i < rootFiles.length; i++) {
    if (rootFiles[i].toLowerCase().indexOf('readme') !== -1) readMeFileName = rootFiles[i];
    files.push(rootFiles[i].toLowerCase());
  }

  if (files.indexOf('.git') === -1) {
    console.error('No .git folder, aborting');
    process.exit(1);
  }

  // do a git pull...
  var child_process = require('child_process');
  try {
    child_process.execSync('git pull ', {cwd: `${pluginPath}/`});
  } catch (e) {
    console.error('Error git pull', e);
  }

  try {
    const path = `${pluginPath}/.github/workflows/npmpublish.yml`;
    if (!fs.existsSync(path)) {
      console.log('no .github/workflows/npmpublish.yml, create one and set npm secret to auto publish to npm on commit');
      if (autoFix) {
        const npmpublish =
            fs.readFileSync('bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, npmpublish);
        hasAutoFixed = true;
        console.log("If you haven't already, setup autopublish for this plugin https://github.com/ether/etherpad-lite/wiki/Plugins:-Automatically-publishing-to-npm-on-commit-to-Github-Repo");
      } else {
        console.log('Setup autopublish for this plugin https://github.com/ether/etherpad-lite/wiki/Plugins:-Automatically-publishing-to-npm-on-commit-to-Github-Repo');
      }
    } else {
      // autopublish exists, we should check the version..
      // checkVersion takes two file paths and checks for a version string in them.
      const currVersionFile = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
      const existingConfigLocation = currVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const existingValue = parseInt(currVersionFile.substr(existingConfigLocation + 17, existingConfigLocation.length));

      const reqVersionFile = fs.readFileSync('bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
      const reqConfigLocation = reqVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const reqValue = parseInt(reqVersionFile.substr(reqConfigLocation + 17, reqConfigLocation.length));

      if (!existingValue || (reqValue > existingValue)) {
        const npmpublish =
            fs.readFileSync('bin/plugins/lib/npmpublish.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, npmpublish);
        hasAutoFixed = true;
      }
    }
  } catch (err) {
    console.error(err);
  }


  try {
    const path = `${pluginPath}/.github/workflows/backend-tests.yml`;
    if (!fs.existsSync(path)) {
      console.log('no .github/workflows/backend-tests.yml, create one and set npm secret to auto publish to npm on commit');
      if (autoFix) {
        const backendTests =
            fs.readFileSync('bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, backendTests);
        hasAutoFixed = true;
      }
    } else {
      // autopublish exists, we should check the version..
      // checkVersion takes two file paths and checks for a version string in them.
      const currVersionFile = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
      const existingConfigLocation = currVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const existingValue = parseInt(currVersionFile.substr(existingConfigLocation + 17, existingConfigLocation.length));

      const reqVersionFile = fs.readFileSync('bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
      const reqConfigLocation = reqVersionFile.indexOf('##ETHERPAD_NPM_V=');
      const reqValue = parseInt(reqVersionFile.substr(reqConfigLocation + 17, reqConfigLocation.length));

      if (!existingValue || (reqValue > existingValue)) {
        const backendTests =
            fs.readFileSync('bin/plugins/lib/backend-tests.yml', {encoding: 'utf8', flag: 'r'});
        fs.mkdirSync(`${pluginPath}/.github/workflows`, {recursive: true});
        fs.writeFileSync(path, backendTests);
        hasAutoFixed = true;
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (files.indexOf('package.json') === -1) {
    console.warn('no package.json, please create');
  }

  if (files.indexOf('package.json') !== -1) {
    const packageJSON = fs.readFileSync(`${pluginPath}/package.json`, {encoding: 'utf8', flag: 'r'});
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
        hasAutoFixed = true;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));
      }
    }

    if (packageJSON.toLowerCase().indexOf('repository') === -1) {
      console.warn('No repository in package.json');
      if (autoFix) {
        console.warn('Repository not detected in package.json.  Please add repository section manually.');
      }
    } else {
      // useful for creating README later.
      repository = parsedPackageJSON.repository.url;
    }

    // include lint config
    if (packageJSON.toLowerCase().indexOf('devdependencies') === -1 || !parsedPackageJSON.devDependencies.eslint) {
      console.warn('Missing eslint reference in devDependencies');
      if (autoFix) {
        const devDependencies = {
          'eslint': '^7.14.0',
          'eslint-config-etherpad': '^1.0.13',
          'eslint-plugin-mocha': '^8.0.0',
          'eslint-plugin-node': '^11.1.0',
          'eslint-plugin-prefer-arrow': '^1.2.2',
          'eslint-plugin-promise': '^4.2.1',
        };
        hasAutoFixed = true;
        parsedPackageJSON.devDependencies = devDependencies;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));

        const child_process = require('child_process');
        try {
          child_process.execSync('npm install', {cwd: `${pluginPath}/`});
          hasAutoFixed = true;
        } catch (e) {
          console.error('Failed to create package-lock.json');
        }
      }
    }

    // include peer deps config
    if (packageJSON.toLowerCase().indexOf('peerdependencies') === -1 || !parsedPackageJSON.peerDependencies) {
      console.warn('Missing peer deps reference in package.json');
      if (autoFix) {
        const peerDependencies = {
          'ep_etherpad-lite': '>=1.8.6',
        };
        hasAutoFixed = true;
        parsedPackageJSON.peerDependencies = peerDependencies;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));
        const child_process = require('child_process');
        try {
          child_process.execSync('npm install --no-save ep_etherpad-lite@file:../../src', {cwd: `${pluginPath}/`});
          hasAutoFixed = true;
        } catch (e) {
          console.error('Failed to create package-lock.json');
        }
      }
    }

    if (packageJSON.toLowerCase().indexOf('eslintconfig') === -1) {
      console.warn('No esLintConfig in package.json');
      if (autoFix) {
        const eslintConfig = {
          root: true,
          extends: 'etherpad/plugin',
        };
        hasAutoFixed = true;
        parsedPackageJSON.eslintConfig = eslintConfig;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));
      }
    }

    if (packageJSON.toLowerCase().indexOf('scripts') === -1) {
      console.warn('No scripts in package.json');
      if (autoFix) {
        const scripts = {
          'lint': 'eslint .',
          'lint:fix': 'eslint --fix .',
        };
        hasAutoFixed = true;
        parsedPackageJSON.scripts = scripts;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));
      }
    }

    if ((packageJSON.toLowerCase().indexOf('engines') === -1) || !parsedPackageJSON.engines.node) {
      console.warn('No engines or node engine in package.json');
      if (autoFix) {
        const engines = {
          node: '>=10.13.0',
        };
        hasAutoFixed = true;
        parsedPackageJSON.engines = engines;
        fs.writeFileSync(`${pluginPath}/package.json`, JSON.stringify(parsedPackageJSON, null, 2));
      }
    }
  }

  if (files.indexOf('package-lock.json') === -1) {
    console.warn('package-lock.json file not found.  Please run npm install in the plugin folder and commit the package-lock.json file.');
    if (autoFix) {
      var child_process = require('child_process');
      try {
        child_process.execSync('npm install', {cwd: `${pluginPath}/`});
        console.log('Making package-lock.json');
        hasAutoFixed = true;
      } catch (e) {
        console.error('Failed to create package-lock.json');
      }
    }
  }

  if (files.indexOf('readme') === -1 && files.indexOf('readme.md') === -1) {
    console.warn('README.md file not found, please create');
    if (autoFix) {
      console.log('Autofixing missing README.md file, please edit the README.md file further to include plugin specific details.');
      let readme = fs.readFileSync('bin/plugins/lib/README.md', {encoding: 'utf8', flag: 'r'});
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
      console.log('Autofixing missing CONTRIBUTING.md file, please edit the CONTRIBUTING.md file further to include plugin specific details.');
      let contributing = fs.readFileSync('bin/plugins/lib/CONTRIBUTING.md', {encoding: 'utf8', flag: 'r'});
      contributing = contributing.replace(/\[plugin_name\]/g, pluginName);
      fs.writeFileSync(`${pluginPath}/CONTRIBUTING.md`, contributing);
    }
  }


  if (files.indexOf('readme') !== -1 && files.indexOf('readme.md') !== -1) {
    const readme = fs.readFileSync(`${pluginPath}/${readMeFileName}`, {encoding: 'utf8', flag: 'r'});
    if (readme.toLowerCase().indexOf('license') === -1) {
      console.warn('No license section in README');
      if (autoFix) {
        console.warn('Please add License section to README manually.');
      }
    }
  }

  if (files.indexOf('license') === -1 && files.indexOf('license.md') === -1) {
    console.warn('LICENSE.md file not found, please create');
    if (autoFix) {
      hasAutoFixed = true;
      console.log('Autofixing missing LICENSE.md file, including Apache 2 license.');
      exec('git config user.name', (error, name, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        let license = fs.readFileSync('bin/plugins/lib/LICENSE.md', {encoding: 'utf8', flag: 'r'});
        license = license.replace('[yyyy]', new Date().getFullYear());
        license = license.replace('[name of copyright owner]', name);
        fs.writeFileSync(`${pluginPath}/LICENSE.md`, license);
      });
    }
  }

  let travisConfig = fs.readFileSync('bin/plugins/lib/travis.yml', {encoding: 'utf8', flag: 'r'});
  travisConfig = travisConfig.replace(/\[plugin_name\]/g, pluginName);

  if (files.indexOf('.travis.yml') === -1) {
    console.warn('.travis.yml file not found, please create.  .travis.yml is used for automatically CI testing Etherpad.  It is useful to know if your plugin breaks another feature for example.');
    // TODO: Make it check version of the .travis file to see if it needs an update.
    if (autoFix) {
      hasAutoFixed = true;
      console.log('Autofixing missing .travis.yml file');
      fs.writeFileSync(`${pluginPath}/.travis.yml`, travisConfig);
      console.log('Travis file created, please sign into travis and enable this repository');
    }
  }
  if (autoFix && autoUpdate) {
    // checks the file versioning of .travis and updates it to the latest.
    const existingConfig = fs.readFileSync(`${pluginPath}/.travis.yml`, {encoding: 'utf8', flag: 'r'});
    const existingConfigLocation = existingConfig.indexOf('##ETHERPAD_TRAVIS_V=');
    const existingValue = parseInt(existingConfig.substr(existingConfigLocation + 20, existingConfig.length));

    const newConfigLocation = travisConfig.indexOf('##ETHERPAD_TRAVIS_V=');
    const newValue = parseInt(travisConfig.substr(newConfigLocation + 20, travisConfig.length));
    if (existingConfigLocation === -1) {
      console.warn('no previous .travis.yml version found so writing new.');
      // we will write the newTravisConfig to the location.
      fs.writeFileSync(`${pluginPath}/.travis.yml`, travisConfig);
    } else if (newValue > existingValue) {
      console.log('updating .travis.yml');
      fs.writeFileSync(`${pluginPath}/.travis.yml`, travisConfig);
      hasAutoFixed = true;
    }//
  }

  if (files.indexOf('.gitignore') === -1) {
    console.warn(".gitignore file not found, please create.  .gitignore files are useful to ensure files aren't incorrectly commited to a repository.");
    if (autoFix) {
      hasAutoFixed = true;
      console.log('Autofixing missing .gitignore file');
      const gitignore = fs.readFileSync('bin/plugins/lib/gitignore', {encoding: 'utf8', flag: 'r'});
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
        hasAutoFixed = true;
      }
    }
  }

  // if we include templates but don't have translations...
  if (files.indexOf('templates') !== -1 && files.indexOf('locales') === -1) {
    console.warn('Translations not found, please create.  Translation files help with Etherpad accessibility.');
  }


  if (files.indexOf('.ep_initialized') !== -1) {
    console.warn('.ep_initialized found, please remove.  .ep_initialized should never be commited to git and should only exist once the plugin has been executed one time.');
    if (autoFix) {
      hasAutoFixed = true;
      console.log('Autofixing incorrectly existing .ep_initialized file');
      fs.unlinkSync(`${pluginPath}/.ep_initialized`);
    }
  }

  if (files.indexOf('npm-debug.log') !== -1) {
    console.warn('npm-debug.log found, please remove.  npm-debug.log should never be commited to your repository.');
    if (autoFix) {
      hasAutoFixed = true;
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

  // linting begins
  if (autoFix) {
    var lintCmd = 'npm run lint:fix';
  } else {
    var lintCmd = 'npm run lint';
  }

  try {
    child_process.execSync(lintCmd, {cwd: `${pluginPath}/`});
    console.log('Linting...');
    if (autoFix) {
      // todo: if npm run lint doesn't do anything no need for...
      hasAutoFixed = true;
    }
  } catch (e) {
    // it is gonna throw an error anyway
    console.log('Manual linting probably required, check with: npm run lint');
  }
  // linting ends.

  if (hasAutoFixed) {
    console.log('Fixes applied, please check git diff then run the following command:\n\n');
    // bump npm Version
    if (autoCommit) {
      // holy shit you brave.
      console.log('Attempting autocommit and auto publish to npm');
      // github should push to npm for us :)
      exec(`cd node_modules/${pluginName} && git rm -rf node_modules --ignore-unmatch && git add -A && git commit --allow-empty -m 'autofixes from Etherpad checkPlugins.js' && git push && cd ../..`, (error, name, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log("I think she's got it! By George she's got it!");
        process.exit(0);
      });
    } else {
      console.log(`cd node_modules/${pluginName} && git add -A && git commit --allow-empty -m 'autofixes from Etherpad checkPlugins.js' && npm version patch && git add package.json && git commit --allow-empty -m 'bump version' && git push && npm publish && cd ../..`);
    }
  }

  console.log('Finished');
});
