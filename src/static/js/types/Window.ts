import {ClientVarData, ClientVarPayload} from "./SocketIOMessage";
import {Pad} from "../pad";

declare global {
  interface Window {
    clientVars: ClientVarPayload;
    $: any,
    customStart?:any,
    ajlog: string
  }
  let pad: Pad
}
