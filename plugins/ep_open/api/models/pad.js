'use strict';

const Sequelize = require('sequelize');
const ModelBase = require('./base');
const User = require('./user');
const randomString = require('../common/helpers').randomString;

const Pad = ModelBase('pad', {
	id: {
		primaryKey: true,
		type: Sequelize.STRING
	},
	etherpadId: Sequelize.STRING,
	type: {
		type: Sequelize.STRING,
		defaultValue: 'child'
	},
	title: Sequelize.STRING,
	description: Sequelize.TEXT,
	views: Sequelize.INTEGER,
	ownerId: Sequelize.UUID
}, {
	defaultScope: {
		include: [{
			model: User,
			as: 'owner'
		}]
	},
	scopes: {
		full: {
			attributes: {
				exclude: ['ownerId']
			},
			include: [{
				model: User,
				as: 'owner'
			}],
			order: [['createdAt']]
		}
	}
});

User.hasMany(Pad, { foreignKey: 'ownerId', as: 'owner' });
Pad.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

module.exports = Pad;