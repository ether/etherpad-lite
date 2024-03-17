'use strict';
const semver = require('semver');
const settings = require('./Settings');
const axios = require('axios');
const headers = {
  'User-Agent': 'Etherpad/' + settings.getEpVersion(),
}

type Infos = {
  latestVersion: string
}


const updateInterval = 60 * 60 * 1000; // 1 hour
let infos: Infos;
let lastLoadingTime: number | null = null;

const loadEtherpadInformations = () => {
  if (lastLoadingTime !== null && Date.now() - lastLoadingTime < updateInterval) {
    return Promise.resolve(infos);
  }

  return axios.get('https://static.etherpad.org/info.json', {headers: headers})
  .then(async (resp: any) => {
    infos = await resp.data;
    if (infos === undefined || infos === null) {
      await Promise.reject("Could not retrieve current version")
      return
    }

    lastLoadingTime = Date.now();
    return await Promise.resolve(infos);
  })
  .catch(async (err: Error) => {
    return await Promise.reject(err);
  });
}


exports.getLatestVersion = () => {
  exports.needsUpdate().catch();
  return infos?.latestVersion;
};

exports.needsUpdate = async (cb?: Function) => {
  await loadEtherpadInformations()
      .then((info:Infos) => {
    if (semver.gt(info.latestVersion, settings.getEpVersion())) {
      if (cb) return cb(true);
    }
  }).catch((err: Error) => {
    console.error(`Can not perform Etherpad update check: ${err}`);
    if (cb) return cb(false);
  });
};

exports.check = () => {
  exports.needsUpdate((needsUpdate: boolean) => {
    if (needsUpdate) {
      console.warn(`Update available: Download the actual version ${infos.latestVersion}`);
    }
  });
};
