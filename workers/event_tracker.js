var settings = require('../config/settings'),
    crypto = require('crypto'),
    common = require('../common'),
    common_tracker = require('./common_tracker'),
    logger = require('../logger');

module.exports = function(req, res) {
  function random() {
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    return crypto.createHash('sha1').update(current_date + random).digest('hex');
  }

  function track_event(event_id, event_data) {
    var unique_key = settings.REDIS_PREFIX + "-event-" + event_id;

    var delay = event_data.delay?parseInt(event_data.delay):0; //sec
    var delayedTime = Date.now() + delay*1000; //millisec
    var multi = settings.redis.multi();
    var type = event_data.type || 'none';
    delete event_data['delay'];

    if (type) {
      var keyDaily = settings.REDIS_PREFIX + "-types-daily:" + common.getDayMill();
      var keyHourly = settings.REDIS_PREFIX + "-types-hourly:" + common.getHourMill();
      multi.hincrby(keyDaily, 'received:'+type, 1); // process:type
      multi.hincrby(keyHourly, 'received:'+type, 1);

      multi.zadd(settings.REDIS_PREFIX + "-types-daily", common.getDayMill(), keyDaily);
      multi.zadd(settings.REDIS_PREFIX + "-types-hourly", common.getHourMill(), keyHourly);
    }
    
    multi.hmset  (unique_key, 'data', JSON.stringify(event_data));
    multi.hmset  (unique_key, 'time', delayedTime);

    if (event_data.send_than_online) {
      var uid = event_data.uid;
      multi.zadd(settings.REDIS_PREFIX + "-online-queue:" + uid, delayedTime, unique_key);
      multi.hincrby(settings.REDIS_PREFIX + "-stats", "online_events_received", 1);
    } else {
      multi.zadd(settings.REDIS_PREFIX + "-queue", delayedTime, unique_key);
      multi.hincrby(settings.REDIS_PREFIX + "-stats", "events_received", 1);
    }
    multi.expire (unique_key, delay + settings.EVENT_QUEUE_TTL);
    multi.exec(function(err, reply) {
      // LOG
      logger.spec('event-received'); //only test env
    });
  }
  
  track_event(random(), common_tracker.parse_params(req));
  res.send("ok");
};
