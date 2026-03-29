'use strict';

/**
 * BaseController.js
 *
 * Base controller for all sails.js controllers. This just contains some common code
 * that every controller uses
 */
module.exports = {
  /**
   * Generic find action for controller.
   *
   * @param   {Request}   request
   * @param   {Response}  response
   */
  find: function find(request, response) {
    // In Sails 1.x, use request.options.model or derive from controller name
    var modelIdentity = request.options.model || request.options.controller;

    // If not found, try to derive from the controller's identity
    if (!modelIdentity && this.identity) {
      modelIdentity = this.identity;
    }

    var Model = sails.models[modelIdentity];

    if (!Model) {
      return response.serverError('Could not determine model for find action.');
    }

    // Parse query parameters for sorting, filtering, pagination
    var where = {};
    var sort = request.query.sort || 'id DESC';
    var limit = parseInt(request.query.limit) || 1000;
    var skip = parseInt(request.query.skip) || 0;

    // If where parameter is provided, parse it
    if (request.query.where) {
      try {
        where = JSON.parse(request.query.where);
      } catch (e) {
        // Invalid JSON, use empty where
      }
    }

    Model
      .find(where)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .exec(function found(error, records) {
        if (error) {
          response.negotiate(error);
        } else {
          response.ok(records);
        }
      })
    ;
  },

  /**
   * Generic findOne action for controller.
   *
   * @param   {Request}   request
   * @param   {Response}  response
   */
  findOne: function findOne(request, response) {
    var modelIdentity = request.options.model || request.options.controller;

    if (!modelIdentity && this.identity) {
      modelIdentity = this.identity;
    }

    var Model = sails.models[modelIdentity];

    if (!Model) {
      return response.serverError('Could not determine model for findOne action.');
    }

    var id = request.params.id;

    Model
      .findOne({id: id})
      .exec(function found(error, record) {
        if (error) {
          response.negotiate(error);
        } else if (!record) {
          response.notFound();
        } else {
          response.ok(record);
        }
      })
    ;
  },

  /**
   * Generic count action for controller.
   *
   * @param   {Request}   request
   * @param   {Response}  response
   */
  count: function count(request, response) {
    // In Sails 1.x, use request.options.model or derive from controller name
    var modelIdentity = request.options.model || request.options.controller;

    // If not found, try to derive from the controller's identity
    if (!modelIdentity && this.identity) {
      modelIdentity = this.identity;
    }

    var Model = sails.models[modelIdentity];

    if (!Model) {
      return response.serverError('Could not determine model for count action.');
    }

    // Parse where parameter if provided
    var where = {};
    if (request.query.where) {
      try {
        where = JSON.parse(request.query.where);
      } catch (e) {
        // Invalid JSON, use empty where
      }
    }

    Model
      .count(where)
      .exec(function found(error, count) {
        if (error) {
          response.negotiate(error);
        } else {
          response.ok({count: count});
        }
      })
    ;
  }
};
