import {ArgsExpressType} from "../types/ArgsExpressType";
import Provider, {Account, Configuration, InteractionResults} from 'oidc-provider';
import {generateKeyPair, exportJWK} from 'jose'
import MemoryAdapter from "./OIDCAdapter";
import path from "path";
const settings = require('../utils/Settings');
import {IncomingForm} from 'formidable'
import express, {Request, Response} from 'express';
import {format} from 'url'
import {ParsedUrlQuery} from "node:querystring";
import cors from 'cors'
import {Http2ServerRequest, Http2ServerResponse} from "node:http2";
const configuration: Configuration = {
    scopes: ['openid', 'profile', 'email'],
    findAccount: async (ctx, id) => {
        const users = settings.users as {
            [username: string]: {
                password: string;
                is_admin: boolean;
            }
        }

        const usersArray1 = Object.keys(users).map((username) => ({
            username,
            ...users[username]
        }));

        const account = usersArray1.find((user) => user.username === id);

        return {
            accountId: id,
            claims: () => ({
                sub: id,
                test: "test",
                admin: account?.is_admin
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
    claims: {
        openid: ['sub'],
        email: ['email'],
        profile: ['name'],
        admin: ['admin']
    },
    cookies: {
      keys: ['oidc'],
    },
    features:{
      devInteractions: {enabled: false},
    },
    adapter: MemoryAdapter
};


/*
This function is used to initialize the OAuth2 provider
 */
export const expressCreateServer = async (hookName: string, args: ArgsExpressType, cb: Function) => {
    const {privateKey} = await generateKeyPair('RS256');
    const privateKeyJWK = await exportJWK(privateKey);
    // Use cors middleware
    args.app.use(cors({
        origin: ['http://localhost:3001', 'https://oauth.pstmn.io'], // replace with your allowed origins
    }));

    const oidc = new Provider('http://localhost:9001', {
        ...configuration, jwks: {
            keys: [
                privateKeyJWK
            ],
        },
        conformIdTokenClaims: false,
        claims: {
            address: ['address'],
            email: ['email', 'email_verified'],
            phone: ['phone_number', 'phone_number_verified'],
            profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name',
                'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
        },
        features:{
             userinfo: {enabled: true},

             claimsParameter: {enabled: true},
            devInteractions: {enabled: false},
          resourceIndicators: {enabled: true,   defaultResource(ctx) {
                  return ctx.origin;
              },
              getResourceServerInfo(ctx, resourceIndicator, client) {
                  return {
                      scope: client.scope as string,
                      audience: 'account',
                      accessTokenFormat: 'jwt',
                  };
              },
              useGrantedResource(ctx, model) {
                  return true;
              },},
            jwtResponseModes: {enabled: true},
        },
        clientBasedCORS: (ctx, origin, client) => {
          return true
        },
        extraTokenClaims: async (ctx, token) => {


            if(token.kind === 'AccessToken') {
                // Add your custom claims here. For example:
                const users = settings.users as {
                    [username: string]: {
                        password: string;
                        is_admin: boolean;
                    }
                }

                const usersArray1 = Object.keys(users).map((username) => ({
                    username,
                    ...users[username]
                }));

                const account = usersArray1.find((user) => user.username === token.accountId);
                return {
                    admin: account?.is_admin
                };
            }
        },
        clients: settings.sso.clients
    });


    args.app.post('/interaction/:uid', async (req: Http2ServerRequest, res: Http2ServerResponse, next:Function) => {
        const formid = new IncomingForm();
        try {
            // @ts-ignore
            const {login, password} = (await formid.parse(req))[0]
            const {prompt, jti, session,cid, params, grantId} = await oidc.interactionDetails(req, res);

            const client = await oidc.Client.find(params.client_id as string);

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
                        // @ts-ignore
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
        } catch (err:any) {
            return res.writeHead(500).end(err.message);
        }
    })


    args.app.get('/interaction/:uid', async (req: Request, res: Response, next: Function) => {
        try {
            const {
                uid, prompt, params, session,
            } = await oidc.interactionDetails(req, res);

            params["state"] = uid

            switch (prompt.name) {
                case 'login': {
                    res.redirect(format({
                        pathname: '/views/login.html',
                        query: params as ParsedUrlQuery
                    }))
                    break
                }
                case 'consent': {
                    res.redirect(format({
                        pathname: '/views/consent.html',
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


    args.app.use('/views/', express.static(path.join(settings.root,'src','static', 'oidc'), {maxAge: 1000 * 60 * 60 * 24}));

    /*
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
    })*/
    args.app.use("/oidc", oidc.callback());
    //cb();
}
