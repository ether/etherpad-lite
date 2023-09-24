'use strict';
const semver = require('semver');
const settings = require('./Settings');
const axios = require('axios');
const headers = {
  'User-Agent': 'Etherpad ' + settings.getEpVersion(),
}
let infos;

const loadEtherpadInformations = () =>
  axios.get('https://static.etherpad.org/info.json', {headers: headers})
  .then(async resp => {
    try {
      infos = await resp.data;
      if (infos === undefined || infos === null) {
        await Promise.reject("Could not retrieve current version")
        return
      }
      return await Promise.resolve(infos);
    } catch (err) {
      return await Promise.reject(err);
    }
  })


exports.getLatestVersion = () => {
  exports.needsUpdate();
  return infos.latestVersion;
};

exports.needsUpdate = async (cb) => {
  await loadEtherpadInformations()
      .then((info) => {
    if (semver.gt(info.latestVersion, settings.getEpVersion())) {
      if (cb) return cb(true);
    }
  }).catch((err) => {
    console.error(`Can not perform Etherpad update check: ${err}`);
    if (cb) return cb(false);
  });
};

exports.check = () => {
  exports.needsUpdate((needsUpdate) => {
    if (needsUpdate) {
      console.warn(`Update available: Download the actual version ${infos.latestVersion}`);
    }
  });
};
