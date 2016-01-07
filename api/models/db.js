
//contrib
var mongoose = require('mongoose');
var winston = require('winston');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);

exports.init = function(cb) {
    mongoose.connect(config.mongodb, {}, function(err) {
        if(err) return cb(err);
        console.log("connected to mongo");
        cb();
    });
}
exports.disconnect = function(cb) {
    mongoose.disconnect(cb);
}

///////////////////////////////////////////////////////////////////////////////////////////////////

var workflowSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    user_id: {type: String, index: true}, 
    //
    //////////////////////////////////////////////////////////////////////////////////////////////

    name: String, 
    desc: String, 

    steps: [ mongoose.Schema({
        service_id: String,
        name: String,  //not sure if I will ever use this
        config: mongoose.Schema.Types.Mixed,

        tasks: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Task'}],
        //products: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Product'}],

        //not sure how useful / accurate these will be..
        create_date: {type: Date, default: Date.now },
        update_date: {type: Date, default: Date.now },
    }) ] ,

    create_date: {type: Date, default: Date.now },
    update_date: {type: Date, default: Date.now },
});
workflowSchema.pre('save', function(next) {
    this.update_date = new Date();
    next();
});
exports.Workflow = mongoose.model('Workflow', workflowSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var resourceSchema = mongoose.Schema({
    ////////////////////////////////////////////////
    //key
    user_id: {type: String, index: true}, 
    type: String, //like hpss, pbs, 
    resource_id: String, //like sda, bigred2
    //
    ////////////////////////////////////////////////

    name: String, 
    config: mongoose.Schema.Types.Mixed,

    create_date: {type: Date, default: Date.now },
    update_date: {type: Date, default: Date.now },
});
resourceSchema.pre('save', function(next) {
    this.update_date = new Date();
    next();
});
exports.Resource = mongoose.model('Resource', resourceSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var taskSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //important fields
    workflow_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Workflow'},
    step_id: Number, //index of step within workflow
    //task_id: Number, //index of task within step
    user_id: String, //sub of user submitted this request
    //
    //////////////////////////////////////////////////////////////////////////////////////////////

    name: String,
    service_id: String,
    progress_key: {type: String, index: true}, 
    status: String, 

    //resources used by this task
    resources: mongoose.Schema.Types.Mixed, 
    
    //object containing details for this request
    config: mongoose.Schema.Types.Mixed, 

    //fs: String, //.. like "uits_dc2"
    //workdir: String, //.. like "/N/dc2/scratch/__username__/sca/workflows/__workflowid__/"
    //taskdir: String, //.. like "hpss.123351723984123424"
    products: [ mongoose.Schema.Types.Mixed ],

    create_date: {type: Date, default: Date.now },
    update_date: {type: Date, default: Date.now },
});
taskSchema.pre('save', function(next) {
    this.update_date = new Date();
    next();
});
exports.Task = mongoose.model('Task', taskSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

/*
//DEPRECATED
var productSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //important fields
    workflow_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Workflow'},
    user_id: String, //sub of user submitted this request
    //
    //////////////////////////////////////////////////////////////////////////////////////////////

    //task that created this product (maybe not set if it wasn't generated by a task)
    task_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Task'},
    service_id: String, //service that produced this product

    name: String, //what for?

    //resources used to produce this product
    resources: mongoose.Schema.Types.Mixed, 

    //fs: String, //filesystem ..TODO
    path: String, //path where this product is stored .. like "/N/dc2/scratch/__username__/sca/workflows/__workflowid__/"
    
    //object containing details for this product
    detail: mongoose.Schema.Types.Mixed, 

    create_date: {type: Date, default: Date.now },
    update_date: {type: Date, default: Date.now }, //I am not sure if product ever get updated?
});
productSchema.pre('save', function(next) {
    this.update_date = new Date();
    next();
});
exports.Product = mongoose.model('Product', productSchema);
*/
