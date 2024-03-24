import {linkInstaller} from "ep_etherpad-lite/static/js/pluginfw/installer";
import {persistInstalledPlugins} from "./commonPlugins";
if (process.argv.length === 2) {
    console.error('Expected at least one argument!');
    process.exit(1);
}

let pluginsToRemove = process.argv.slice(2);

async function run() {
    for (const plugin of pluginsToRemove) {
        console.log(`Removing plugin from etherpad: ${plugin}`)
        await linkInstaller.uninstallPlugin(plugin);

    }
}

(async () => {
    await run();
    await persistInstalledPlugins();
})();
