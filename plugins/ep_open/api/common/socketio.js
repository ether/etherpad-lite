const socketio = require('ep_etherpad-lite/node_modules/socket.io');
let io;

module.exports.init = function(server) {
    io = socketio({ path: '/api_socket' }).listen(server);
    module.exports = io;
};

module.exports.emit = function(name, data) {
    if (io) {
        return io.sockets.emit(name, data);
    } else {
        return false;
    }
}