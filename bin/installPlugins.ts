'use strict';

import {writeFileSync} from 'fs'
import {linkInstaller, installedPluginsPath} from "ep_etherpad-lite/static/js/pluginfw/installer";
import {PackageData} from "ep_etherpad-lite/node/types/PackageInfo";

const pluginsModule = require('ep_etherpad-lite/static/js/pluginfw/plugins');
if (process.argv.length === 2) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

let plugins = process.argv.slice(2)
let installFromPath = false;

const thirdOptPlug = plugins[3]

if (thirdOptPlug && thirdOptPlug.includes('path')) {
  installFromPath = true
}

plugins.indexOf('--path') !== -1 && plugins.splice(plugins.indexOf('--path'), 1);

const persistInstalledPlugins = async () => {
  const plugins:PackageData[] = []
    const installedPlugins = {plugins: plugins};
  for (const pkg of Object.values(await pluginsModule.getPackages()) as PackageData[]) {
    installedPlugins.plugins.push({
      name: pkg.name,
      version: pkg.version,
    });
  }
  installedPlugins.plugins = [...new Set(installedPlugins.plugins)];
  writeFileSync(installedPluginsPath, JSON.stringify(installedPlugins));
};

async function run() {
  for (const plugin of plugins) {
    if(installFromPath) {
      console.log(`Installing plugin from path: ${plugin}`);
        await linkInstaller.installFromPath(plugin);
        continue;
    }
    await linkInstaller.installPlugin(plugin);
  }
}

(async () => {
  await run();
  await persistInstalledPlugins();
})();
