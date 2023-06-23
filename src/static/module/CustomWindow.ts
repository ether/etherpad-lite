export type CustomWindow = {
    require: RequireFunction,
    Ace2Inner:any,
    plugins: any,
    jQuery: any,
    document: any,
}


export type RequireFunction=  {
    setRootURI: (url: string)=>void,
    setLibraryURI: (url: string)=>void,
    setGlobalKeyPath: (path: string)=>void,
}
