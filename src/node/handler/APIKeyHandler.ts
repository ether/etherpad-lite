import {makeAbsolute} from '../utils/AbsolutePaths';
import fs from 'fs';
import log4js from 'log4js';
import {randomString} from '../utils/randomstring';
import {argvP} from "../utils/Cli";
import settings from '../utils/Settings';

const apiHandlerLogger = log4js.getLogger('APIHandler');

// ensure we have an apikey
export let apikey:string|null = null;
const apikeyFilename = makeAbsolute(argvP.apikey || './APIKEY.txt');


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
