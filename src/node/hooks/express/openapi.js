const OpenAPIBackend = require('openapi-backend').default;
const formidable = require('formidable');
const { promisify } = require('util');

const apiHandler = require('../../handler/APIHandler');
const settings = require('../../utils/Settings');
const { API } = require('./swagger');

const log4js = require('log4js');
const apiLogger = log4js.getLogger('API');

// https://github.com/OAI/OpenAPI-Specification/tree/master/schemas/v3.0
const OPENAPI_VERSION = '3.0.2'; // Swagger/OAS version

// enum for two different styles of API paths used for etherpad
const APIPathStyle = {
  FLAT: 'api', // flat paths e.g. /api/createGroup
  REST: 'rest', // restful paths e.g. /rest/group/create
};
exports.APIPathStyle = APIPathStyle;

// helper to get api root
const getApiRootForVersion = (version, style = APIPathStyle.FLAT) => `/${style}/${version}`;

// helper to generate an OpenAPI server object when serving definitions
const generateServerForApiVersion = (apiRoot, req) => ({
  url: `${settings.ssl ? 'https' : 'http'}://${req.headers.host}${apiRoot}`,
});

const defaultResponses = {
  200: {
    description: 'ok',
  },
};

// convert to a flat list of OAS Operation objects
const operations = [];
for (const resource in API) {
  for (const action in API[resource]) {
    const { func: operationId, description, response } = API[resource][action];
    const operation = {
      operationId,
      summary: description,
      responses: defaultResponses,
      tags: [resource],
      _restPath: `/${resource}/${action}`,
    };
    operations[operationId] = operation;
  }
}

const generateDefinitionForVersion = (version, style = APIPathStyle.FLAT) => {
  const definition = {
    openapi: OPENAPI_VERSION,
    info: {
      title: 'Etherpad API',
      description:
        'Etherpad is a real-time collaborative editor scalable to thousands of simultaneous real time users. It provides full data export capabilities, and runs on your server, under your control.',
      version,
    },
    paths: {},
    components: {
      responses: {},
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
        responses: defaultResponses,
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

exports.expressCreateServer = (_, args) => {
  const { app } = args;

  for (const version in apiHandler.version) {
    // create two different styles of api: flat + rest
    for (const style of [APIPathStyle.FLAT, APIPathStyle.REST]) {
      const apiRoot = getApiRootForVersion(version, style);

      // generate openapi definition for this API version
      const definition = generateDefinitionForVersion(version, style);

      // serve openapi definition file
      app.get(`${apiRoot}/openapi.json`, (req, res) => {
        res.json({ ...definition, servers: [generateServerForApiVersion(apiRoot, req)] });
      });

      // serve latest openapi definition file under /api/openapi.json
      if (version === apiHandler.latestApiVersion) {
        app.get(`/${style}/openapi.json`, (req, res) => {
          res.json({ ...definition, servers: [generateServerForApiVersion(apiRoot, req)] });
        });
      }

      // build openapi-backend instance for this api version
      const api = new OpenAPIBackend({
        apiRoot,
        definition,
        strict: true,
      });

      // register default handlers
      api.register({
        notFound: (c, req, res) => {
          res.statusCode = 404;
          res.send({ code: 3, message: 'no such function', data: null });
        },
        notImplemented: (c, req, res) => {
          res.statusCode = 501;
          res.send({ code: 3, message: 'not implemented', data: null });
        },
      });

      // register operation handlers (calls apiHandler.handle)
      for (const funcName in apiHandler.version[version]) {
        const handler = async (c, req, res) => {
          // parse fields from request
          const { header, params, query } = c.request;

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
          return apiHandler.handle(version, funcName, fields, req, res);
        };

        // each operation can be called with either GET or POST
        api.register(`${funcName}UsingGET`, handler);
        api.register(`${funcName}UsingPOST`, handler);
      }

      // start and bind to express
      api.init();
      app.use(apiRoot, async (req, res) => api.handleRequest(req, req, res));
    }
  }
};
