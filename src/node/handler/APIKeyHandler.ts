const absolutePaths = require('../utils/AbsolutePaths');
import fs from 'fs';
import log4js from 'log4js';
const randomString = require('../utils/randomstring');
const argv = require('../utils/Cli').argv;
const settings = require('../utils/Settings');

const apiHandlerLogger = log4js.getLogger('APIHandler');



export type APIFields = {
  apikey: string;
  api_key: string;
  padID: string;
  padName: string;
  authorization: string;
}

// ensure we have an apikey
export let apikey:string|null = null;
const apikeyFilename = absolutePaths.makeAbsolute(argv.apikey || './APIKEY.txt');


if(settings.authenticationMethod === 'apikey') {
    try {
      apikey = fs.readFileSync(apikeyFilename, 'utf8');
      apiHandlerLogger.info(`Api key file read from: "${apikeyFilename}"`);
    } catch (e) {
      apiHandlerLogger.info(
        `Api key file "${apikeyFilename}" not found.  Creating with random contents.`);
      apikey = randomString(32);
      fs.writeFileSync(apikeyFilename, apikey!, 'utf8');
    }
}
