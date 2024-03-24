import {ArgsExpressType} from "../types/ArgsExpressType";
import Provider, {Account, Configuration} from 'oidc-provider';
import {generateKeyPair, exportJWK} from 'jose'

const configuration: Configuration = {
    // refer to the documentation for other available configuration
    clients: [ {
        client_id: 'oidc_client',
        client_secret: 'a_different_secret',
        grant_types: ['authorization_code'],
        response_types: ['code'],
        redirect_uris: ['http://localhost:3001/cb']
    },
        {
            client_id: 'app',
            client_secret: 'a_secret',
            grant_types: ['client_credentials'],
            redirect_uris: [],
            response_types: []
        }
    ],
    scopes: ['openid', 'profile', 'email'],
    //adapter: MemoryAdapter,
    /*findAccount: async (ctx, id) => {
        console.log(ctx, id)
        return {
            accountId: id,
            claims: () => ({
                sub: id,
            })
        } satisfies Account
    },*/
};

export const expressCreateServer = async (hookName: string, args: ArgsExpressType, cb: Function) => {
    const {privateKey} = await generateKeyPair('RS256');
    const privateKeyJWK = await exportJWK(privateKey);
    const oidc = new Provider('http://localhost:9001', {
        ...configuration, jwks: {
            keys: [
                privateKeyJWK
            ],
        },
    });

    oidc.on('authorization.error', (ctx, error) => {
        console.log('authorization.error', error);
    })
    args.app.use("/oidc", oidc.callback());
    cb();
}
