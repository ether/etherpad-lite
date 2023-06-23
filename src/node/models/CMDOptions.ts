export type CMDOptions = {
    cwd?: string,
    stdio?: string|any[],
    env?:  NodeJS.ProcessEnv
}

export type CMDPromise = {
    stdout: string,
    stderr: string,
    child: any
}
