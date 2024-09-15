import {ArgsExpressType} from "../types/ArgsExpressType";
import {MapArrayType} from "../types/MapType";
import {IncomingForm} from "formidable";
import {ErrorCaused} from "../types/ErrorCaused";
import createHTTPError from "http-errors";
const apiHandler = require('./APIHandler')
import {serve, setup} from 'swagger-ui-express'
import express from "express";
const settings = require('../utils/Settings')


type RestAPIMapping = {
    apiVersion: string;
    functionName: string,
    summary?: string,
    operationId?: string,
    requestBody?: any,
    responses?: any,
    tags?: string[],
}


const mapping = new Map<string, Record<string,RestAPIMapping>>


const GET = "GET"
const POST = "POST"
const PUT = "PUT"
const DELETE = "DELETE"
const PATCH = "PATCH"


const defaultResponses = {
  "200": {
    "description": "ok (code 0)",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "code": {
              "type": "integer",
              "example": 0
            },
            "message": {
              "type": "string",
              "example": "ok"
            },
            "data": {
              "type": "object",
              "properties": {
                "groupID": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  },
  "400": {
    "description": "generic api error (code 1)",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "code": {
              "type": "integer",
              "example": 1
            },
            "message": {
              "type": "string",
              "example": "error message"
            },
            "data": {
              "type": "object",
              "example": null
            }
          }
        }
      }
    }
  },
  "401": {
    "description": "no or wrong API key (code 4)",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "code": {
              "type": "integer",
              "example": 4
            },
            "message": {
              "type": "string",
              "example": "no or wrong API key"
            },
            "data": {
              "type": "object",
              "example": null
            }
          }
        }
      }
    }
  },
  "500": {
    "description": "internal api error (code 2)",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "code": {
              "type": "integer",
              "example": 2
            },
            "message": {
              "type": "string",
              "example": "internal error"
            },
            "data": {
              "type": "object",
              "example": null
            }
          }
        }
      }
    }
  },
  "tags": [
    "group"
  ],
  "parameters": []
}

const prepareResponses = (data: {
  type: string,
  properties: Record<string, {
    type: string
  }>,
})=>{
  return {
    ...defaultResponses,
    200: {
      ...defaultResponses["200"],
      content: {
        ...defaultResponses["200"].content,
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...defaultResponses["200"].content["application/json"].schema.properties,
              data: {
                type: "object",
                properties: {
                  groupID: {
                    type: "string"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}



const prepareDefinition = (mapping: Map<string, Record<string, RestAPIMapping>>)=>{
  const authenticationMethod = settings.authenticationMethod


  const definitions: {
    "openapi": string,
    "info": {
      "title": string,
      "description": string,
      "termsOfService": string,
      "contact": {
        "name": string,
        "url": string,
        "email": string,
      },
    },
    "components": {
      "securitySchemes": {
        "apiKey": {
          "type": string,
          "name": string,
          "in": string

        },
        "sso"?: {
          "type": string,
          "flows": {
            "authorizationCode": {
              "authorizationUrl": string,
              "tokenUrl": string,
              "scopes": {
                "openid": string,
                "profile": string,
                "email": string,
                "admin": string
              }
            }
          }
        }
      },
    },
    "servers": [
      {
        "url": string
      }
    ],
    "paths": Record<string, Record<string, {
      "summary": string,
      "operationId": string,
      "requestBody"?: any,
      "responses": any,
      "parameters"?: any,
      "tags": Array<string | {name: string, description: string}>,
    }>>,
    "security": any[]
  } = {
    "openapi": "3.0.2",
    "info": {
      "title": "Etherpad API",
      "description": "Etherpad is a real-time collaborative editor scalable to thousands of simultaneous real time users. It provides full data export capabilities, and runs on your server, under your control.",
      "termsOfService": "https://etherpad.org/",
      "contact": {
        "name": "The Etherpad Foundation",
        "url": "https://etherpad.org/",
        "email": "",
      },
    },
    "components": {
      "securitySchemes": {
        "apiKey": {
          "type": "apiKey",
          "name": "apikey",
          "in": "query"

        },
      },
    },
    "servers": [
      {
        "url": "http://localhost:9001/api/2"
      }
    ],
    "paths": {},
    "security": []
  }

  if (authenticationMethod === "apikey") {
    definitions.security = [
      {
        "apiKey": []
      }
    ]
  } else if (authenticationMethod === "sso") {
    definitions.components.securitySchemes.sso =  {
      type: "oauth2",
        flows: {
        authorizationCode: {
          authorizationUrl: settings.sso.issuer+"/oidc/auth",
            tokenUrl: settings.sso.issuer+"/oidc/token",
            scopes: {
            openid: "openid",
              profile: "profile",
              email: "email",
              admin: "admin"
          }
        }
      },
    }

    definitions.security = [
      {
        "sso": []
      }
    ]
  }



  for (const [method, value] of mapping) {
    for (const [path, mapping] of Object.entries(value)) {
      const {apiVersion, functionName, summary, operationId, requestBody, responses, tags} = mapping
      if (!definitions.paths[path]) {
        definitions.paths[path] = {}
      }

      const methodLowercased = method.toLowerCase()

      definitions.paths[path][methodLowercased] = {
        summary: summary!,
        operationId: operationId!,
        responses,
        tags: tags!
      }

      if (method === GET) {
        definitions.paths[path][methodLowercased].parameters = requestBody
      } else {
        definitions.paths[path][methodLowercased].requestBody = requestBody
      }
    }
  }
  return definitions
}


export const expressCreateServer = async (hookName: string, {app}: ArgsExpressType) => {
  mapping.set(GET, {})
  mapping.set(POST, {})
  mapping.set(PUT, {})
  mapping.set(DELETE, {})
  mapping.set(PATCH, {})

  // Version 1
  mapping.get(POST)!["/groups"] = {apiVersion: '1',
    functionName: 'createGroup', summary: 'Creates a new group',
    operationId: 'createGroup', tags: ['group'], responses: prepareResponses({type: "object", properties: {groupID: {type: "string"}}})

  }
  mapping.get(POST)!["/groups/createIfNotExistsFor"] = {apiVersion: '1', functionName: 'createGroupIfNotExistsFor',
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              groupMapper: {
                type: "string"
              }
            },
            required: ["groupMapper"]
          }
        }
      }
    },
    responses: prepareResponses({type: "object", properties: {groupID: {type: "string"}}}),
    summary: "Creates a new group if it doesn't exist", operationId: 'createGroupIfNotExistsFor', tags: ['group']};
  mapping.get(GET)!["/groups/pads"] = {apiVersion: '1', functionName: 'listPads',
    summary: "Lists all pads in a group", tags: ['group'],
    operationId: 'listPads', responses: prepareResponses({type: "object", properties: {padIDs: {type: "string"}}}),
    requestBody: [
      {
        "name": "groupID",
        "in": "query",
        "schema": {
          "type": "string"
        }
      }
    ]
  }
  mapping.get(DELETE)!["/groups"] = {apiVersion: '1', functionName: 'deleteGroup'}
  mapping.get(POST)!["/authors"] = {apiVersion: '1', functionName: 'createAuthor'}
  mapping.get(POST)!["/authors/createIfNotExistsFor"] = {apiVersion: '1', functionName: 'createAuthorIfNotExistsFor'}
  mapping.get(GET)!["/authors/pads"] = {apiVersion: '1', functionName: 'listPadsOfAuthor'}
  mapping.get(POST)!["/sessions"] = {apiVersion: '1', functionName: 'createSession'}
  mapping.get(DELETE)!["/sessions"] = {apiVersion: '1', functionName: 'deleteSession'}
  mapping.get(GET)!["/sessions/info"] = {apiVersion: '1', functionName: 'getSessionInfo'}
  mapping.get(GET)!["/sessions/group"] = {apiVersion: '1', functionName: 'listSessionsOfGroup'}
  mapping.get(GET)!["/sessions/author"] = {apiVersion: '1', functionName: 'listSessionsOfAuthor'}
  mapping.get(GET)!["/pads/text"] = {apiVersion: '1', functionName: 'getText'}
  mapping.get(GET)!["/pads/html"] = {apiVersion: '1', functionName: 'getHTML'}
  mapping.get(GET)!["/pads/revisions"] = {apiVersion: '1', functionName: 'getRevisionsCount'}
  mapping.get(GET)!["/pads/lastEdited"] = {apiVersion: '1', functionName: 'getLastEdited'}
  mapping.get(DELETE)!["/pads"] = {apiVersion: '1', functionName: 'deletePad'}
  mapping.get(GET)!["/pads/readonly"] = {apiVersion: '1', functionName: 'getReadOnlyID'}
  mapping.get(POST)!["/pads/publicStatus"] = {apiVersion: '1', functionName: 'setPublicStatus'}
  mapping.get(GET)!["/pads/publicStatus"] = {apiVersion: '1', functionName: 'getPublicStatus'}
  mapping.get(GET)!["/pads/authors"] = {apiVersion: '1', functionName: 'listAuthorsOfPad'}
  mapping.get(GET)!["/pads/usersCount"] = {apiVersion: '1', functionName: 'padUsersCount'}


  // Version 1.1
  mapping.get(GET)!["/authors/name"] = {apiVersion: '1.1', functionName: 'getAuthorName'}
  mapping.get(GET)!["/pads/users"] = {apiVersion: '1.1', functionName: 'padUsers'}
  mapping.get(POST)!["/pads/sendClientsMessage"] = {apiVersion: '1.1', functionName: 'sendClientsMessage'}
  mapping.get(GET)!["/groups"] = {apiVersion: '1.1', functionName: 'listAllGroups'}


  // Version 1.2
  mapping.get(GET)!["/checkToken"] = {apiVersion: '1.2', functionName: 'checkToken'}

  // Version 1.2.1
  mapping.get(GET)!["/pads"] = {apiVersion: '1.2.1', functionName: 'listAllPads'}

  // Version 1.2.7
  mapping.get(POST)!["/pads/diff"] = {apiVersion: '1.2.7', functionName: 'createDiffHTML'}
  mapping.get(GET)!["/pads/chatHistory"] = {apiVersion: '1.2.7', functionName: 'getChatHistory'}
  mapping.get(GET)!["/pads/chatHead"] = {apiVersion: '1.2.7', functionName: 'getChatHead'}

  // Version 1.2.8
  mapping.get(GET)!["/pads/attributePool"] = {apiVersion: '1.2.8', functionName: 'getAttributePool'}
  mapping.get(GET)!["/pads/revisionChangeset"] = {apiVersion: '1.2.8', functionName: 'getRevisionChangeset'}

  // Version 1.2.9
  mapping.get(POST)!["/pads/copypad"] = {apiVersion: '1.2.9', functionName: 'copyPad'}
  mapping.get(POST)!["/pads/movepad"] = {apiVersion: '1.2.9', functionName: 'movePad'}

  // Version 1.2.10
  mapping.get(POST)!["/pads/padId"] = {apiVersion: '1.2.10', functionName: 'getPadID'}

  // Version 1.2.11
  mapping.get(GET)!["/savedRevisions"] = {apiVersion: '1.2.11', functionName: 'listSavedRevisions'}
  mapping.get(POST)!["/savedRevisions"] = {apiVersion: '1.2.11', functionName: 'saveRevision'}
  mapping.get(GET)!["/savedRevisions/revisionsCount"] = {apiVersion: '1.2.11', functionName: 'getSavedRevisionsCount'}

  // Version 1.2.12
  mapping.get(PATCH)!["/chats/messages"] = {apiVersion: '1.2.12', functionName: 'appendChatMessage'}

  // Version 1.2.13

  // Version 1.2.14
  mapping.get(GET)!["/stats"] = {apiVersion: '1.2.14', functionName: 'getStats'}

  // Version 1.2.15

  // Version 1.3.0
  mapping.get(PATCH)!["/pads/text"] = {apiVersion: '1.3.0', functionName: 'appendText'}
  mapping.get(POST)!["/pads/copyWithoutHistory"] = {apiVersion: '1.3.0', functionName: 'copyPadWithoutHistory'}
  mapping.get(POST)!["/pads/group"] = {apiVersion: '1.3.0', functionName: 'createGroupPad'}
  mapping.get(POST)!["/pads"] = {apiVersion: '1.3.0', functionName: 'createPad'}
  mapping.get(PATCH)!["/savedRevisions"] = {apiVersion: '1.3.0', functionName: 'restoreRevision'}
  mapping.get(POST)!["/pads/html"] = {apiVersion: '1.3.0', functionName: 'setHTML'}
  mapping.get(POST)!["/pads/text"] = {apiVersion: '1.3.0', functionName: 'setText'}


  app.use('/api-docs', serve);
  app.get('/api-docs', setup(undefined,{
    swaggerOptions: {
      url: '/api-docs.json',
    },
  }));

  app.use(express.json());

  app.get('/api-docs.json', (req, res)=>{
    const generatedDefinition = prepareDefinition(mapping)
    res.json(generatedDefinition)
  })
  app.use('/api/2', async (req, res, next) => {
    const method = req.method
    const pathToFunction = req.path
    // parse fields from request
    const {headers, params, query} = req;

    // read form data if method was POST
    let formData: MapArrayType<any> = {};
    if (method.toLowerCase() === 'post') {
      if (!req.headers['content-type'] || req.headers['content-type']!.startsWith('application/json')) {
        // parse json
        formData = req.body;
      } else {
        const form = new IncomingForm();
        formData = (await form.parse(req))[0];
        for (const k of Object.keys(formData)) {
          if (formData[k] instanceof Array) {
            formData[k] = formData[k][0];
          }
        }
      }
    }

    const fields = Object.assign({}, headers, params, query, formData);

    if (mapping.has(method) && pathToFunction in mapping.get(method)!) {
      const {apiVersion, functionName} = mapping.get(method)![pathToFunction]!
      // pass to api handler
      let response;
      try {
        try {
          let data = await apiHandler.handle(apiVersion, functionName, fields, req, res);

          // return in common format
          response = {code: 0, message: 'ok', data: data || null};
        } catch (err) {
          const errCaused = err as ErrorCaused
          // convert all errors to http errors
          if (createHTTPError.isHttpError(err)) {
            // pass http errors thrown by handler forward
            throw err;
          } else if (errCaused.name === 'apierror') {
            // parameters were wrong and the api stopped execution, pass the error
            // convert to http error
            throw new createHTTPError.BadRequest(errCaused.message);
          } else {
            // an unknown error happened
            // log it and throw internal error
            console.error(errCaused.stack || errCaused.toString());
            throw new createHTTPError.InternalServerError('internal error');
          }
        }
      } catch (err) {
        const errCaused = err as ErrorCaused
        // handle http errors
        // @ts-ignore
        res.statusCode = errCaused.statusCode || 500;

        // convert to our json response format
        // https://github.com/ether/etherpad-lite/tree/master/doc/api/http_api.md#response-format
        switch (res.statusCode) {
          case 403: // forbidden
            response = {code: 4, message: errCaused.message, data: null};
            break;
          case 401: // unauthorized (no or wrong api key)
            response = {code: 4, message: errCaused.message, data: null};
            break;
          case 404: // not found (no such function)
            response = {code: 3, message: errCaused.message, data: null};
            break;
          case 500: // server error (internal error)
            response = {code: 2, message: errCaused.message, data: null};
            break;
          case 400: // bad request (wrong parameters)
            // respond with 200 OK to keep old behavior and pass tests
            res.statusCode = 200; // @TODO: this is bad api design
            response = {code: 1, message: errCaused.message, data: null};
            break;
          default:
            response = {code: 1, message: errCaused.message, data: null};
            break;
        }
      }


      console.debug(`RESPONSE, ${functionName}, ${JSON.stringify(response)}`);

      // return the response data
      res.json(response);
    } else {
      res.json({code: 1, message: 'not found'});
    }
  })
}
