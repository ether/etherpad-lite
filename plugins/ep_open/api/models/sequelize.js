'use strict';

const _ = require('lodash');
const Sequelize = require('sequelize');
const config = require(__dirname + '/../../../../credentials.json');
const dbConfig = {
    'username': config.dbSettings.user,
    'password': config.dbSettings.password,
    'database': config.dbSettings.database,
    'host': config.dbSettings.host,
    'port': '5432',
    "dialect": config.dbType
};

module.exports = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);