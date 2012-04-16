'use strict';

var cluster = require('cluster');
var net = require("net"),
    repl = require("repl");
var http = require('http');
var numCPUs = require('os').cpus().length;
var Worker = require('./workers/core_worker');
var Sender = require('./url_sender');
var settings = require('./config/settings');

var stat = {
  requestReceived: 0,
  requestSent: 0,
  requestSentError: 0,
  replConnections: 0
}

function startMaster() {
  var workers = [];

  var appUI = require('./server').ui;
  appUI.listen(settings.PORT_UI);

  process.nextTick(function() {
    var s = new Sender();
    var w = new Worker(s, {pack: 100});
    w.restore();
    w.fetch();
  });  

  function addWorker() {
    var worker = cluster.fork();
    workers.push(worker);
    console.log('worker ' + worker.pid + ' started');

    worker.on('message', function(msg) {
      if (msg.cmd) {
        switch (msg.cmd) {
          case 'notifyRequestReceived':
            stat.requestReceived++;
            break;
          case 'notifyRequestSent':
            stat.requestSent++;
            break;
          case 'notifyRequestSentError':
            stat.requestSentError++;
            break;  
          default:  
            console.log("Unprocessed notify: " + msg.cmd);
        }
      }
    });
  };


  function addREPL() {    
    net.createServer(function (socket) {
      console.log('repl started on port' + socket.port);
      stat.replConnections += 1;
      var r = repl.start("node via TCP socket> ", socket);
      r.context.stat = stat;
      r.context.workers = workers;
    }).listen(5001);
  }

  // Fork workers.
  while (workers.length < numCPUs) {
    addWorker();
  }
  addREPL();

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died');
    var idx = workers.indexOf(worker);;

    if (idx >= 0) {
      workers.splice(idx, 1);
      setTimeout(addWorker, 1000);
      return;
    }
  });

  // Setting process.title currently only works on Linux, FreeBSD and Windows.
  process.title = settings.PS_TITLE;
  console.log( process.title + " started with pid " + process.pid);

  setInterval(function() {
    settings.redis.hmget(settings.REDIS_PREFIX + "-stats", "events_received",
     "events_processed", "events_sent_error", function(err, reply) {
        stat.requestReceived = reply[0] || 0;
        stat.requestSent = reply[1] || 0;
        stat.requestSentError = reply[2] || 0;

        console.log("requestReceived: " + stat.requestReceived +
          " requestSent: " + stat.requestSent +
          " requestSentError: "+ stat.requestSentError +
          " workers: " + workers.length);
    });
  }, 2000);

  process.on('uncaughtException', function (err) {
    console.log("exception: " + err);
  });  
}  


function startWorker() {
  var app = require('./server');
  
  app.listen(settings.PORT);    

  process.nextTick(function() {
    var s = new Sender();
    var w = new Worker(s, {pack: 100});
    w.process();
  });
  
  process.on('uncaughtException', function (err) {
    console.log("exception: " + err);
  });
}

cluster.isMaster ? startMaster() : startWorker();