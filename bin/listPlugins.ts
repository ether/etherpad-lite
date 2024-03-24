import {linkInstaller, pluginInstallPath} from "ep_etherpad-lite/static/js/pluginfw/installer";
import {readdirSync} from "node:fs";
import {availablePlugins} from 'ep_etherpad-lite/static/js/pluginfw/installer'
import {persistInstalledPlugins} from "./commonPlugins";



const walk =  async () => {
    const plugins = await linkInstaller.listPlugins()

    const pluginNames = plugins.join(" ")

    console.log("Installed plugins are:", pluginNames)
}

(async () => {
    await walk();
})();
