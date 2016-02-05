'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');
var hpss = require('hpss');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models/db');
var progress = require('../progress');

router.get('/recent', jwt({secret: config.sca.auth_pubkey}), function(req, res, next) {
    db.Task.find({
        user_id: req.user.sub,
        create_date: { "$gte": new Date(2016,0,1)},  //TODO - make this not hardcoded..
    }, function(err, tasks) {
        if(err) return next(err);
        res.json(tasks);
    });
});

router.get('/:id', jwt({secret: config.sca.auth_pubkey}), function(req, res, next) {
    db.Task.findById(req.params.id, function(err, task) {
        if(err) return next(err);
        if(!task) return res.status(404).end();
        if(task.user_id != req.user.sub) return res.status(401).end();
        res.json(task);
    });
});

//make sure all resources exists, and are owned by the user.sub
function check_resource_access(user, ids, cb) {
    async.forEachOf(ids, function(id, key, next) {
        var id = ids[key];
        db.Resource.findById(id, function(err, resource) {
            if(err) return next(err);
            if(!resource) return next("couldn't find hpss resources specified");
            if(resource.user_id != user.sub) return next("404");
            next(null);
        });
    }, cb);
}

//submit task!
router.post('/', jwt({secret: config.sca.auth_pubkey}), function(req, res, next) {
    var workflow_id = req.body.workflow_id;
    var name = req.body.name;

    check_resource_access(req.user, req.body.resources, function(err) {
        if(err) next(err);
        //make sure user owns the workflow that this task has requested under
        db.Workflow.findById(workflow_id, function(err, workflow) {
            if(workflow.user_id != req.user.sub) return res.status(401).end();
            var step = workflow.steps[req.body.step_idx];
            var task = new db.Task(req.body); //for workflow_id, service_id, name, resources, and config
            
            //need to set a few more things
            task.user_id = req.user.sub;
            task.progress_key = "_sca."+workflow._id+"."+task._id;//uuid.v4();
            task.status = "requested";
            task.step_idx = req.body.step_idx;

            //now register!
            task.save(function(err, _task) {
                //also add reference to the workflow
                step.tasks.push(_task._id);
                workflow.save(function(err) {
                    if(err) return next(err);
                    res.json({message: "Task successfully requested", task: _task});
                });
            });
           
            //also send first progress update
            progress.update(task.progress_key, {name: task.name, status: 'waiting', progress: 0, msg: 'Task Requested'});
        });
    });
});

router.put('/rerun/:task_id', jwt({secret: config.sca.auth_pubkey}), function(req, res, next) {
    var task_id = req.params.task_id;
    db.Task.findById(task_id, function(err, task) {
        if(err) return next(err);
        if(!task) return res.status(404).end();
        if(task.user_id != req.user.sub) return res.status(401).end();
        
        task.status = "requested";
        task.products = [];
        task.save(function(err) {
            if(err) return next(err);
            progress.update(task.progress_key, {status: 'waiting', progress: 0, msg: 'Task Re-requested'}, function() {
                res.json({message: "Task successfully re-requested", task: task});
            });
        });
    });
});

module.exports = router;

