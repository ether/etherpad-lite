import {ResponseSpec} from "./ResponseSpec";

export type APIResource = {
    group:{
        create:ResponseSpec,
        createIfNotExistsFor: ResponseSpec,
        delete: ResponseSpec,
        listPads: ResponseSpec,
        createPad: ResponseSpec,
        listSessions: ResponseSpec,
        list: ResponseSpec,
    },
    author: {
        create: ResponseSpec,
        createIfNotExistsFor: ResponseSpec,
        listPads: ResponseSpec,
        listSessions: ResponseSpec,
        getName: ResponseSpec,
    },
    session:{
        create: ResponseSpec,
        delete: ResponseSpec,
        info: ResponseSpec,
    },
    pad:{
        listAll: ResponseSpec,
        createDiffHTML: ResponseSpec,
        create: ResponseSpec,
        getText: ResponseSpec,
        setText: ResponseSpec,
        getHTML: ResponseSpec,
        setHTML: ResponseSpec,
        getRevisionsCount: ResponseSpec,
        getLastEdited: ResponseSpec,
        delete: ResponseSpec,
        getReadOnlyID: ResponseSpec,
        setPublicStatus: ResponseSpec,
        getPublicStatus: ResponseSpec,
        authors: ResponseSpec,
        usersCount: ResponseSpec,
        users: ResponseSpec,
        sendClientsMessage: ResponseSpec,
        checkToken: ResponseSpec,
        getChatHistory: ResponseSpec,
        getChatHead: ResponseSpec,
        appendChatMessage: ResponseSpec,
    }
}
