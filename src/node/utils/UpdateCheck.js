import axios from 'axios';

import {getEpVersion} from './Settings.js';

import semver from 'semver';


const loadEtherpadInformations = () => axios.get('https://static.etherpad.org/info.json')
    .then(async (resp) => {
      try {
        const infos = await resp.data;
        if (infos === undefined || infos == null) {
          await Promise.reject(new Error('Could not retrieve current version'));
          return;
        }
        return infos;
      } catch (err) {
        return err;
      }
    });


export const getLatestVersion = () => {
  const infos = needsUpdate();
  return infos;
};

export const needsUpdate = async (cb) => {
  await loadEtherpadInformations()
      .then((info) => {
        if (semver.gt(info.latestVersion, getEpVersion())) {
          if (cb) return cb(true);
        }
      }).catch((err) => {
        console.error(`Can not perform Etherpad update check: ${err}`);
        if (cb) return cb(false);
      });
};

export const check = () => {
  needsUpdate((needsUpdate) => {
    if (needsUpdate) {
      console.warn(`Update available: Download the actual version ${infos.latestVersion}`);
    }
  });
};
