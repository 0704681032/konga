'use strict';

var _ = require('lodash');
var Kong = require("../services/KongService");

module.exports = _.merge(_.cloneDeep(require('../base/Controller')), {

    count: function(req, res) {
        sails.models.kongnode.count({}).exec(function(err, count) {
            if (err) return res.negotiate(err);
            return res.ok({count: count});
        });
    },

    findOne: function(req, res) {
        var id = req.params.id;
        sails.models.kongnode.findOne({id: id}).exec(function(err, record) {
            if (err) return res.negotiate(err);
            if (!record) {
                return res.status(404).send('No record found with the specified `id`.');
            }
            return res.ok(record);
        });
    },

    destroy: function(req, res) {
        var id = req.params.id;
        sails.models.kongnode.destroy({id: id}).meta({fetch: true}).exec(function(err, records) {
            if (err) return res.negotiate(err);
            if (!records || records.length === 0) {
                return res.status(404).send('No record found with the specified `id`.');
            }
            return res.ok(records[0]);
        });
    },

    subscribeHealthChecks: function(req, res) {

        if (!req.isSocket) {
            sails.log.error("KongNodeController:subscribe failed")
            return res.badRequest('Only a client socket can subscribe.');
        }

        var roomName = 'node.health_checks';
        sails.sockets.join(req, roomName);
        res.json({
            room: roomName
        });
    },

    update : function(req,res){
        sails.models.kongnode.findOne({id:req.params.id}).exec(function afterwards(err, node){

            if (err) return res.negotiate(err);
            sails.models.kongnode.update({id:req.params.id},req.body).meta({fetch: true}).exec(function afterwards(err, resp){

                if (err) return res.negotiate(err);
                if(req.body.active && node.active != req.body.active) {
                    sails.models.kongnode.update({
                        where: { id:{ '!': req.params.id } },

                    },{active:false}).meta({fetch: true}).exec(function afterwards(err, upd){
                        if (err) return res.negotiate(err);
                        return  res.json(resp[0])
                    })
                }else{
                    return  res.json(resp[0])
                }
            });
        });

    },


    create : function(req,res) {
        sails.models.kongnode.create(req.body)
            .meta({fetch: true})
            .exec(function(err, node){
                if(err) {
                    return res.negotiate(err);
                }

                if(process.env.NODE_ENV == 'test') {
                    return res.created(node);
                }

                Kong.nodeInfo(node, function(err,info){

                    if(err) {
                        sails.log.error("KongNodeController:create","Failed to get node info",err)
                    }

                    if(info) {
                        sails.models.kongnode.update(node.id,{
                            kong_version : info.version
                        }).exec(function (err, _node) {
                            if(err) {
                                return res.negotiate(err);
                            }

                            return res.created(_node);
                        })
                    }else{
                        return res.created(node);
                    }
                })
            })
    }
});
