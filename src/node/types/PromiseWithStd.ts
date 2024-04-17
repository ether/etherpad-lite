import type { ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";

export type PromiseWithStd = {
	stdout?: Readable | null;
	stderr?: Readable | null;
	child?: ChildProcess;
} & Promise<any>;
