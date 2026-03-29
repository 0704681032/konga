'use strict';

var _ = require('lodash');
var async = require('async');
var defSeedData = require('../../config/default-seed-data.js');

/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */


var defaultModel = _.merge(_.cloneDeep(require('../base/Model')), {
  tableName: "konga_users",
  primaryKey: 'id',
  schema: false, // Allow flexible attributes for sorting
  attributes: {
    id: {
      type: 'number',
      columnType: 'integer',
      autoIncrement: true
    },
    username: {
      type: 'string',
      unique: true,
      required: true
    },
    email: {
      type: 'string',
      isEmail: true,
      unique: true,
      required: true
    },
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    admin: {
      type: 'boolean',
      defaultsTo: false
    },

    node_id: {
      type: 'string',
      defaultsTo: ''
    },

    active: {
      type: 'boolean',
      defaultsTo: false
    },

    activationToken: {
      type: 'string'
    },

    node: {
      model: 'kongnode'
    },

    // Passport configurations
    passports: {
      collection: 'Passport',
      via: 'user'
    },

    // Timestamp fields
    createdAt: {
      type: 'number',
      columnType: 'bigint',
      autoCreatedAt: true
    },
    updatedAt: {
      type: 'number',
      columnType: 'bigint',
      autoUpdatedAt: true
    },
  },

  afterDestroy: function (values, cb) {

    sails.log("User:afterDestroy:called => ", values);

    // In Sails 1.x, afterDestroy receives a single record, not an array
    var users = Array.isArray(values) ? values : [values];

    var fns = [];

    users.forEach(function (user) {
      fns.push(function (callback) {
        // Delete passports
        sails.models.passport.destroy({user: user.id})
          .exec(callback)
      })
    })

    async.series(fns, cb);

  },

  seedData: defSeedData.userSeedData.map(function (orig) {
    return {
      "username": orig.username,
      "email": orig.email,
      "firstName": orig.firstName,
      "lastName": orig.lastName,
      "admin": orig.admin,
      "active": orig.active
    }
  })
});

var mongoModel = function () {
  var obj = _.cloneDeep(defaultModel)
  delete obj.attributes.id
  return obj;
}

if(sails.config.models.datastore == 'postgres' && process.env.DB_PG_SCHEMA) {
  defaultModel.meta =  {
    schemaName: process.env.DB_PG_SCHEMA
  }
}

module.exports = sails.config.models.datastore == 'mongo' ? mongoModel() : defaultModel
