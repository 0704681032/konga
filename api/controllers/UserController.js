'use strict';

var _ = require('lodash');

/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {

    find: function(req, res) {
        var params = req.query || {};

        // Build query
        var query = sails.models.user.find();

        // Apply where clause if provided
        if (params.where) {
            try {
                var where = typeof params.where === 'string' ? JSON.parse(params.where) : params.where;
                query.where(where);
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Apply limit
        if (params.limit) {
            query.limit(parseInt(params.limit, 10));
        }

        // Apply skip
        if (params.skip) {
            query.skip(parseInt(params.skip, 10));
        }

        // Apply sort - use id DESC as default since createdAt may not exist
        if (params.sort) {
            // If sorting by createdAt, use id instead since createdAt may not exist in existing data
            var sort = params.sort;
            if (sort.includes('createdAt')) {
                sort = sort.replace('createdAt', 'id');
            }
            query.sort(sort);
        } else {
            query.sort('id DESC');
        }

        query.exec(function(err, records) {
            if (err) return res.negotiate(err);
            return res.ok(records);
        });
    },

    count: function(req, res) {
        sails.models.user.count({}).exec(function(err, count) {
            if (err) return res.negotiate(err);
            return res.ok({count: count});
        });
    },

    findOne: function(req, res) {
        var id = req.params.id;
        sails.models.user.findOne({id: id}).exec(function(err, record) {
            if (err) return res.negotiate(err);
            if (!record) {
                return res.status(404).send('No record found with the specified `id`.');
            }
            return res.ok(record);
        });
    },

    create: function(req, res) {
        var userData = _.cloneDeep(req.body);
        var passportsData = userData.passports;
        delete userData.passports;
        delete userData.password_confirmation;

        sails.models.user.create(userData).meta({fetch: true}).exec(function(err, record) {
            if (err) return res.negotiate(err);

            // Create passport if password provided
            if (passportsData && passportsData.password) {
                sails.models.passport.create({
                    protocol: passportsData.protocol || 'local',
                    password: passportsData.password,
                    user: record.id
                }).exec(function(err2, passport) {
                    if (err2) {
                        // Rollback user creation
                        sails.models.user.destroy({id: record.id}).exec();
                        return res.negotiate(err2);
                    }
                    return res.created(record);
                });
            } else {
                return res.created(record);
            }
        });
    },

    destroy: function(req, res) {
        var id = req.params.id;
        sails.models.user.destroy({id: id}).meta({fetch: true}).exec(function(err, records) {
            if (err) return res.negotiate(err);
            if (!records || records.length === 0) {
                return res.status(404).send('No record found with the specified `id`.');
            }
            return res.ok(records[0]);
        });
    },

    subscribe: function(req, res) {

        if (!req.isSocket) {
            sails.log.error("UserController:subscribe failed")
            return res.badRequest('Only a client socket can subscribe.');
        }

        var roomName = 'user.' + req.params.id + '.updated';
        sails.sockets.join(req, roomName);
        res.json({
            room: roomName
        });
    },

    update : function(req,res) {

        sails.log(req.body)

        var user = req.body;
        var passports = req.body.passports

        // Delete unwanted properties
        delete user.passports
        delete user.password_confirmation

        // Handle node association - frontend may send full node object
        if (user.node && typeof user.node === 'object') {
            user.node = user.node.id;
        }


        sails.models.user
            .update({id : req.params.id},user)
            .meta({fetch: true})
            .exec(function(err,updated){
                if(err) return res.negotiate(err);

                var user = updated[0];

                if(!user) {
                  return  res.json()
                }

                if(user.node) {
                    sails.models.kongnode
                        .findOne({id : user.node})
                        .exec(function(err,node){
                            if(err) return res.negotiate(err)
                            user.node = node;
                            if(sails.sockets) {
                                sails.sockets.blast('user.' + user.id + '.updated', user);
                            }
                        })
                }else{
                    if(sails.sockets) {
                        sails.sockets.blast('user.' + user.id + '.updated', user);
                    }
                }


                if(!passports) return res.json(user)

                sails.models.passport
                    .update({user:req.params.id},{password:passports.password})
                    .exec(function(err,updatedPassport){
                        if(err) return res.negotiate(err);
                        return  res.json(user)
                    })



        })
    }
});
