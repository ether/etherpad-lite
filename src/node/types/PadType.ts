export type PadType = {
    apool: ()=>APool,
    atext: AText,
    getInternalRevisionAText: (text:string)=>Promise<AText>
}


type APool = {
    putAttrib: ([],flag: boolean)=>number
}


export type AText = {
    text: string,
    attribs: any
}