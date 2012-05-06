var settings = require('../config/settings'),
    common_tracker = require('./common_tracker'),
    logger = require('../logger');

function track_event(params) {
  // get online-queue for given user
  var uid   = params.uid;
  var now   = Date.now();

  settings.redis.zrevrangebyscore(settings.REDIS_PREFIX + "-online-queue:" + uid, now,
  "-inf", "limit", 0, 1, function(err, reply) {
    if (!err && reply !== undefined && reply.length > 0) {   
      var event_id = reply[0];
      //check time hash to prevent putting event to queue more than every 10 sec
      settings.redis.hget(settings.REDIS_PREFIX + "-online-last_sent_time", uid, function(err, reply) {
        if (!err) {
          //last time not exist or less 
          if ((!reply || reply =="") || (now >= (settings.USET_POLL_THRESHOLD_ONLINE + reply*1))) {
            var multi = settings.redis.multi();
            //only one event at the action
            multi.lpush(settings.REDIS_PREFIX + "-queue-in_process", event_id);
            multi.zrem(settings.REDIS_PREFIX + "-online-queue:" + uid, event_id);
            multi.hset(settings.REDIS_PREFIX + "-online-last_sent_time", uid, now);
            multi.exec(function(err, reply) {
              logger.debug('online-event-to-process-queue');
              logger.spec('online-event-to-process-queue'); //only test env
            });
          } else {
            logger.debug('online-event-posponed');
          }
        }
      });
    }
  });
}

module.exports = function(req, res) {
  track_event(common_tracker.parse_params(req));
  res.send("ok");
};