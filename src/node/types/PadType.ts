import {MapArrayType} from "./MapType";

export type PadType = {
    id: string,
    apool: ()=>APool,
    atext: AText,
    pool: APool,
    getInternalRevisionAText: (text:string)=>Promise<AText>,
    getValidRevisionRange: (fromRev: string, toRev: string)=>PadRange,
    getRevision: (rev?: string)=>Promise<any>,
    head: number,
    getAllAuthorColors: ()=>Promise<MapArrayType<string>>,
}


type PadRange = {
    startRev: string,
    endRev: string,
}


export type APool = {
    putAttrib: ([],flag?: boolean)=>number,
    numToAttrib: MapArrayType<any>,
    toJsonable: ()=>any,
    clone: ()=>APool,
    check: ()=>Promise<void>,
    eachAttrib: (callback: (key: string, value: any)=>void)=>void,
}


export type AText = {
    text: string,
    attribs: any
}


export type PadAuthor = {

}

export type AChangeSet = {

}
