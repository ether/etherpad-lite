'use strict';

const _ = require('lodash');
const Sequelize = require('sequelize');
const sequelize = require('./sequelize');

module.exports = (name, attributes, options) => {
	const privateAttributes = [];

	attributes = attributes || {};
	options = options || {};

	// Add dates attributes to explicitly set db field name for them
	attributes.createdAt = Sequelize.DATE;
	attributes.updatedAt = Sequelize.DATE;

	Object.keys(attributes).forEach(key => {
		let value = attributes[key];

		if (typeof value === 'object' && value.private) {
			privateAttributes.push(key);
			delete attributes[key].private;
		}

		// Add snake_case field name for camelCase attributes
		if (/[A-Z]/.test(key) && !value.field) {
			if (typeof value !== 'object') {
				value = { type: value };
			}

			attributes[key] = Object.assign({
				field: key.replace(/[A-Z]/g, str => '_' + str.toLowerCase())
			}, value);
		}
	});

	// If there is option privateAttributes, then we omit these attributes from the final JSON
	if (privateAttributes.length) {
		options.instanceMethods = options.instanceMethods || {};
		options.instanceMethods.toPublicJSON = function() {
			return _.omit(this.toJSON(), privateAttributes);
		};
	}

	return sequelize.define(name, attributes, options);
};