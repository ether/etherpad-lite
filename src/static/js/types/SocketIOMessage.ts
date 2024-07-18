import {MapArrayType} from "../../../node/types/MapType";
import {AText} from "./AText";
import AttributePool from "../AttributePool";

export type SocketIOMessage = {
  type: string
  accessStatus: string
}

export type ClientVarData = {
  sessionRefreshInterval: number,
  historicalAuthorData:MapArrayType<{
    name: string;
    colorId: string;
  }>,
  atext: AText,
  apool: AttributePool,
  noColors: boolean,
  userName: string,
  userColor:string,
  hideChat: boolean,
  padOptions: MapArrayType<string>,
  padId: string,
  clientIp: string,
  colorPalette: MapArrayType<string>,
  accountPrivs: MapArrayType<string>,
  collab_client_vars: MapArrayType<string>,
  chatHead: number,
  readonly: boolean,
  serverTimestamp: number,
  initialOptions: MapArrayType<string>,
  userId: string,
}

export type ClientVarMessage = {
  data:  ClientVarData,
  type: string
  accessStatus: string
}

export type SocketClientReadyMessage = {
  type: string
  component: string
  padId: string
  sessionID: string
  token: string
  userInfo: {
    colorId: string|null
    name: string|null
  },
  reconnect?: boolean
  client_rev?: number
}


