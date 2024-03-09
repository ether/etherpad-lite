import {useEffect} from 'react'
import './App.css'
import {connect} from 'socket.io-client'
import {isJSONClean} from './utils/utils.ts'
import {NavLink, Outlet} from "react-router-dom";
import {useStore} from "./store/store.ts";
import {LoadingScreen} from "./utils/LoadingScreen.tsx";

export const App = ()=> {
    const setSettings = useStore(state => state.setSettings);

    useEffect(() => {
        useStore.getState().setShowLoading(true);
        const settingSocket = connect('http://localhost:9001/settings', {
            transports: ['websocket'],
        });

        const pluginsSocket = connect('http://localhost:9001/pluginfw/installer', {
          transports: ['websocket'],
        })

        pluginsSocket.on('connect', () => {
            useStore.getState().setPluginsSocket(pluginsSocket);
        });


        settingSocket.on('connect', () => {
            useStore.getState().setSettingsSocket(settingSocket);
            settingSocket.emit('load');
            console.log('connected');
        });
        settingSocket.on('disconnect', (reason) => {
            // The settingSocket.io client will automatically try to reconnect for all reasons other than "io
            // server disconnect".
            if (reason === 'io server disconnect') settingSocket.connect();
        });

        settingSocket.on('settings', (settings) => {
            /* Check whether the settings.json is authorized to be viewed */
            if (settings.results === 'NOT_ALLOWED') {
                console.log('Not allowed to view settings.json')
                return;
            }

            /* Check to make sure the JSON is clean before proceeding */
            if (isJSONClean(settings.results)) {
                setSettings(settings.results);
            } else {
                alert('Invalid JSON');
            }
            useStore.getState().setShowLoading(false);
        });

        settingSocket.on('saveprogress', (status)=>{
            console.log(status)
        })

        return () => {
            settingSocket.disconnect();
            pluginsSocket.disconnect()
        }
    }, []);

    return <div id="wrapper">
        <LoadingScreen/>
        <div className="menu">
            <h1>Etherpad</h1>
            <ul>
                <li><NavLink to="/plugins">Home</NavLink></li>
                <li><NavLink to={"/settings"}>Einstellungen</NavLink></li>
                <li>            <NavLink to={"/help"}>Hilfe</NavLink></li>
            </ul>
        </div>
        <div className="innerwrapper">
            <Outlet/>
        </div>
    </div>
}

export default App
