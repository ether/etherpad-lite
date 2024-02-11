export type PadDiffLineOps = {
    next: ()=>PadDiffLineOps,
    done: boolean,
    value: PadDiffLineOps
}
