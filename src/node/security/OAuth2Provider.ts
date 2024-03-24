import {ArgsExpressType} from "../types/ArgsExpressType";
import Provider, {Account, Configuration, InteractionResults} from 'oidc-provider';
import {generateKeyPair, exportJWK} from 'jose'
import MemoryAdapter from "./OIDCAdapter";
import path from "path";
const settings = require('../utils/Settings');
import {IncomingForm} from 'formidable'
import {Request, Response} from 'express';
import {format} from 'url'
import {ParsedUrlQuery} from "node:querystring";
const configuration: Configuration = {
    // refer to the documentation for other available configuration
    clients: [ {
        client_id: 'oidc_client',
        client_secret: 'a_different_secret',
        grant_types: ['authorization_code'],
        response_types: ['code'],
        redirect_uris: ['http://localhost:3001/cb', 'https://oauth.pstmn.io/v1/callback']
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
    findAccount: async (ctx, id) => {
        console.log("Finding account", id)
        return {
            accountId: id,
            claims: () => ({
                sub: id,
            })
        } as Account
    },

    ttl:{
        AccessToken: 1 * 60 * 60, // 1 hour in seconds
        AuthorizationCode: 10 * 60, // 10 minutes in seconds
        ClientCredentials: 1 * 60 * 60, // 1 hour in seconds
        IdToken: 1 * 60 * 60, // 1 hour in seconds
        RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
    },
    cookies: {
      keys: ['oidc'],
    },
    features:{
      devInteractions: {enabled: false},
    },
    adapter: MemoryAdapter
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


    args.app.post('/interaction/:uid', async (req, res, next) => {
        const formid = new IncomingForm();
        try {
            const {login, password} = (await formid.parse(req))[0]
            const {prompt, jti, session, params, grantId} = await oidc.interactionDetails(req, res);

            console.log("Session is", session)

            switch (prompt.name) {
                case 'login': {
                    const users = settings.users as {
                        [username: string]: {
                            password: string;
                            admin: boolean;
                        }
                    }
                    const usersArray1 = Object.keys(users).map((username) => ({
                        username,
                        ...users[username]
                    }));
                    const account = usersArray1.find((user) => user.username === login as unknown as string && user.password === password as unknown as string);
                    if (!account) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({error: "Invalid login"}));
                    }

                    if (account) {
                        await oidc.interactionFinished(req, res, {
                            login: {accountId: account.username}
                        }, {mergeWithLastSubmission: false});
                    }
                    break;
                }
                case 'consent': {
                    let grant;
                    if (grantId) {
                        // we'll be modifying existing grant in existing session
                        grant = await oidc.Grant.find(grantId);
                    } else {
                        // we're establishing a new grant
                        grant = new oidc.Grant({
                            accountId: session!.accountId,
                            clientId: params.client_id as string,
                        });
                    }

                    if (prompt.details.missingOIDCScope) {
                        grant!.addOIDCScope(prompt.details.missingOIDCScope.join(' '));
                    }
                    if (prompt.details.missingOIDCClaims) {
                        grant!.addOIDCClaims(prompt.details.missingOIDCClaims as string[]);
                    }
                    if (prompt.details.missingResourceScopes) {
                        for (const [indicator, scope] of Object.entries(prompt.details.missingResourceScopes)) {
                            grant!.addResourceScope(indicator, scope.join(' '));
                        }
                    }
                    const result = {consent: {grantId: await grant!.save()}};
                    await oidc.interactionFinished(req, res, result, {
                        mergeWithLastSubmission: true,
                    });
                    break;
                }
            }
            await next();
        } catch (err) {
            console.log(err)
            return next(err);
        }
    })


    args.app.get('/interaction/:uid', async (req: Request, res: Response, next) => {
        try {
            const {
                uid, prompt, params, session,
            } = await oidc.interactionDetails(req, res);

            console.log("Params are", params)
            params["state"] = uid

            console.log("Prompt is", prompt)
            switch (prompt.name) {
                case 'login': {
                    res.redirect(format({
                        pathname: '/views/login',
                        query: params as ParsedUrlQuery
                    }))
                    break
                }
                case 'consent': {
                    console.log("Consent")
                    res.redirect(format({
                        pathname: '/views/consent',
                        query: params as ParsedUrlQuery
                    }))
                    break
                }
                default:
                    return res.sendFile(path.join(settings.root,'src','static', 'oidc','login.html'));
            }
        } catch (err) {
            return next(err);
        }
    });


    args.app.get('/views/login', async (req, res) => {
        res.sendFile(path.join(settings.root,'src','static', 'oidc','login.html'));
    })

    args.app.get('/views/consent', async (req, res) => {
        res.sendFile(path.join(settings.root,'src','static', 'oidc','consent.html'));
    })

    args.app.get('/interaction/:uid/confirm', async (req, res) => {
        const {uid, prompt, params} = await oidc.interactionDetails(req, res);
        console.log('interaction', uid, prompt, params);
        res.render('interaction', {
            uid,
            prompt,
            params,
            title: 'Authorize',
            client: await oidc.Client.find(params.client_id!),
        });
    })

    args.app.get('/interaction/:uid', async (req, res) => {
        return res.sendFile(path.join(settings.root,'src','static', 'oidc','login.html'));
    })

    oidc.on('authorization.error', (ctx, error) => {
        console.log('authorization.error', error);
    })

    oidc.on('server_error', (ctx, error) => {
        console.log('server_error', error);
    })
    oidc.on('grant.error', (ctx, error) => {
        console.log('grant.error', error);
    })
    oidc.on('introspection.error', (ctx, error) => {
        console.log('introspection.error', error);
    })
    oidc.on('revocation.error', (ctx, error) => {
        console.log('revocation.error', error);
    })
    args.app.use("/oidc", oidc.callback());
    //cb();
}
