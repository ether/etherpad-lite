'use strict';

const co = require('co');
const _ = require('lodash');

exports.async = gen => {
	const fn = co.wrap(gen);

	if (gen.length === 4) {
		return function(error, request, response, next) {
		  return fn(error, request, response, next).catch(next);
		}
	}

	return function(request, response, next) {
		return fn(request, response, next).then(
			data => {
				if (data !== response) {
					data = typeof data === 'object' ? data : {};

					if (_.isArray(data)) {
						data = data.map(item => item.toPublicJSON ? item.toPublicJSON() : item)
					} else {
						// If data is sequelize model then convert it to plain object
						if (data.toPublicJSON) {
							data = data.toPublicJSON();
						} else if (data.toJSON) {
							data = data.toJSON();
						}
					}

					// If url contains company id then filter reputation of all users by this company id
					if (request.params.companyId) {
						data = filterReputation(request.params.companyId, data);
					}
				}

				response.send(data);
			},
			error => {
				let message = error.message;

				try {
					switch (error.name) {
						case 'SequelizeUniqueConstraintError':
							message = `This ${error.errors[0].path} is already taken`;
							break;
					}
				} catch(e) {}

				response.status(400).send({ error: message });
			}
		);
	};
};

exports.responseHandler = (response, errorType) => {
	return (error, data) => {
		if (error) {
			response.status(errorType || 400).send({ error: error.message });
		} else {
			response.send(data);
		}
	};
};

exports.responseError = (response, error, code) => {
	return response.status(code || 400).send({ error });
};

exports.checkAuth = (request, response, next) => {
	request.token && request.token.id ? next() : exports.responseError(response, 'Access allowed only for authorized users', 401);
};

exports.collectData = (request, config) => {
	const data = {};

	if (config.owner) {
		data.ownerId = request.token && request.token.user && request.token.user.id;
	}

	if (config.body) {
		config.body.forEach(key => {
			const value = request.body[key];

			if (value !== undefined) {
				data[key] = value;
			}
		});
	}

	if (config.params) {
		config.params.forEach(key => {
			const value = request.params[key];

			if (value !== undefined) {
				data[key] = value;
			}
		});
	}

	return data;
};

exports.randomString = length => {
	const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	let string = '';

	for (var i = 0; i < length; i++) {
		const rnum = Math.floor(Math.random() * chars.length);

		string += chars.substring(rnum, rnum + 1);
	}

	return string;
}

exports.promiseWrapper = (object, method, args = []) => {
	return new Promise((resolve, reject) => {
		object[method].apply(object, args.concat((error, data) => error ? reject(error) : resolve(data)));
	});
}


/**
 * Filter reputation object and leave only reputation value for passed companyId
 * @param companyId - Id of company
 * @param data - Object with data
 * @return {Object} - Filtered object
 */
function filterReputation(companyId, data) {
	_.keys(data).forEach(key => {
		const value = data[key];

		if (key === 'reputation') {
			data[key] = (value || {})[companyId] || 1;
		} else {
			if (_.isArray(value)) {
				data[key] = value.map(filterReputation.bind(this, companyId));
			} else if (_.isObject(value) && !_.isDate(value)) {
				data[key] = filterReputation(companyId, value);
			}
		}
	});

	return data;
};