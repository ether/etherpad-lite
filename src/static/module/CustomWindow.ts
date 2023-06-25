import {extend} from "jquery";

export type CustomWindow = {
    revisionInfo: any;
    $: any;
    require: RequireFunction,
    Ace2Inner:any,
    plugins: any,
    jQuery: any,
    document: any,
    pad: any,
    clientVars: any,
    socketio: any,
}


export type RequireFunction=  {
    setRootURI: (url: string)=>void,
    setLibraryURI: (url: string)=>void,
    setGlobalKeyPath: (path: string)=>void,
}

export type CustomElementWithSheet = {
    sheet: CSSStyleSheet,
    startLoc: number
    currentLoc: number,
    id
}


export type AuthorData =  {
    colorId: number|string
}

export type Author = {
    [author:string]:AuthorData
}

export type JQueryGritter = {
    gritter: any;
    farbtastic: any;
}

export type AjaxDirectDatabaseAccess = {
        code : number
        message: string
        data: {
            directDatabaseAccess?: boolean
        }
}

export type HistoricalAuthorData = {
    userId: string,
}
