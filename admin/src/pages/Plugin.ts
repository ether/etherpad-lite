export type PluginDef = {
    name: string,
    description: string,
    version: string,
    time: string,
    official: boolean,
}


export type InstalledPlugin = {
    name: string,
    path: string,
    realPath: string,
    version:string,
    updatable: boolean
}


export type SearchParams = {
    searchTerm: string,
    offset: number,
    limit: number,
    sortBy: 'name'|'version',
    sortDir: 'asc'|'desc'
}