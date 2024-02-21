export type SettingsObj = {
    settingsFilename: string;
    credentialsFilename: string;
    title: string;
    favicon: string|null;
    skinName: string|null;
    skinVariants: string;
    ip: string;
    port: string|number,
    suppressErrorsInPadText: boolean,
    ssl:false|{
        key: string;
        cert: string;
        ca: string[];
    },
    socketTransportProtocols: string[];
    socketIo: {
        maxHttpBufferSize: number;
    },
    dbType: string;
    dbSettings: any,
    defaultPadText: string,
    padOptions:{
        noColors: boolean;
        showControls: boolean;
        showChat: boolean;
        showLineNumbers: boolean;
        useMonospaceFont: boolean;
        userName: string|null;
        userColor: string|null;
        rtl: boolean;
        alwaysShowChat: boolean;
        chatAndUsers: boolean;
        lang: string|null;
    },
    padShortcutEnabled: {
        altF9: boolean;
        altC: boolean;
        delete: boolean;
        cmdShift2: boolean;
        return: boolean;
        esc: boolean;
        cmdS: boolean;
        tab: boolean;
        cmdZ: boolean;
        cmdY: boolean;
        cmdB: boolean;
        cmdI: boolean;
        cmdU: boolean;
        cmd5: boolean;
        cmdShiftL: boolean;
        cmdShiftN: boolean;
        cmdShift1: boolean;
        cmdShiftC: boolean;
        cmdH: boolean;
        ctrlHome: boolean;
        pageUp: boolean;
        pageDown: boolean;
    },
    toolbar: {
        left: string[][];
        right: string[][];
        timeslider: string[][];
    },
    requireSession: boolean;
    editOnly: boolean;
    maxAge: number;
    minify: boolean;
    abiword: string|null;
    soffice: string|null;
    allowUnknownFileEnds: boolean;
    loglevel: string;
    disableIPlogging: boolean;
    automaticReconnectionTimeout: number;
    loadTest: boolean;
    dumpOnUncleanExit: boolean;
    indentationOnNewLine: boolean;
    logconfig: any;
    sessionKey:string|null|string[],
    trustProxy: boolean;
    cookie:{
        keyRotationInterval: number;
        sameSite: string;
        sessionLifetime: number;
        sessionRefreshInterval: number;
    },
    requireAuthentication: boolean;
    requireAuthorization: boolean;
    users: object,
    showSettingsInAdminPage: boolean;
    scrollWhenFocusLineIsOutOfViewport:{
        percentage: {
            editionAboveViewport: number;
            editionBelowViewport: number;
        },
        duration: number;
        percentageToScrollWhenUserPressesArrowUp: number,
        scrollWhenCaretIsInTheLastLineOfViewport: boolean
    },
    exposeVersion: boolean;
    customLocaleStrings: {},
    importExportRateLimiting: {
        windowMs: number;
        max: number;
    },
    commitRateLimiting: {
        duration: number;
        points: number;
    },
    importMaxFileSize: number;
    enableAdminUITests: boolean;
    lowerCasePadIds: boolean;
}
