'use strict'

import {AChangeSet} from "../types/PadType";
import {Revision} from "../types/Revision";

const promises = require('./promises');
const AttributePool = require('ep_etherpad-lite/static/js/AttributePool');

const padManager = require('ep_etherpad-lite/node/db/PadManager');
const db = require('ep_etherpad-lite/node/db/DB');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const padMessageHandler = require('ep_etherpad-lite/node/handler/PadMessageHandler');

exports.deleteAllRevisions = async (padID: string): Promise<void> => {

  const randomPadId = padID + 'aertdfdf' + Math.random().toString(10)

  let pad = await padManager.getPad(padID);
  await pad.copyPadWithoutHistory(randomPadId, false);
  pad = await padManager.getPad(randomPadId);
  await pad.copyPadWithoutHistory(padID, true);
  await pad.remove();
}

const createRevision = async (aChangeset: AChangeSet, timestamp: number, isKeyRev: boolean, authorId: string, atext: any, pool: any) => {

  if (authorId !== '') pool.putAttrib(['author', authorId]);

  return {
    changeset: aChangeset,
    meta: {
      author: authorId,
      timestamp: timestamp,
      ...isKeyRev ? {
        pool: pool,
        atext: atext,
      } : {},
    },
  };
}

exports.deleteRevisions = async (padId: string, keepRevisions: number): Promise<void> => {

  let pad = await padManager.getPad(padId);
  await pad.check()

  console.log('Initial pad is valid')

  padMessageHandler.kickSessionsFromPad(padId)

  const cleanupUntilRevision = pad.head - keepRevisions
  console.log('Composing changesets: ', cleanupUntilRevision)
  const changeset = await padMessageHandler.composePadChangesets(pad, 0, cleanupUntilRevision + 1)

  const revisions: Revision[] = [];

  for (let rev = 0; rev <= pad.head; ++rev) {
    revisions[rev] = await pad.getRevision(rev)
  }

  console.log('Loaded revisions: ', revisions.length)

  await promises.timesLimit(cleanupUntilRevision, 500, async (i: string) => {
    console.log('Delete revision: ', i)
    await db.remove(`pad:${padId}:revs:${i}`, null);
  });

  let padContent = await db.get(`pad:${padId}`)
  padContent.head = keepRevisions
  await db.set(`pad:${padId}`, padContent);

  let newAText = Changeset.makeAText('\n');
  let newPool = new AttributePool()

  for (let rev = 0; rev <= cleanupUntilRevision; ++rev) {
    newAText = Changeset.applyToAText(revisions[rev].changeset, newAText, newPool);
  }

  const revision = await createRevision(
    changeset,
    revisions[cleanupUntilRevision].meta.timestamp,
    0 === pad.getKeyRevisionNumber(0),
    '',
    newAText,
    newPool
  );
  console.log('Create revision 0: ', revision);

  const p: Promise<void>[] = [];

  p.push(db.set(`pad:${padId}:revs:0`, revision))

  p.push(promises.timesLimit(keepRevisions, 500, async (i: number) => {
    const rev = i + cleanupUntilRevision + 1
    const newRev = rev - cleanupUntilRevision;
    console.log('Map revision: ' + rev + ' => ' + newRev)

    newAText = Changeset.applyToAText(revisions[rev].changeset, newAText, newPool);

    const revision = await createRevision(
      revisions[rev].changeset,
      revisions[rev].meta.timestamp,
      newRev === pad.getKeyRevisionNumber(newRev),
      revisions[rev].meta.author,
      newAText,
      newPool
    );
    console.log('Create revision: ', newRev, revision);

    await db.set(`pad:${padId}:revs:${newRev}`, revision);
  }));

  await Promise.all(p)

  console.log('Finished migration. Checking pad now')


  padManager.unloadPad(padId);

  let newPad = await padManager.getPad(padId);
  newPad.check();
}

exports.checkTodos = async () => {
  await new Promise(resolve => setTimeout(resolve, 5000));

  await Promise.all((await padManager.listAllPads()).padIDs.map(async (padId: string) => {
    const pad = await padManager.getPad(padId);

    console.log('pad user count', padId, padMessageHandler.padUsersCount(padId))
    const revisionDate = await pad.getRevisionDate(pad.getHeadRevisionNumber())
    console.log('pad last modified', padId, Date.now() - revisionDate)

    if (pad.head < 10000 || padMessageHandler.padUsersCount(padId) > 0 || Date.now() < revisionDate + 1000 * 60 * 60 * 24) {
      return
    }

    try {
      await exports.deleteRevisions(padId, 100)
      console.log('successful cleaned up pad: ', padId)
    } catch (err: any) {
      console.error(`Error in pad ${padId}: ${err.stack || err}`);
      return;
    }
  }));
}
