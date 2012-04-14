var settings = require('../config/settings'),
    crypto = require('crypto');

module.exports = function(req, res) {
  function random() {
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    return crypto.createHash('sha1').update(current_date + random).digest('hex');
  }

  function parse_params(hash) {
    function isEmpty(obj) {
      for(var prop in obj) {
          if(obj.hasOwnProperty(prop))
              return false;
      }
      return true;
    }

    return isEmpty(req.query)?req.body:req.query;
  }

  function track_event(event_id, event_data) {
    var unique_key = settings.REDIS_PREFIX + "-event-" + event_id;

    var delay = event_data.delay?parseInt(event_data.delay):0;
    var delayedTime = Date.now() + delay;
    var multi = settings.redis.multi();
    var type = event_data.type || 'none';
    delete event_data['delay'];

    if (type) {
      var keyDaily = settings.REDIS_PREFIX + "-types-daily:" + getDayMill();
      var keyHourly = settings.REDIS_PREFIX + "-types-hourly:" + getHourMill();
      multi.hincrby(keyDaily, type, 1);
      multi.hincrby(keyHourly, type, 1);

      multi.zadd(settings.REDIS_PREFIX + "-types-daily", getDayMill(), keyDaily);
      multi.zadd(settings.REDIS_PREFIX + "-types-hourly", getHourMill(), keyHourly);
    }

    multi.hincrby(settings.REDIS_PREFIX + "-stats", "events_received", 1);
    multi.hmset  (unique_key, 'data', JSON.stringify(event_data));
    multi.hmset  (unique_key, 'time', delayedTime);
    multi.zadd(settings.REDIS_PREFIX + "-queue", delayedTime, unique_key);
    multi.expire (unique_key, delay + settings.EVENT_QUEUE_TTL);
    multi.exec(function(err, reply) {
      // LOG
    });
  }
  
  track_event(random(), parse_params(req));
  res.send("ok");
};

function getHourMill(date) {
  var now = date || new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return a.getTime();
}
function getDayMill(date) {
  var now = date || new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return a.getTime(); 
}