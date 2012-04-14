var settings = require('../config/settings'),
  events = require('events'),
  util = require('util'),
  logger = require('../logger');

function Worker(sender, options) {
  var self = this;
  self.client = settings.redis;
  self.sender = sender;
  self.pack = options.pack;
  self.queue_key = settings.REDIS_PREFIX + "-queue";
  self.queue_key_in_process = self.queue_key + '-in_process';
  events.EventEmitter.call(self);

  self.on('event-data', function(event_id, event_data) {
    logger.debug('event-processed');
    self.sender.send(event_id, event_data);
  })

  self.sender.on('event-sent', function(event_id, uid) {
    logger.info("drop event: " + event_id + "  uid: " + uid);
    var multi = self.client.multi();
    multi.del(event_id);
    if (uid) 
      multi.set(settings.REDIS_PREFIX + "-uid-" + uid, Date.now());
    multi.hincrby(settings.REDIS_PREFIX + "-stats", "events_processed", 1);
    multi.exec(function(err, reply) {

    });
  })

  self.sender.on('event-sent-error', function(event_id) {
    self.client.hincrby(settings.REDIS_PREFIX + "-stats", "events_sent_error", 1);
    logger.info("event postponed: " + event_id);
  })
}

util.inherits(Worker, events.EventEmitter)

Worker.prototype.setSender = function(sender) {
  this.sender = sender;
}

// restore events queue after server crashes
Worker.prototype.restore = function(fn) {
  var self = this;
  this.client.keys(settings.REDIS_PREFIX + '-event-*', function(err, reply) {
    if (!err && reply !== undefined && reply.length > 0) {  
      var restored_ids = reply;
      logger.info("events to restore: " + restored_ids.length);
      restored_ids.forEach(function(event_id, idx){
        // check event in events queue
        self.client.zrank(self.queue_key, event_id, function(err, reply) {
          if(!reply) {
            // get event firing time
            self.client.hmget(event_id, 'time', function(error, reply) {
              if(reply && !isNaN(reply)) {
                self.client.zadd(self.queue_key, reply, event_id);
              }
            });
          }
        });
      });
    }
  });
}

// fill processing queue
Worker.prototype.fetch = function(fn) {
  var self = this;
  this.client.zrevrangebyscore(this.queue_key, Date.now(),
    "-inf", "limit", 0, self.pack, function(err, reply) {
    process.nextTick(function() {
      self.fetch();
    }); // re-schedule fetch  
    if (!err && reply !== undefined && reply.length > 0) {   
      var processed_ids = reply;
      processed_ids.forEach(function(event_id, idx){
        var multi = self.client.multi();
        multi.lpush(self.queue_key_in_process, event_id);
        multi.zrem(self.queue_key, event_id);
        multi.exec(function(err, reply) {
          logger.debug('event-fetched');
        });
      });
    }
  });
}

Worker.prototype.process = function() {
  var self = this;
  this.client.blpop(this.queue_key_in_process, 1, function(err, reply) {
    process.nextTick(function() {
      self.process();
    }); // re-schedule task

    if (reply) {
      var list = reply[0];
      var event_id = reply[1];
      self.client.hmget(event_id, 'data', function(error, reply) {
        if(reply) {          
          var data = JSON.parse(reply);
          var uid = data.uid;
          if(uid) {
            self.client.get(settings.REDIS_PREFIX + "-uid-" + uid, function(err, last_poll) {
              if(!reply || (Date.now() - last_poll) > settings.USER_POLL_THRESHOLD) {
                self.emit('event-data', event_id, data);      
              } else {
                logger.debug("skipping user: " + uid);
              }
            })  
          } else {
            self.emit('event-data', event_id, data);  
          }
        }
      })      
    }
  });
}

module.exports = Worker;
    