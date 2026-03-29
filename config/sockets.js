/**
 * WebSocket Server Settings
 * (sails.config.sockets)
 *
 * These settings provide transparent access to the options for Sails'
 * encapsulated WebSocket server, as well as some additional Sails-specific
 * configuration layered on top.
 *
 * For more information on sockets configuration, including advanced config options, see:
 * https://sailsjs.com/config/sockets
 */
module.exports.sockets = {

  /**
   * Whether to allow a socket to connect to the server.
   * By default, all connections are allowed.
   */
  // beforeConnect: function(handshake, cb) {
  //   return cb(null, true);
  // },

  /**
   * This custom afterDisconnect function will be run each time a socket
   * disconnects.
   */
  // afterDisconnect: function(session, socket, cb) {
  //   return cb();
  // },

  // More configuration options for Sails+Socket.io:
  // https://sailsjs.com/config/sockets
};
