'use strict';

import {writeFileSync} from 'fs'
import {manager, installedPluginsPath} from "../static/js/pluginfw/installer";
import {PackageData} from "../node/types/PackageInfo";

const pluginsModule = require('../static/js/pluginfw/plugins');
if (process.argv.length === 2) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

const plugins = process.argv.slice(2);

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
    await manager.install(plugin);
  }
}

(async () => {
  await run();
  await persistInstalledPlugins();
})();
