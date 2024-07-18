import {ClientVarData} from "./SocketIOMessage";

declare global {
  interface Window {
    clientVars: ClientVarData;
    $: any,
    customStart?:any
  }
}
