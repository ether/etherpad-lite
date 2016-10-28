'use strict';

const _ = require('lodash');
const co = require('co');
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
		const where = {};

		if (request.query.query) {
			where.title = { $iLike: `%${request.query.query}%` };
		} else if (request.query.ids) {
			where.id = { $in: request.query.ids.split(',') };
		}

		return yield Pad.findAndCountAll({
			limit: perPage,
			offset: page * perPage,
			where: where,
			order: [['created_at']]
		});
	}));

	api.get('/pads/:id', async(function*(request, response) {
		let pad = yield Pad.scope('full').findById(request.params.id);;

		if (!pad) {
			if (request.params.id === 'root') {
				pad = yield Pad.scope('full').create({
					id: 'root',
					type: 'root',
					etherpadId: 'root',
					title: 'Open companies'
				});
			} else {
				return responseError(response, 'Pad is not found');
			}
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

	api.get('/pads/:id/hierarchy', async(function*(request, response) {
		const id = request.params.id;

		if (id === 'root') {
			const rootPad = yield co.wrap(buildHierarchy)(id, {}, 1);

			if (!_.isEmpty(rootPad)) {
				const children = rootPad.children;

				rootPad.children = [];

				if (children) {
					for (var i = 0; i < children.length; i++) {
						const child = children[i];

						if (child.type === 'company') {
							rootPad.children.push(yield co.wrap(buildHierarchy)(child.id, {}));
						}
					}
				}
			}

			return rootPad;
		} else {
			return yield co.wrap(buildHierarchy)(id, {});
		}
	}));

	function* buildHierarchy(id, store, depth) {
		if (store[id]) {
			return store[id];
		};

		const pad = yield Pad.scope('full').findById(id);

		if (!pad) {
			return {};
		}

		const padData = yield promiseWrapper(padManager.getPad, [pad.etherpadId]);
		const result = {
			id: pad.id,
			title: pad.title,
			type: pad.type,
		};
		const children = [];

		store[id] = Object.assign({}, result);

		if (depth === undefined || (typeof depth === 'number' && --depth >= 0)) {
			Object.keys(padData.pool.attribToNum).forEach(attribute => {
				if (/^padLink,.+/.test(attribute)) {
					const linkId = attribute.replace(/^padLink,([^,]*)?(.*)/g, '$1');

					if (linkId) {
						children.push(linkId);
					}
				}
			});

			if (children.length) {
				result.children = [];

				for (var i = 0; i < children.length; i++) {
					const child = yield co.wrap(buildHierarchy)(children[i], store, depth);

					if (!_.isEmpty(child)) {
						result.children.push(child);
					}
				}
			}
		}

		return result;
	}
};