import {Account, Adapter, AdapterPayload} from "oidc-provider";

export class OIDCAdapter implements Adapter {
    private store: Map<string, Account> = new Map();
    private logins: Map<string, Account> = new Map();
    consume(id: string): Promise<void | undefined> {
        console.log('consume', id)
        return Promise.resolve(undefined);
    }

    destroy(id: string): Promise<void | undefined> {
        console.log('destroy', id)
        return Promise.resolve(undefined);
    }

    find(id: string): Promise<AdapterPayload | void | undefined> {
        console.log('find', id)
        return Promise.resolve(undefined);
    }

    findByUid(uid: string): Promise<AdapterPayload | void | undefined> {
        console.log('findByUid', uid)
        return Promise.resolve(undefined);
    }

    findByUserCode(userCode: string): Promise<AdapterPayload | void | undefined> {
        console.log('findByUserCode', userCode)
        return Promise.resolve(undefined);
    }

    revokeByGrantId(grantId: string): Promise<void | undefined> {
        console.log('revokeByGrantId', grantId)
        return Promise.resolve(undefined);
    }

    upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void | undefined> {
        console.log('upsert', id, payload, expiresIn)
        return Promise.resolve(undefined);
    }

}
