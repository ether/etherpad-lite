export type ResponseSpec = {
    parameters?: ParameterSpec[],
    _restPath?: string,
    operationId?: string,
    responses?: any
    description?: string,
    summary?: string,
    responseSchema?:{
        groupID?: APIResponseSpecType
        groupIDs?: APIResponseSpecType
        padIDs?: APIResponseSpecType,
        sessions?: APIResponseSpecType,
        authorID?: APIResponseSpecType,
        info?: APIResponseSpecType,
        sessionID?: APIResponseSpecType,
        text?: APIResponseSpecType,
        html?: APIResponseSpecType,
        revisions?: APIResponseSpecType,
        lastEdited?: APIResponseSpecType,
        readOnlyID?: APIResponseSpecType,
        publicStatus?: APIResponseSpecType,
        authorIDs?: APIResponseSpecType,
        padUsersCount?: APIResponseSpecType,
        padUsers?: APIResponseSpecType,
        messages?: APIResponseSpecType,
        chatHead?: APIResponseSpecType,
    }
}


export type APIResponseSpecType = {
    type?:string,
    items?: {
        type?:string,
        $ref?:string
    },
    $ref?:string
}


export type ParameterSpec = {
    $ref?: string,
}
