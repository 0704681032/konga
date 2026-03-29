'use strict';

/**
 * BaseController.js
 *
 * Base controller for all sails.js controllers. This just contains some common code
 * that every controller uses
 */
module.exports = {
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

    Model
      .count({})
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
