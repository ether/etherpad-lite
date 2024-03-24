import {LRUCache} from 'lru-cache';
import {Adapter, AdapterPayload} from "oidc-provider";


const options = {
    max: 500,

    // for use with tracking overall storage size
    maxSize: 5000,

    // how long to live in ms
    ttl: 1000 * 60 * 5,

    // return stale items before removing from cache?
    allowStale: false,

    updateAgeOnGet: false,
    updateAgeOnHas: false,
}

const epochTime = (date = Date.now()) => Math.floor(date / 1000);

const storage = new LRUCache<string,AdapterPayload|string[]|string>(options);

function grantKeyFor(id: string) {
    return `grant:${id}`;
}

function userCodeKeyFor(userCode:string) {
    return `userCode:${userCode}`;
}

class MemoryAdapter implements Adapter{
    private readonly name: string;
    constructor(name:string) {
        this.name = name;
    }

    key(id:string) {
        return `${this.name}:${id}`;
    }

    destroy(id:string) {
        const key = this.key(id);

        const found = storage.get(key) as AdapterPayload;
        const grantId = found && found.grantId;

        storage.delete(key);

        if (grantId) {
            const grantKey = grantKeyFor(grantId);
            (storage.get(grantKey) as string[])!.forEach(token => storage.delete(token));
            storage.delete(grantKey);
        }

        return Promise.resolve();
    }

    consume(id: string) {
        (storage.get(this.key(id)) as AdapterPayload)!.consumed = epochTime();
        return Promise.resolve();
    }

    find(id: string): Promise<AdapterPayload | void | undefined> {
        return Promise.resolve<AdapterPayload>(storage.get(this.key(id)) as AdapterPayload);
    }

    findByUserCode(userCode: string) {
        const id = storage.get(userCodeKeyFor(userCode)) as string;
        return this.find(id);
    }

    upsert(id: string, payload: any, expiresIn: number) {
        console.log('upsert');
        const key = this.key(id);

        const { grantId, userCode } = payload;
        if (grantId) {
            const grantKey = grantKeyFor(grantId);
            const grant = storage.get(grantKey) as unknown as string[];
            if (!grant) {
                storage.set(grantKey, [key]);
            } else {
                grant.push(key);
            }
        }

        if (userCode) {
            storage.set(userCodeKeyFor(userCode), id, {ttl:expiresIn * 1000});
        }

        storage.set(key, payload, {ttl: expiresIn * 1000});

        return Promise.resolve();
    }

    findByUid(uid: string): Promise<AdapterPayload | void | undefined> {
        console.log('findByUid', uid);
        return Promise.resolve(undefined);
    }

    revokeByGrantId(grantId: string): Promise<void | undefined> {
        console.log('findByUid', grantId);
        return Promise.resolve(undefined);
    }
}

export default MemoryAdapter
