import {useStore} from "../store/store.ts";
import {isJSONClean} from "../utils/utils.ts";

export const SettingsPage = ()=>{
    const settingsSocket = useStore(state=>state.settingsSocket)

    const settings = useStore(state=>state.settings)
    return <div>
        <h1>Derzeitige Konfiguration</h1>
            <textarea value={settings} className="settings" onChange={v=>{
                useStore.getState().setSettings(v.target.value)
            }}/>
        <div className="settings-button-bar">
            <button className="settingsButton" onClick={()=>{
                if (isJSONClean(settings!)) {
                    // JSON is clean so emit it to the server
                    settingsSocket!.emit('saveSettings', settings!);
                } else {
                   console.log('Invalid JSON');
                }
            }}>Einstellungen speichern</button>
            <button className="settingsButton" onClick={()=>{
                settingsSocket!.emit('restartServer');
            }}>Etherpad neustarten</button>
        </div>
    </div>
}
