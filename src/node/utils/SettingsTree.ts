export class SettingsTree {
    private children: Map<string, SettingsNode>;
    constructor() {
        this.children = new Map();
    }

    public addChild(key: string, value: string) {
        this.children.set(key, new SettingsNode(key, value));
    }

    public removeChild(key: string) {
        this.children.delete(key);
    }

    public getChild(key: string) {
        return this.children.get(key);
    }

    public hasChild(key: string) {
        return this.children.has(key);
    }
}


export class SettingsNode {
    private readonly key: string;
    private value: string|undefined;
    private children: Map<string, SettingsNode>;

    constructor(key: string, value?: string) {
        this.key = key;
        this.value = value;
        this.children = new Map();
    }

    public addChild(key: string[], value?: string) {
        let depth = 0

        while (depth < key.length) {
            const k = key[depth];
            const slicedKey = key.slice(depth + 1)
            depth++;
            if(this.key === k) {
                console.log("same key")
                continue
            }
            if (this.children.has(k)) {
                console.log("has child", k)
                this.children.get(k)!.addChild(slicedKey, value);
            } else {
                const newNode = new SettingsNode(k);
                this.children.set(k, newNode);
                if(slicedKey.length > 0)
                    newNode.addChild(slicedKey, value);
                else
                    newNode.value = value;
                this.children.get(k)!.addChild(slicedKey, undefined);
            }
        }
    }

    public getChild(key: string) {
        return this.children.get(key);
    }

    public hasChild(key: string) {
        return this.children.has(key);
    }
}
