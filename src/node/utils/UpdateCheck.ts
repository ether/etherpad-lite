'use strict';
import semver from 'semver';
import  {getEpVersion} from './Settings';
import request from 'request';


type InfoModel = {
  latestVersion: string
}

let infos: InfoModel|undefined;

const loadEtherpadInformations = () => new Promise<InfoModel>((resolve, reject) => {
  request('https://static.etherpad.org/info.json', (er, response, body) => {
    if (er) reject(er);

    try {
      infos = JSON.parse(body);
      if (infos === undefined|| infos === null){
        reject("Could not retrieve current version")
        return
      }
      resolve(infos);
    } catch (err) {
      reject(err);
    }
  });
});

const getLatestVersion = () => {
  exports.needsUpdate();
  if(infos === undefined){
    throw new Error("Could not retrieve latest version")
  }

  return infos.latestVersion;
}

exports.needsUpdate = (cb?:(arg0: boolean)=>void) => {
  loadEtherpadInformations().then((info) => {
    if (semver.gt(info.latestVersion, getEpVersion())) {
      if (cb) return cb(true);
    }
  }).catch((err) => {
    console.error(`Can not perform Etherpad update check: ${err}`);
    if (cb) return cb(false);
  })
}

const check = () => {
  const needsUpdate =  ((needsUpdate: boolean) => {
    if (needsUpdate && infos) {
      console.warn(`Update available: Download the latest version ${infos.latestVersion}`);
    }
  })
  needsUpdate(infos.latestVersion > getEpVersion());
}

export default {check, getLatestVersion}
