import {create} from "zustand";
import {Socket} from "socket.io-client";

type StoreState = {
    settings: string|undefined,
    setSettings: (settings: string) => void,
    settingsSocket: Socket|undefined,
    setSettingsSocket: (socket: Socket) => void,
    showLoading: boolean,
    setShowLoading: (show: boolean) => void,
    setPluginsSocket: (socket: Socket) => void
    pluginsSocket: Socket|undefined
}


export const useStore = create<StoreState>()((set) => ({
    settings: undefined,
    setSettings: (settings: string) => set({settings}),
    settingsSocket: undefined,
    setSettingsSocket: (socket: Socket) => set({settingsSocket: socket}),
    showLoading: false,
    setShowLoading: (show: boolean) => set({showLoading: show}),
    pluginsSocket: undefined,
    setPluginsSocket: (socket: Socket) => set({pluginsSocket: socket})
}));
