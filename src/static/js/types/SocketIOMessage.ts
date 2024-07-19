import {MapArrayType} from "../../../node/types/MapType";
import {AText} from "./AText";
import AttributePool from "../AttributePool";
import attributePool from "../AttributePool";

export type SocketIOMessage = {
  type: string
  accessStatus: string
}

export type HistoricalAuthorData = MapArrayType<{
  name: string;
  colorId: number;
  userId: string
}>

export type ServerVar = {
  rev: number
  historicalAuthorData: HistoricalAuthorData,
  initialAttributedText: string,
  apool: AttributePool
}

export type UserInfo = {
  userId: string
  colorId: number,
  name: string
}

export type ClientVarPayload = {
  readOnlyId: string
  automaticReconnectionTimeout: number
  sessionRefreshInterval: number,
  historicalAuthorData: HistoricalAuthorData,
  atext: AText,
  apool: AttributePool,
  noColors: boolean,
  userName: string,
  userColor: number,
  hideChat: boolean,
  padOptions: PadOption,
  padId: string,
  clientIp: string,
  colorPalette: MapArrayType<number>,
  accountPrivs: MapArrayType<string>,
  collab_client_vars: ServerVar,
  chatHead: number,
  readonly: boolean,
  serverTimestamp: number,
  initialOptions: MapArrayType<string>,
  userId: string,
  mode: string,
  randomVersionString: string,
  skinName: string
  skinVariants: string,
  exportAvailable: string
}

export type ClientVarData = {
  type: "CLIENT_VARS"
  data: ClientVarPayload
}

export type ClientNewChanges = {
  type : 'NEW_CHANGES'
  apool: AttributePool,
  author: string,
  changeset: string,
  newRev: number,
  payload?: ClientNewChanges
}

export type ClientAcceptCommitMessage = {
  type: 'ACCEPT_COMMIT'
  newRev: number
}

export type ClientConnectMessage = {
  type: 'CLIENT_RECONNECT',
  noChanges: boolean,
  headRev: number,
  newRev: number,
  changeset: string,
  author: string
  apool: AttributePool
}


export type UserNewInfoMessage = {
  type: 'USER_NEWINFO',
  userInfo: UserInfo
}

export type UserLeaveMessage = {
  type: 'USER_LEAVE'
  userInfo: UserInfo
}



export type ClientMessageMessage = {
  type: 'CLIENT_MESSAGE',
  payload: ClientSendMessages
}

export type ChatMessageMessage = {
  type: 'CHAT_MESSAGE'
  message: string
}

export type ChatMessageMessages = {
  type: 'CHAT_MESSAGES'
  messages: string
}

export type ClientUserChangesMessage = {
  type: 'USER_CHANGES',
  baseRev: number,
  changeset: string,
  apool: attributePool
}



export type ClientSendMessages =  ClientUserChangesMessage | ClientSendUserInfoUpdate| ClientMessageMessage | GetChatMessageMessage |ClientSuggestUserName | NewRevisionListMessage | RevisionLabel | PadOptionsMessage| ClientSaveRevisionMessage

export type ClientSaveRevisionMessage = {
  type: 'SAVE_REVISION'
}

export type GetChatMessageMessage = {
  type: 'GET_CHAT_MESSAGES',
  start: number,
  end: number
}

export type ClientSendUserInfoUpdate = {
  type: 'USERINFO_UPDATE',
  userInfo: UserInfo
}

export type ClientSuggestUserName = {
  type: 'suggestUserName',
  unnamedId: string,
  newName: string
}

export type NewRevisionListMessage = {
  type: 'newRevisionList',
  revisionList: number[]
}

export type RevisionLabel = {
  type:  'revisionLabel'
  revisionList: number[]
}

export type PadOptionsMessage = {
  type: 'padoptions'
  options: PadOption
  changedBy: string
}

export type PadOption = {
    "noColors"?:         boolean,
    "showControls"?:     boolean,
    "showChat"?:         boolean,
    "showLineNumbers"?:  boolean,
    "useMonospaceFont"?: boolean,
    "userName"?:         null|string,
    "userColor"?:        null|string,
    "rtl"?:              boolean,
    "alwaysShowChat"?:   boolean,
    "chatAndUsers"?:     boolean,
    "lang"?:             null|string,
    view? : MapArrayType<boolean>
}


type SharedMessageType = {
  payload:{
    timestamp: number
  }
}

export type x = {
  disconnect: boolean
}

export type ClientDisconnectedMessage = {
  type: "disconnected"
  disconnected: boolean
}
export type ClientVarMessage = {
  type: 'CHANGESET_REQ'| 'COLLABROOM'| 'CUSTOM'
  data:
    | ClientNewChanges
    | ClientAcceptCommitMessage
    |UserNewInfoMessage
    | UserLeaveMessage
    |ClientMessageMessage
    |ChatMessageMessage
    |ChatMessageMessages
  |ClientConnectMessage,
} | ClientVarData | ClientDisconnectedMessage

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


