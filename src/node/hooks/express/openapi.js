/**
 * node/hooks/express/openapi.js
 *
 * This module generates OpenAPI definitions for each API version defined by
 * APIHandler.js and hooks into express to route the API using openapi-backend.
 *
 * The openapi definition files are publicly available under:
 *
 * - /api/openapi.json
 * - /rest/openapi.json
 * - /api/{version}/openapi.json
 * - /rest/{version}/openapi.json
 */

const OpenAPIBackend = require('openapi-backend').default;
const formidable = require('formidable');
const { promisify } = require('util');
const cloneDeep = require('lodash.clonedeep');
const createHTTPError = require('http-errors');

const apiHandler = require('../../handler/APIHandler');
const settings = require('../../utils/Settings');
const isValidJSONPName = require('./isValidJSONPName');

const log4js = require('log4js');
const apiLogger = log4js.getLogger('API');

// https://github.com/OAI/OpenAPI-Specification/tree/master/schemas/v3.0
const OPENAPI_VERSION = '3.0.2'; // Swagger/OAS version

const info = {
  title: 'Etherpad API',
  description:
    'Etherpad is a real-time collaborative editor scalable to thousands of simultaneous real time users. It provides full data export capabilities, and runs on your server, under your control.',
  termsOfService: 'https://etherpad.org/',
  contact: {
    name: 'The Etherpad Foundation',
    url: 'https://etherpad.org/',
    email: 'support@example.com',
  },
  license: {
    name: 'Apache 2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
  },
  version: apiHandler.latestApiVersion,
};

const APIPathStyle = {
  FLAT: 'api', // flat paths e.g. /api/createGroup
  REST: 'rest', // restful paths e.g. /rest/group/create
};

// API resources - describe your API endpoints here
const resources = {
  // Group
  group: {
    create: {
      operationId: 'createGroup',
      summary: 'creates a new group',
      responseSchema: { groupID: { type: 'string' } },
    },
    createIfNotExistsFor: {
      operationId: 'createGroupIfNotExistsFor',
      summary: 'this functions helps you to map your application group ids to Etherpad group ids',
      responseSchema: { groupID: { type: 'string' } },
    },
    delete: {
      operationId: 'deleteGroup',
      summary: 'deletes a group',
    },
    listPads: {
      operationId: 'listPads',
      summary: 'returns all pads of this group',
      responseSchema: { padIDs: { type: 'array', items: { type: 'string' } } },
    },
    createPad: {
      operationId: 'createGroupPad',
      summary: 'creates a new pad in this group',
    },
    listSessions: {
      operationId: 'listSessionsOfGroup',
      summary: '',
      responseSchema: { sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionInfo' } } },
    },
    list: {
      operationId: 'listAllGroups',
      summary: '',
      responseSchema: { groupIDs: { type: 'array', items: { type: 'string' } } },
    },
  },

  // Author
  author: {
    create: {
      operationId: 'createAuthor',
      summary: 'creates a new author',
      responseSchema: { authorID: { type: 'string' } },
    },
    createIfNotExistsFor: {
      operationId: 'createAuthorIfNotExistsFor',
      summary: 'this functions helps you to map your application author ids to Etherpad author ids',
      responseSchema: { authorID: { type: 'string' } },
    },
    listPads: {
      operationId: 'listPadsOfAuthor',
      summary: 'returns an array of all pads this author contributed to',
      responseSchema: { padIDs: { type: 'array', items: { type: 'string' } } },
    },
    listSessions: {
      operationId: 'listSessionsOfAuthor',
      summary: 'returns all sessions of an author',
      responseSchema: { sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionInfo' } } },
    },
    // We need an operation that return a UserInfo so it can be picked up by the codegen :(
    getName: {
      operationId: 'getAuthorName',
      summary: 'Returns the Author Name of the author',
      responseSchema: { info: { $ref: '#/components/schemas/UserInfo' } },
    },
  },

  // Session
  session: {
    create: {
      operationId: 'createSession',
      summary: 'creates a new session. validUntil is an unix timestamp in seconds',
      responseSchema: { sessionID: { type: 'string' } },
    },
    delete: {
      operationId: 'deleteSession',
      summary: 'deletes a session',
    },
    // We need an operation that returns a SessionInfo so it can be picked up by the codegen :(
    info: {
      operationId: 'getSessionInfo',
      summary: 'returns informations about a session',
      responseSchema: { info: { $ref: '#/components/schemas/SessionInfo' } },
    },
  },

  // Pad
  pad: {
    listAll: {
      operationId: 'listAllPads',
      summary: 'list all the pads',
      responseSchema: { padIDs: { type: 'array', items: { type: 'string' } } },
    },
    createDiffHTML: {
      operationId: 'createDiffHTML',
      summary: '',
      responseSchema: {},
    },
    create: {
      operationId: 'createPad',
      description:
        'creates a new (non-group) pad. Note that if you need to create a group Pad, you should call createGroupPad',
    },
    getText: {
      operationId: 'getText',
      summary: 'returns the text of a pad',
      responseSchema: { text: { type: 'string' } },
    },
    setText: {
      operationId: 'setText',
      summary: 'sets the text of a pad',
    },
    getHTML: {
      operationId: 'getHTML',
      summary: 'returns the text of a pad formatted as HTML',
      responseSchema: { html: { type: 'string' } },
    },
    setHTML: {
      operationId: 'setHTML',
      summary: 'sets the text of a pad with HTML',
    },
    getRevisionsCount: {
      operationId: 'getRevisionsCount',
      summary: 'returns the number of revisions of this pad',
      responseSchema: { revisions: { type: 'integer' } },
    },
    getLastEdited: {
      operationId: 'getLastEdited',
      summary: 'returns the timestamp of the last revision of the pad',
      responseSchema: { lastEdited: { type: 'integer' } },
    },
    delete: {
      operationId: 'deletePad',
      summary: 'deletes a pad',
    },
    getReadOnlyID: {
      operationId: 'getReadOnlyID',
      summary: 'returns the read only link of a pad',
      responseSchema: { readOnlyID: { type: 'string' } },
    },
    setPublicStatus: {
      operationId: 'setPublicStatus',
      summary: 'sets a boolean for the public status of a pad',
    },
    getPublicStatus: {
      operationId: 'getPublicStatus',
      summary: 'return true of false',
      responseSchema: { publicStatus: { type: 'boolean' } },
    },
    setPassword: {
      operationId: 'setPassword',
      summary: 'returns ok or a error message',
    },
    isPasswordProtected: {
      operationId: 'isPasswordProtected',
      summary: 'returns true or false',
      responseSchema: { passwordProtection: { type: 'boolean' } },
    },
    authors: {
      operationId: 'listAuthorsOfPad',
      summary: 'returns an array of authors who contributed to this pad',
      responseSchema: { authorIDs: { type: 'array', items: { type: 'string' } } },
    },
    usersCount: {
      operationId: 'padUsersCount',
      summary: 'returns the number of user that are currently editing this pad',
      responseSchema: { padUsersCount: { type: 'integer' } },
    },
    users: {
      operationId: 'padUsers',
      summary: 'returns the list of users that are currently editing this pad',
      responseSchema: { padUsers: { type: 'array', items: { $ref: '#/components/schemas/UserInfo' } } },
    },
    sendClientsMessage: {
      operationId: 'sendClientsMessage',
      summary: 'sends a custom message of type msg to the pad',
    },
    checkToken: {
      operationId: 'checkToken',
      summary: 'returns ok when the current api token is valid',
    },
    getChatHistory: {
      operationId: 'getChatHistory',
      summary: 'returns the chat history',
      responseSchema: { messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } } },
    },
    // We need an operation that returns a Message so it can be picked up by the codegen :(
    getChatHead: {
      operationId: 'getChatHead',
      summary: 'returns the chatHead (chat-message) of the pad',
      responseSchema: { chatHead: { $ref: '#/components/schemas/Message' } },
    },
    appendChatMessage: {
      operationId: 'appendChatMessage',
      summary: 'appends a chat message',
    },
  },
};

const defaultResponses = {
  Success: {
    description: 'ok (code 0)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 0,
            },
            message: {
              type: 'string',
              example: 'ok',
            },
            data: {
              type: 'object',
              example: null,
            },
          },
        },
      },
    },
  },
  ApiError: {
    description: 'generic api error (code 1)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 1,
            },
            message: {
              type: 'string',
              example: 'error message',
            },
            data: {
              type: 'object',
              example: null,
            },
          },
        },
      },
    },
  },
  InternalError: {
    description: 'internal api error (code 2)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 2,
            },
            message: {
              type: 'string',
              example: 'internal error',
            },
            data: {
              type: 'object',
              example: null,
            },
          },
        },
      },
    },
  },
  NotFound: {
    description: 'no such function (code 4)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 3,
            },
            message: {
              type: 'string',
              example: 'no such function',
            },
            data: {
              type: 'object',
              example: null,
            },
          },
        },
      },
    },
  },
  Unauthorized: {
    description: 'no or wrong API key (code 4)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 4,
            },
            message: {
              type: 'string',
              example: 'no or wrong API key',
            },
            data: {
              type: 'object',
              example: null,
            },
          },
        },
      },
    },
  },
};

const defaultResponseRefs = {
  200: {
    $ref: '#/components/responses/Success',
  },
  400: {
    $ref: '#/components/responses/ApiError',
  },
  401: {
    $ref: '#/components/responses/Unauthorized',
  },
  500: {
    $ref: '#/components/responses/InternalError',
  },
};

// convert to a dictionary of operation objects
const operations = {};
for (const resource in resources) {
  for (const action in resources[resource]) {
    const { operationId, responseSchema, ...operation } = resources[resource][action];

    // add response objects
    const responses = { ...defaultResponseRefs };
    if (responseSchema) {
      responses[200] = cloneDeep(defaultResponses.Success);
      responses[200].content['application/json'].schema.properties.data = {
        type: 'object',
        properties: responseSchema,
      };
    }

    // add final operation object to dictionary
    operations[operationId] = {
      operationId,
      ...operation,
      responses,
      tags: [resource],
      _restPath: `/${resource}/${action}`,
    };
  }
}

const generateDefinitionForVersion = (version, style = APIPathStyle.FLAT) => {
  const definition = {
    openapi: OPENAPI_VERSION,
    info,
    paths: {},
    components: {
      parameters: {},
      schemas: {
        SessionInfo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            authorID: {
              type: 'string',
            },
            groupID: {
              type: 'string',
            },
            validUntil: {
              type: 'integer',
            },
          },
        },
        UserInfo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            colorId: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            timestamp: {
              type: 'integer',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
            },
            userId: {
              type: 'string',
            },
            userName: {
              type: 'string',
            },
            time: {
              type: 'integer',
            },
          },
        },
      },
      responses: {
        ...defaultResponses,
      },
      securitySchemes: {
        ApiKey: {
          type: 'apiKey',
          in: 'query',
          name: 'apikey',
        },
      },
    },
    security: [{ ApiKey: [] }],
  };

  // build operations
  for (const funcName in apiHandler.version[version]) {
    let operation = {};
    if (operations[funcName]) {
      operation = { ...operations[funcName] };
    } else {
      // console.warn(`No operation found for function: ${funcName}`);
      operation = {
        operationId: funcName,
        responses: defaultResponseRefs,
      };
    }

    // set parameters
    operation.parameters = operation.parameters || [];
    for (const paramName of apiHandler.version[version][funcName]) {
      operation.parameters.push({ $ref: `#/components/parameters/${paramName}` });
      if (!definition.components.parameters[paramName]) {
        definition.components.parameters[paramName] = {
          name: paramName,
          in: 'query',
          schema: {
            type: 'string',
          },
        };
      }
    }

    // set path
    let path = `/${operation.operationId}`; // APIPathStyle.FLAT
    if (style === APIPathStyle.REST && operation._restPath) {
      path = operation._restPath;
    }
    delete operation._restPath;

    // add to definition
    // NOTE: It may be confusing that every operation can be called with both GET and POST
    definition.paths[path] = {
      get: {
        ...operation,
        operationId: `${operation.operationId}UsingGET`,
      },
      post: {
        ...operation,
        operationId: `${operation.operationId}UsingPOST`,
      },
    };
  }
  return definition;
};

exports.expressCreateServer = async (_, args) => {
  const { app } = args;

  // create openapi-backend handlers for each api version under /api/{version}/*
  for (const version in apiHandler.version) {
    // we support two different styles of api: flat + rest
    // TODO: do we really want to support both?

    for (const style of [APIPathStyle.FLAT, APIPathStyle.REST]) {
      const apiRoot = getApiRootForVersion(version, style);

      // generate openapi definition for this API version
      const definition = generateDefinitionForVersion(version, style);

      // serve version specific openapi definition
      app.get(`${apiRoot}/openapi.json`, (req, res) => {
        // For openapi definitions, wide CORS is probably fine
        res.header('Access-Control-Allow-Origin', '*');
        res.json({ ...definition, servers: [generateServerForApiVersion(apiRoot, req)] });
      });

      // serve latest openapi definition file under /api/openapi.json
      const isLatestAPIVersion = version === apiHandler.latestApiVersion;
      if (isLatestAPIVersion) {
        app.get(`/${style}/openapi.json`, (req, res) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.json({ ...definition, servers: [generateServerForApiVersion(apiRoot, req)] });
        });
      }

      // build openapi-backend instance for this api version
      const api = new OpenAPIBackend({
        apiRoot, // each api version has its own root
        definition,
        validate: false,
        // for a small optimisation, we can run the quick startup for older
        // API versions since they are subsets of the latest api definition
        quick: !isLatestAPIVersion,
      });

      // register default handlers
      api.register({
        notFound: () => {
          throw new createHTTPError.notFound('no such function');
        },
        notImplemented: () => {
          throw new createHTTPError.notImplemented('function not implemented');
        },
      });

      // register operation handlers
      for (const funcName in apiHandler.version[version]) {
        const handler = async (c, req, res) => {
          // parse fields from request
          const { header, params, query } = c.request;

          // read form data if method was POST
          let formData = {};
          if (c.request.method === 'post') {
            const form = new formidable.IncomingForm();
            const parseForm = promisify(form.parse).bind(form);
            formData = await parseForm(req);
          }

          const fields = Object.assign({}, header, params, query, formData);

          // log request
          apiLogger.info(`REQUEST, v${version}:${funcName}, ${JSON.stringify(fields)}`);

          // pass to api handler
          let data = await apiHandler.handle(version, funcName, fields, req, res).catch((err) => {
            // convert all errors to http errors
            if (err instanceof createHTTPError.HttpError) {
              // pass http errors thrown by handler forward
              throw err;
            } else if (err.name == 'apierror') {
              // parameters were wrong and the api stopped execution, pass the error
              // convert to http error
              throw new createHTTPError.BadRequest(err.message);
            } else {
              // an unknown error happened
              // log it and throw internal error
              apiLogger.error(err);
              throw new createHTTPError.InternalError('internal error');
            }
          });

          // return in common format
          let response = { code: 0, message: 'ok', data: data || null };

          // log response
          apiLogger.info(`RESPONSE, ${funcName}, ${JSON.stringify(response)}`);

          // return the response data
          return response;
        };

        // each operation can be called with either GET or POST
        api.register(`${funcName}UsingGET`, handler);
        api.register(`${funcName}UsingPOST`, handler);
      }

      // start and bind to express
      api.init();
      app.use(apiRoot, async (req, res) => {
        let response = null;
        try {
          if (style === APIPathStyle.REST) {
            // @TODO: Don't allow CORS from everywhere
            // This is purely to maintain compatibility with old swagger-node-express
            res.header('Access-Control-Allow-Origin', '*');
          }
          // pass to openapi-backend handler
          response = await api.handleRequest(req, req, res);
        } catch (err) {
          // handle http errors
          res.statusCode = err.statusCode || 500;

          // convert to our json response format
          // https://github.com/ether/etherpad-lite/tree/master/doc/api/http_api.md#response-format
          switch (res.statusCode) {
            case 403: // forbidden
              response = { code: 4, message: err.message, data: null };
              break;
            case 401: // unauthorized (no or wrong api key)
              response = { code: 4, message: err.message, data: null };
              break;
            case 404: // not found (no such function)
              response = { code: 3, message: err.message, data: null };
              break;
            case 500: // server error (internal error)
              response = { code: 2, message: err.message, data: null };
              break;
            case 400: // bad request (wrong parameters)
              // respond with 200 OK to keep old behavior and pass tests
              res.statusCode = 200; // @TODO: this is bad api design
              response = { code: 1, message: err.message, data: null };
              break;
            default:
              response = { code: 1, message: err.message, data: null };
              break;
          }
        }

        // support jsonp response format
        if (req.query.jsonp && isValidJSONPName.check(req.query.jsonp)) {
          res.header('Content-Type', 'application/javascript');
          response = `${req.query.jsonp}(${JSON.stringify(response)}`;
        }

        // send response
        return res.send(response);
      });
    }
  }
};

// helper to get api root
const getApiRootForVersion = (version, style = APIPathStyle.FLAT) => `/${style}/${version}`;

// helper to generate an OpenAPI server object when serving definitions
const generateServerForApiVersion = (apiRoot, req) => ({
  url: `${settings.ssl ? 'https' : 'http'}://${req.headers.host}${apiRoot}`,
});
