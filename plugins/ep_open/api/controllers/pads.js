'use strict';

const _ = require('lodash');
const md5 = require('md5');
const padManager = require('ep_etherpad-lite/node/db/PadManager');
const sequelize = require('../models/sequelize');
const helpers = require('../common/helpers');
const async = helpers.async;
const responseError = helpers.responseError;
const checkAuth = helpers.checkAuth;
const collectData = helpers.collectData;
const randomString = helpers.randomString;
const promiseWrapper = helpers.promiseWrapper;
const User = require('../models/user');
const Pad = require('../models/pad');

module.exports = api => {
	api.get('/pads', async(function*(request, response) {
		const page = (parseInt(request.query.page, 10) || 1) - 1;
		const perPage = parseInt(request.query.perPage, 10) || 50;
		let whereConds = [];
		let join = '';
		let total;

		if (request.query.query) {
			whereConds.push(`LOWER("pad"."title") LIKE '%${request.query.query.toLowerCase()}%'`);
		} else if (request.query.ids) {
			whereConds.push(`"pad"."id" similar to '%(${request.query.ids.split(',').join('|')})%'`);
		}

		const where = whereConds.length ? (`WHERE ${whereConds.join(' AND ')}`) : '';

		// Sequelize has a pads with filtering by associated model bound through junction table, therefore we
		// use plain query for getting of total count and ids for current page.
		return yield Promise.all([
			sequelize.query(`
				SELECT COUNT(DISTINCT("pad"."id")) AS "count"
				FROM   "pads" AS "pad"
				${join}
				${where}
			`).then(result => result[0][0].count),
			sequelize.query(`
				SELECT DISTINCT ON ("id") "pad"."id" as "id"
				FROM   "pads" AS "pad"
				${join}
				${where}
				ORDER  BY "pad"."id", "pad"."created_at" DESC
				LIMIT  ${perPage}
				OFFSET ${page * perPage};
			`).then(result => result[0].map(row => row.id))
		])
		.then(results => {
			total = results[0];

			return Pad.findAll({
				where: {
					id: {
						$in: results[1]
					}
				},
				order: '"createdAt" DESC'
			});
		})
		.then(pads => ({
			count: total,
			rows: pads.map(row => row.toJSON())
		}));
	}));

	api.get('/pads/:id', async(function*(request, response) {
		const pad = yield Pad.scope('full').findById(request.params.id);

		if (!pad) {
			return responseError(response, 'Pad is not found');
		}

		const views = (pad.views || 0) + 1;

		pad.views = views;
		pad.update({ views });

		return pad;
	}));

	api.post('/pads', async(function*(request, response) {
		const id = randomString(10);
		const data = collectData(request, {
			owner: true,
			body: ['title', 'description', 'type']
		});

		if (data.type && !/^company|child$/.test(data.type)) {
			delete data.type;
		}

		data.id = id;
		data.etherpadId = md5(id);

		const padData = yield promiseWrapper(padManager.getPad, [data.etherpadId]);
		const pad = yield Pad.scope('full').create(data);

		return yield pad.reload({
			include: [{
				model: User,
				as: 'owner'
			}]
		});
	}));

	api.put('/pads/:id', async(function*(request, response) {
		const pad = yield Pad.scope('full').findById(request.params.id);

		if (!pad) {
			return responseError(response, 'Pad is not found');
		}
		//
		// if (!request.token.user.isActionAllowed('EDIT_PADS', pad.owner.id)) {
		// 	return responseError(response, 'You do not have permission for this action');
		// }

		yield pad.update(collectData(request, { body: ['title', 'description'] }));

		return pad;
	}));

	api.delete('/pads/:id', async(function*(request, response) {
		const pad = yield Pad.scope('full').findById(request.params.id);

		if (!pad) {
			return responseError(response, 'Pad is not found');
		}
		//
		// if (!request.token.user.isActionAllowed('DELETE_PADS', pad.owner.id)) {
		// 	return responseError(response, 'You do not have permission for this action');
		// }

		return yield pad.destroy();
	}));
};