'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('pads', {
            id: {
                autoIncrement: false,
                primaryKey: true,
                type: Sequelize.STRING
            },
            etherpad_id: Sequelize.STRING,
            type: Sequelize.STRING,
            title: Sequelize.STRING,
            description: Sequelize.TEXT,
            views: Sequelize.INTEGER,
        	owner_id: Sequelize.UUID,
            tags: Sequelize.STRING,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('pads');
    }
};