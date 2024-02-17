#!/usr/bin/env node

'use strict';

const {promises: fs} = require('fs');
const pluginsModule = require('../static/js/pluginfw/plugins');
const installer = require('../static/js/pluginfw/installer');

if (process.argv.length === 2) {
    console.error('Expected at least one argument!');
    process.exit(1);
}

const plugins = process.argv.slice(2)

const persistInstalledPlugins = async () => {
    const installedPlugins = {plugins: []};
    for (const pkg of Object.values(await pluginsModule.getPackages())) {
        installedPlugins.plugins.push({
            name: pkg.name,
            version: pkg.version,
        });
    }
    installedPlugins.plugins = [...new Set(installedPlugins.plugins)];
    await fs.writeFile(installer.installedPluginsPath, JSON.stringify(installedPlugins));
};

async function run() {
    for (const plugin of plugins) {
        await installer.manager.install(plugin);
    }
}

(async () => {
    await run();
    await persistInstalledPlugins();
})()