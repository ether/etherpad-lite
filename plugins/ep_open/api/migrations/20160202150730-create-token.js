'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('tokens', {
            id: {
                autoIncrement: false,
                primaryKey: true,
                type: Sequelize.UUID
            },
            expires: Sequelize.DATE,
            user_id: Sequelize.UUID,
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
        return queryInterface.dropTable('tokens');
    }
};