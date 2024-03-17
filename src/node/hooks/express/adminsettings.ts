'use strict';


import {PadQueryResult, PadSearchQuery} from "../../types/PadSearchQuery";
import {PadType} from "../../types/PadType";

const eejs = require('../../eejs');
const fsp = require('fs').promises;
const hooks = require('../../../static/js/pluginfw/hooks');
const plugins = require('../../../static/js/pluginfw/plugins');
const settings = require('../../utils/Settings');
const UpdateCheck = require('../../utils/UpdateCheck');
const padManager = require('../../db/PadManager');
const api = require('../../db/API');


const queryPadLimit = 12;


exports.socketio = (hookName:string, {io}:any) => {
  io.of('/settings').on('connection', (socket: any ) => {
    // @ts-ignore
    const {session: {user: {is_admin: isAdmin} = {}} = {}} = socket.conn.request;
    if (!isAdmin) return;

    socket.on('load', async (query:string):Promise<any> => {
      let data;
      try {
        data = await fsp.readFile(settings.settingsFilename, 'utf8');
      } catch (err) {
        return console.log(err);
      }
      // if showSettingsInAdminPage is set to false, then return NOT_ALLOWED in the result
      if (settings.showSettingsInAdminPage === false) {
        socket.emit('settings', {results: 'NOT_ALLOWED'});
      } else {
        socket.emit('settings', {results: data});
      }
    });

    socket.on('saveSettings', async (newSettings:string) => {
      console.log('Admin request to save settings through a socket on /admin/settings');
      await fsp.writeFile(settings.settingsFilename, newSettings);
      socket.emit('saveprogress', 'saved');
    });


    socket.on('help', ()=> {
      const gitCommit = settings.getGitCommit();
      const epVersion = settings.getEpVersion();

      const hooks:Map<string, Map<string,string>> = plugins.getHooks('hooks', false);
      const clientHooks:Map<string, Map<string,string>> = plugins.getHooks('client_hooks', false);

      function mapToObject(map: Map<string,any>) {
        let obj = Object.create(null);
        for (let [k,v] of map) {
          if(v instanceof Map) {
            obj[k] = mapToObject(v);
          } else {
            obj[k] = v;
          }
        }
        return obj;
      }

      socket.emit('reply:help', {
        gitCommit,
        epVersion,
        installedPlugins: plugins.getPlugins(),
        installedParts: plugins.getParts(),
        installedServerHooks: mapToObject(hooks),
        installedClientHooks: mapToObject(clientHooks),
        latestVersion: UpdateCheck.getLatestVersion(),
      })
    });


    socket.on('padLoad', async (query: PadSearchQuery) => {
      const {padIDs} = await padManager.listAllPads();

      const data:{
        total: number,
        results?: PadQueryResult[]
      } = {
        total: padIDs.length,
      };
      let result: string[] = padIDs;
      let maxResult;

      // Filter out matches
      if (query.pattern) {
        result = result.filter((padName: string) => padName.includes(query.pattern));
      }

      data.total = result.length;

      maxResult = result.length - 1;
      if (maxResult < 0) {
        maxResult = 0;
      }

      if (query.offset && query.offset < 0) {
        query.offset = 0;
      } else if (query.offset > maxResult) {
        query.offset = maxResult;
      }

      if (query.limit && query.limit < 0) {
        query.limit = 0;
      } else if (query.limit > queryPadLimit) {
        query.limit = queryPadLimit;
      }

      if (query.sortBy === 'padName') {
        result = result.sort((a,b)=>{
            if(a < b) return query.ascending ? -1 : 1;
            if(a > b) return query.ascending ? 1 : -1;
            return 0;
        }).slice(query.offset, query.offset + query.limit);

        data.results = await Promise.all(result.map(async (padName: string) => {
            const pad = await padManager.getPad(padName);
            const revisionNumber = pad.getHeadRevisionNumber()
            const userCount = api.padUsersCount(padName).padUsersCount;
            const lastEdited = await pad.getLastEdit();

            return {
              padName,
              lastEdited,
              userCount,
              revisionNumber
            }}));
      } else {
        const currentWinners: PadQueryResult[] = []
        let queryOffsetCounter = 0
        for (let res of result) {

          const pad = await padManager.getPad(res);
          const padType = {
            padName: res,
            lastEdited: await pad.getLastEdit(),
            userCount: api.padUsersCount(res).padUsersCount,
            revisionNumber: pad.getHeadRevisionNumber()
          };

          if (currentWinners.length < query.limit) {
            if(queryOffsetCounter < query.offset){
              queryOffsetCounter++
              continue
            }
            currentWinners.push({
              padName: res,
              lastEdited: await pad.getLastEdit(),
              userCount: api.padUsersCount(res).padUsersCount,
              revisionNumber: pad.getHeadRevisionNumber()
            })
          } else {
            // Kick out worst pad and replace by current pad
            let worstPad = currentWinners.sort((a, b) => {
                if (a[query.sortBy] < b[query.sortBy]) return query.ascending ? -1 : 1;
                if (a[query.sortBy] > b[query.sortBy]) return query.ascending ? 1 : -1;
                return 0;
            })
            if(worstPad[0]&&worstPad[0][query.sortBy] < padType[query.sortBy]){
              if(queryOffsetCounter < query.offset){
                queryOffsetCounter++
                continue
              }
              currentWinners.splice(currentWinners.indexOf(worstPad[0]), 1)
              currentWinners.push({
                padName: res,
                lastEdited: await pad.getLastEdit(),
                userCount: api.padUsersCount(res).padUsersCount,
                revisionNumber: pad.getHeadRevisionNumber()
              })
            }
          }
        }
        data.results = currentWinners;
      }

        socket.emit('results:padLoad', data);
    })


    socket.on('deletePad', async (padId: string) => {
      const padExists = await padManager.doesPadExists(padId);
      if (padExists) {
        const pad = await padManager.getPad(padId);
        await pad.remove();
        socket.emit('results:deletePad', padId);
      }
    })

    socket.on('restartServer', async () => {
      console.log('Admin request to restart server through a socket on /admin/settings');
      settings.reloadSettings();
      await plugins.update();
      await hooks.aCallAll('loadSettings', {settings});
      await hooks.aCallAll('restartServer');
    });
  });
};



const searchPad = async (query:PadSearchQuery) => {

}

