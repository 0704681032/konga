/**
 * Created by user on 06/10/2017.
 */

'use strict'

var pg = require("pg");
var _ = require("lodash");
var urlModule = require('url');

// Parse method copied from https://github.com/brianc/node-postgres
// Copyright (c) 2010-2014 Brian Carlson (brian.m.carlson@gmail.com)
// MIT License

function parse(str) {
  //unix socket
  if(str.charAt(0) === '/') {
    var config = str.split(' ');
    return { host: config[0], database: config[1] };
  }

  // url parse expects spaces encoded as %20
  var result = urlModule.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str) ? encodeURI(str).replace(/\%25(\d\d)/g, "%$1") : str, true);
  var config = result.query;
  for (var k in config) {
    if (Array.isArray(config[k])) {
      config[k] = config[k][config[k].length-1];
    }
  }

  config.port = result.port;
  if(result.protocol == 'socket:') {
    config.host = decodeURI(result.pathname);
    config.database = result.query.db;
    config.client_encoding = result.query.encoding;
    return config;
  }
  config.host = result.hostname;

  // result.pathname is not always guaranteed to have a '/' prefix (e.g. relative urls)
  // only strip the slash if it is present.
  var pathname = result.pathname;
  if (pathname && pathname.charAt(0) === '/') {
    pathname = result.pathname.slice(1) || null;
  }
  config.database = pathname && decodeURI(pathname);

  var auth = (result.auth || ':').split(':');
  config.user = auth[0];
  config.password = auth.splice(1).join(':');

  if (config.ssl === 'true' || config.ssl === '1') {
    config.ssl = true;
  }

  return config;
}

/**
 * Build pg connection options from env vars
 */
function buildOpts(overrideUrl) {
  var connUrl = overrideUrl || process.env.DB_URI;
  if (connUrl) {
    return parse(connUrl);
  }
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'konga_database',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL ? true : false
  };
}

/**
 * Test a database connection with timeout
 * @param {Object} opts - pg connection options
 * @param {Function} callback - callback(err, client, done)
 */
function testConnection(opts, callback) {
  var timeout = parseInt(process.env.DB_FAILOVER_TIMEOUT, 10) || 5000;
  var config = _.merge({ connectionTimeoutMillis: timeout }, opts);

  pg.connect(config, function (err, client, done) {
    if (err) {
      return callback(err, null, done);
    }
    client.query('SELECT 1', function (queryErr) {
      done();
      if (queryErr) {
        return callback(queryErr, null, function(){});
      }
      return callback(null, client, done);
    });
  });
}

/**
 * Try standby database if available
 * @param {Object} primaryOpts - the primary connection opts that failed
 * @param {Error} primaryErr - the error from primary connection
 * @param {Function} next - callback to continue startup
 */
function tryStandby(primaryOpts, primaryErr, next) {
  var standbyUrl = process.env.DB_STANDBY_URI;

  if (!standbyUrl) {
    console.error("Failed to connect to primary database:", primaryErr.message);
    console.error("No DB_STANDBY_URI configured. Exiting.");
    return next(primaryErr);
  }

  console.log("Primary database connection failed:", primaryErr.message);
  console.log("DB_STANDBY_URI detected, trying standby database...");

  var standbyOpts = parse(standbyUrl);

  testConnection(standbyOpts, function (err, client, done) {
    if (err) {
      console.error("Standby database connection failed:", err.message);
      console.error("Failed to connect to any database. Exiting.");
      return next(err);
    }

    // Switch to standby: update env var so datastores.js picks it up
    process.env.DB_URI = standbyUrl;
    if (standbyOpts.host) process.env.DB_HOST = standbyOpts.host;
    if (standbyOpts.port) process.env.DB_PORT = String(standbyOpts.port);
    if (standbyOpts.user) process.env.DB_USER = standbyOpts.user;
    if (standbyOpts.password) process.env.DB_PASSWORD = standbyOpts.password;
    if (standbyOpts.database) process.env.DB_DATABASE = standbyOpts.database;

    console.log("Standby database connected. Switched to standby [" + (standbyOpts.host || standbyUrl) + "].");
    return next();
  });
}

module.exports = {
  run : function (next) {

    console.log("Using postgres DB Adapter.");

    var self     = this;
    var opts     = buildOpts();

    testConnection(opts, function (err, client, done) {
      if (err) {

        // Database does not exist - try to create it on primary
        if(err.code == "3D000") {
          console.log("Database `" + opts.database + "` does not exist. Creating...");
          return self.create(opts, next);
        }

        // Connection failed - try standby
        return tryStandby(opts, err, next);

      } else {
        console.log("Database exists. Continue...");
        return next();
      }
    });
  },


  create : function(opts, next) {

    // Hook up to postgres db so we can create a new one
    var defaultDbOpts = _.merge(_.cloneDeep(opts),{
      database : "postgres"
    });

    pg.connect(defaultDbOpts, function (err, client, done) {
      if (err) {
        // Failed to connect even to default db - try standby
        return tryStandby(opts, err, next);
      }

      client.query('CREATE DATABASE ' + opts.database, function (err, res) {
        done();
        if (err) {
          console.log("Failed to create `" + opts.database +"`", err.message);
          return next(err);
        }

        console.log("Database `" + opts.database + "` created! Continue...");

        return next();

      });
    });
  }
}
