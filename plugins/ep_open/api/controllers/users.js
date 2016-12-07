'use strict';

const authorManager = require('ep_etherpad-lite/node/db/AuthorManager');
const helpers = require('../common/helpers');
const async = helpers.async;
const responseError = helpers.responseError;
const collectData = helpers.collectData;
const User = require('../models/user');

function checkUniq(data) {
	return User.find({
		where: {
			$or: [{
				email: data.email
			}, {
				nickname: data.nickname
			}]
		}
	}).then(user => {
		if (user) {
			user = user.length ? user[0] : user;

			return new Error(`${user.email === data.email ? 'Email' : 'Nickname'} is already taken`)
		}
	})
}

function updateAuthorName(token, user) {
	authorManager.getAuthor4Token(token, (error, author) => authorManager.setAuthorName(author, user.nickname));
}

module.exports = api => {
	api.get('/users', async(function*(request, response) {
		const page = (parseInt(request.query.page, 10) || 1) - 1;
		const perPage = parseInt(request.query.perPage, 10) || 50;
		let where = {};

		if (request.query.query) {
			where = {
				$or: ['name', 'email', 'surname'].map(attr => ({
					[attr]: { $iLike: `%${request.query.query}%` }
				}))
			};
		}

		console.log(where);

		return yield User.findAndCountAll({
			limit: perPage,
			offset: page * perPage,
			where: where,
			order: 'created_at'
		});
	}));

	api.get('/users/:id', async(function*(request, response) {
		return yield User.findById(request.params.id);
	}));

	api.post('/users', async(function*(request, response) {
		request.checkBody('email', 'Email is required').notEmpty();
		request.checkBody('nickname', 'Nickname is required').notEmpty();
		request.checkBody('password', 'Password is required').notEmpty();
		request.checkErrors();

		const data = collectData(request, {
			body: ['email', 'nickname', 'password']
		});

		yield checkUniq(data);

		return yield User.create(data);
	}));

	api.put('/users/:id', async(function*(request, response) {
		if (!(request.token && request.token.user && request.token.user.id == request.params.id)) {
			return responseError(response, 'You have no permission for this operation', 403);
		}

		const user = yield User.findById(request.params.id);

		if (!user) {
			return responseError(response, 'User is not found');
		}

		request.cookies.token && updateAuthorName(request.cookies.token, user);

		const data = collectData(request, {
			body: ['email', 'nickname', 'password']
		});

		yield checkUniq(data);

		return yield user.update(data);
	}));

	api.delete('/users/:id', async(function*(request, response) {
		if (!(request.token && request.token.user && request.token.user.id == request.params.id)) {
			return responseError(response, 'You have no permission for this operation', 403);
		}

		return yield User.destroy({ where: { id: request.params.id } }).then(() => { success: true });
	}));

	api.put('/users/:id/privileges', async(function*(request, response) {
		if (!(request.token && request.token.user && request.token.user.role == 'admin')) {
			return responseError(response, 'You have no permission for this operation', 403);
		}

		request.checkBody('role', 'Role is incorrect').optional().isIn(['admin', 'user']);
		request.checkErrors();

		const user = yield User.findById(request.params.id);

		if (!user) {
			return responseError(response, 'User is not found');
		}

		const data = collectData(request, {
			body: ['permissions', 'role']
		});

		return yield user.update(data);
	}));
};


module.exports.checkUserUniq = checkUniq;
module.exports.updateAuthorName = updateAuthorName;
