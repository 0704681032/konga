'use strict';

var _ = require('lodash');
var cron = require('node-cron');

module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {

  // Override base methods to use correct model
  find: function(req, res) {
    var params = req.query || {};
    var query = sails.models.snapshotschedule.find();

    if (params.where) {
      try {
        var where = typeof params.where === 'string' ? JSON.parse(params.where) : params.where;
        query.where(where);
      } catch (e) {}
    }
    if (params.limit) query.limit(parseInt(params.limit, 10));
    if (params.skip) query.skip(parseInt(params.skip, 10));
    query.sort(params.sort || 'id DESC');

    query.exec(function(err, records) {
      if (err) return res.negotiate(err);
      return res.ok(records);
    });
  },

  findOne: function(req, res) {
    sails.models.snapshotschedule.findOne({id: req.params.id}).exec(function(err, record) {
      if (err) return res.negotiate(err);
      if (!record) return res.notFound();
      return res.ok(record);
    });
  },

  count: function(req, res) {
    var where = {};
    if (req.query.where) {
      try {
        where = JSON.parse(req.query.where);
      } catch (e) {}
    }
    sails.models.snapshotschedule.count(where).exec(function(err, count) {
      if (err) return res.negotiate(err);
      return res.ok({count: count});
    });
  },

  update: function(req, res) {
    sails.models.snapshotschedule.update({id: req.params.id}, req.body).meta({fetch: true}).exec(function(err, records) {
      if (err) return res.negotiate(err);
      if (!records || records.length === 0) return res.notFound();
      return res.ok(records[0]);
    });
  },

  destroy: function(req, res) {
    sails.models.snapshotschedule.destroy({id: req.params.id}).meta({fetch: true}).exec(function(err, records) {
      if (err) return res.negotiate(err);
      if (!records || records.length === 0) return res.notFound();
      return res.ok(records[0]);
    });
  },

  create : function (req,res) {


        // Validate cron
        if(!cron.validate(req.body.cron)) {
            return res.badRequest({
                message : "Cron parameters are not valid",
                fields : ["cron"]
            });
        }

        // Check if another schedule using the defined
        // connection already exists.
        sails.models.snapshotschedule.find({
            connection : req.body.connection
        }).exec(function(err,results){
            if(err) {
                return res.negotiate(err);
            }

            if(results && results.length > 0) {
                return res.badRequest({
                    message : "A schedule for the defined connection already exists",
                    fields : ["connection"]
                });
            }


            sails.models.snapshotschedule.create(req.body)
                .meta({fetch: true})
                .exec(function (err,created) {
                    if(err) {
                        return res.negotiate(err);
                    }


                    if(created.active) { // Start cron job immediately

                    }

                    return res.json(created);
                });
        });





    }
});
