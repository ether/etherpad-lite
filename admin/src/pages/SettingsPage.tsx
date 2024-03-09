import {useStore} from "../store/store.ts";
import {isJSONClean} from "../utils/utils.ts";
import {Trans} from "react-i18next";

export const SettingsPage = ()=>{
    const settingsSocket = useStore(state=>state.settingsSocket)

    const settings = useStore(state=>state.settings)

    return <div>
        <h1><Trans i18nKey="admin_settings.current"/></h1>
        <textarea value={settings} className="settings" onChange={v => {
            useStore.getState().setSettings(v.target.value)
        }}/>
        <div className="settings-button-bar">
            <button className="settingsButton" onClick={() => {
                if (isJSONClean(settings!)) {
                    // JSON is clean so emit it to the server
                    settingsSocket!.emit('saveSettings', settings!);
                    useStore.getState().setToastState({
                        open: true,
                        title: "Succesfully saved settings",
                        success: true
                    })
                } else {
                    useStore.getState().setToastState({
                        open: true,
                        title: "Error saving settings",
                        success: false
                    })
                }
            }}><Trans i18nKey="admin_settings.current_save.value"/></button>
            <button className="settingsButton" onClick={() => {
                settingsSocket!.emit('restartServer');
            }}><Trans i18nKey="admin_settings.current_restart.value"/></button>
        </div>
        <div className="separator"/>
        <div className="settings-button-bar">
            <a href="https://github.com/ether/etherpad-lite/wiki/Example-Production-Settings.JSON"><Trans
                i18nKey="admin_settings.current_example-prod"/></a>
            <a href="https://github.com/ether/etherpad-lite/wiki/Example-Development-Settings.JSON"><Trans
                i18nKey="admin_settings.current_example-devel"/></a>
        </div>
    </div>
}
