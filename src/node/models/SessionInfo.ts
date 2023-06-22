export type SessionInfo = {
    [key: string]:{
        time: any;
        rev: number;
        readOnlyPadId: any;
        auth: { padID: any; sessionID: any; token: any };
        readonly: boolean;
        padId: string,
        author: string
    }}
