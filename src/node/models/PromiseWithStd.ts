import {Readable} from "node:stream";
import {ChildProcess} from "node:child_process";

export type PromiseWithStd = {
    stdout?: Readable|null,
    stderr?: Readable|null,
    child?: ChildProcess
} & Promise<any>