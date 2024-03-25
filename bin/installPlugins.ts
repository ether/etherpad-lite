'use strict';

import {linkInstaller, installedPluginsPath} from "ep_etherpad-lite/static/js/pluginfw/installer";
import {persistInstalledPlugins} from "./commonPlugins";

if (process.argv.length === 2) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

let args = process.argv.slice(2)

let registryPlugins: string[] = [];
let localPlugins: string[] = [];

if (args.indexOf('--path') !== -1) {
  const indexToSplit = args.indexOf('--path');
  registryPlugins = args.slice(0, indexToSplit);
  localPlugins = args.slice(indexToSplit + 1);
} else {
  registryPlugins = args;
}



async function run() {
  for (const plugin of registryPlugins) {
    console.log(`Installing plugin from registry: ${plugin}`)
    await linkInstaller.installPlugin(plugin);
  }

  for (const plugin of localPlugins) {
    console.log(`Installing plugin from path: ${plugin}`);
    await linkInstaller.installFromPath(plugin);
  }
}

(async () => {
  await run();
  await persistInstalledPlugins();
})();
