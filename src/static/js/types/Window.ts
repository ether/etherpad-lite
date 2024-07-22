import {ClientVarData, ClientVarPayload} from "./SocketIOMessage";
import {Pad} from "../pad";
import {Revision} from "../broadcast_revisions";

declare global {
  interface Window {
    clientVars: ClientVarPayload;
    $: any,
    customStart?:any,
    ajlog: string
    revisionInfo: Record<number|string, number|Revision>
  }
  let pad: Pad
}
