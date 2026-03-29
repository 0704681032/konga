'use strict';

/**
 * Datastores
 * (sails.config.datastores)
 *
 * A datastore configuration in Sails 1.x replaces the old `connections` concept
 * from Sails 0.12.x. Each datastore defines how to connect to a particular database.
 *
 * For more information on configuring datastores, check out:
 * https://sailsjs.com/config/datastores
 */

function envVal(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  return val;
}

var datastores = {
  /**
   * Local disk storage for DEVELOPMENT ONLY
   */
  localDiskDb: {
    adapter: 'sails-disk',
    filePath: process.env.NODE_ENV === 'test' ? './.tmp/' : (process.env.STORAGE_PATH || './kongadata/'),
    fileName: process.env.NODE_ENV === 'test' ? 'localDiskDb.db' : 'konga.db'
  }
};

// Only register external database datastores when DB_ADAPTER is configured
var dbAdapter = process.env.DB_ADAPTER;
if (dbAdapter && dbAdapter !== 'localDiskDb') {

  if (dbAdapter === 'mysql') {
    datastores.mysql = {
      adapter: 'sails-mysql',
      url: envVal(process.env.DB_URI),
      host: envVal(process.env.DB_HOST, 'localhost'),
      port: envVal(process.env.DB_PORT, 3306),
      user: envVal(process.env.DB_USER, 'root'),
      password: envVal(process.env.DB_PASSWORD),
      database: envVal(process.env.DB_DATABASE, 'konga_database')
    };
  }

  if (dbAdapter === 'mongo') {
    datastores.mongo = {
      adapter: 'sails-mongo',
      url: envVal(process.env.DB_URI),
      host: envVal(process.env.DB_HOST, 'localhost'),
      port: envVal(process.env.DB_PORT, 27017),
      user: envVal(process.env.DB_USER),
      password: envVal(process.env.DB_PASSWORD),
      database: envVal(process.env.DB_DATABASE, 'konga_database')
    };
  }

  if (dbAdapter === 'postgres') {
    datastores.postgres = {
      adapter: 'sails-postgresql',
      url: envVal(process.env.DB_URI),
      host: envVal(process.env.DB_HOST, 'localhost'),
      user: envVal(process.env.DB_USER, 'postgres'),
      password: envVal(process.env.DB_PASSWORD),
      port: envVal(process.env.DB_PORT, 5432),
      database: envVal(process.env.DB_DATABASE, 'konga_database'),
      poolSize: envVal(process.env.DB_POOLSIZE, 10),
      ssl: !!process.env.DB_SSL
    };
  }

  if (dbAdapter === 'sqlserver') {
    datastores.sqlserver = {
      adapter: 'sails-sqlserver',
      url: envVal(process.env.DB_URI),
      host: envVal(process.env.DB_HOST, 'localhost'),
      user: envVal(process.env.DB_USER),
      password: envVal(process.env.DB_PASSWORD),
      port: envVal(process.env.DB_PORT, 49150),
      database: envVal(process.env.DB_DATABASE, 'konga_database')
    };
  }
}

module.exports.datastores = datastores;
