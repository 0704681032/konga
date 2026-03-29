'use strict';

var _ = require('lodash');

/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {

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
        sails.models.user.create(req.body).meta({fetch: true}).exec(function(err, record) {
            if (err) return res.negotiate(err);
            return res.created(record);
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
