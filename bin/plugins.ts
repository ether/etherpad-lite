'use strict';

import {linkInstaller, checkForMigration} from "ep_etherpad-lite/static/js/pluginfw/installer";
import {persistInstalledPlugins} from "./commonPlugins";
import fs from "node:fs";
const settings = require('ep_etherpad-lite/node/utils/Settings');

if (process.argv.length === 2) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

let args = process.argv.slice(2)


const possibleActions = [
  "i",
  "install",
  "rm",
  "remove",
  "ls",
  "list"
]

const install = ()=> {

  let registryPlugins: string[] = [];
  let localPlugins: string[] = [];

  if (args.indexOf('--path') !== -1) {
    const indexToSplit = args.indexOf('--path');
    registryPlugins = args.slice(1, indexToSplit);
    localPlugins = args.slice(indexToSplit + 1);
  } else {
    registryPlugins = args;
  }

  async function run() {
    for (const plugin of registryPlugins) {
      if (possibleActions.includes(plugin)){
        continue
      }
      console.log(`Installing plugin from registry: ${plugin}`)
      if (plugin.includes('@')) {
        const [name, version] = plugin.split('@');
        await linkInstaller.installPlugin(name, version);
        continue;
      }
      await linkInstaller.installPlugin(plugin);
    }

    for (const plugin of localPlugins) {
      console.log(`Installing plugin from path: ${plugin}`);
      await linkInstaller.installFromPath(plugin);
    }
  }

  (async () => {
    await checkForMigration();
    await run();
    await persistInstalledPlugins();
  })();
}

const list = ()=>{
  const walk =  async () => {
    const plugins = fs.readFileSync(settings.root+"/var/installed_plugins.json", "utf-8")
    const pluginNames = JSON.parse(plugins).plugins.map((plugin: any) => plugin.name).join(", ")

    console.log("Installed plugins are:", pluginNames)
  }

  (async () => {
    await walk();
  })();
}

const remove = (plugins: string[])=>{
  const walk =  async () => {
    for (const plugin of plugins) {
      console.log(`Uninstalling plugin: ${plugin}`)
      await linkInstaller.uninstallPlugin(plugin);
    }
    await persistInstalledPlugins();
  }

  (async () => {
    await checkForMigration();
    await walk();
  })();
}

let action = args[0];

switch (action) {
  case "install":
    install();
    break;
  case "i":
    install();
    break;
  case "ls":
    list();
    break;
  case "list":
    list();
    break;
  case "rm":
    remove(args.slice(1));
    break;
  default:
    console.error('Expected at least one argument!');
    process.exit(1);
}


