'use strict';

var session = require('express-session');
var MemoryStore = require('memorystore')(session);

/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * Only applies to HTTP requests (not WebSockets)
 *
 * For more information on configuration, check out:
 * https://sailsjs.com/config/http
 */

module.exports.http = {
  /****************************************************************************
   *                                                                           *
   * Express middleware to use for every Sails request. To add custom          *
   * middleware to the mix, add a function to the middleware config object and *
   * add its key to the "order" array.                                         *
   *                                                                           *
   ****************************************************************************/
  middleware: {
    /***************************************************************************
     *                                                                          *
     * The order in which middleware should be run for HTTP request. (the Sails *
     * router is invoked by the "router" middleware below.)                     *
     *                                                                          *
     ***************************************************************************/
    order: [
      'cookieParser',
      'sessionMiddleware',
      'passportInit',
      'passportSession',
      'bodyParser',
      'compress',
      'poweredBy',
      '$custom',
      'router',
      'www',
      'favicon'
    ],

    // Custom session middleware (bypassing Sails session hook)
    sessionMiddleware: session({
      secret: 'konga_session_secret_key_12345',
      resave: true,
      saveUninitialized: true,
      store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 86400000 // 24 hours
      }
    }),

    passportInit: require('passport').initialize(),
    passportSession: require('passport').session()
  },

  /***************************************************************************
   *                                                                          *
   * The number of seconds to cache flat files on disk being served by        *
   * Express static middleware (by default, these files are in `.tmp/public`) *
   *                                                                          *
   ***************************************************************************/
  cache: 31557600000
};
