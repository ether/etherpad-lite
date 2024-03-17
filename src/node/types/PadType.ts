import {MapArrayType} from "./MapType";

export type PadType = {
    id: string,
    apool: ()=>APool,
    atext: AText,
    pool: APool,
    getInternalRevisionAText: (text:number|string)=>Promise<AText>,
    getValidRevisionRange: (fromRev: string, toRev: string)=>PadRange,
    getRevisionAuthor: (rev: number)=>Promise<string>,
    getRevision: (rev?: string)=>Promise<any>,
    head: number,
    getAllAuthorColors: ()=>Promise<MapArrayType<string>>,
    remove: ()=>Promise<void>,
    text: ()=>string,
    setText: (text: string, authorId?: string)=>Promise<void>,
    appendText: (text: string)=>Promise<void>,
    getHeadRevisionNumber: ()=>number,
    getRevisionDate: (rev: number)=>Promise<number>,
    getRevisionChangeset: (rev: number)=>Promise<AChangeSet>,
    appendRevision: (changeset: AChangeSet, author: string)=>Promise<void>,
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
