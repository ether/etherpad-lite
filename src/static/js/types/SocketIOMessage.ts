export type SocketIOMessage = {
  type: string
  accessStatus: string
}


export type ClientVarMessage = {
  data: {
    sessionRefreshInterval: number
  }
  type: string
  accessStatus: string
}
