var settings = require('./../config/settings');
var cachedStats = {}; // {daily\hourly_timestamp: {type: count}}

exports.common = function(req, res){
  var obj = {};

  settings.redis.hmget(settings.REDIS_PREFIX + "-stats", "events_received",
     "events_processed", "events_sent_error", function(err, reply) {
        obj.received = reply[0] || 0;
        obj.sent = reply[1] || 0;
        obj.errors = reply[2] || 0;
        res.send(obj);
  });      
};

exports.types = function(req, res){
  var obj = {};
  var now = new Date();
  var arrDate = [];
  var dates = []; 

  var rkey = req.params.key;
  var keyPrefix = settings.REDIS_PREFIX + '-types-' + rkey;

  //create arrDate - array of dates(redis keys) we need
  if (rkey == 'daily') {
    for (var i=0; i < 7; i++) {
      var adjDate = new Date();
      adjDate.setDate(adjDate.getDate()-i);
      arrDate.push(getDayMill(adjDate));
    }
  } else {
    for (var i=0; i < 24; i++) {
      var adjDate = new Date();
      adjDate.setHours(adjDate.getHours()-i);
      arrDate.push(getHourMill(adjDate));
    }
  }

  //last hour or day we should always get 
  var multi = settings.redis.multi();
  multi.hgetall(keyPrefix + ':' + arrDate[0]);
  dates.push(arrDate[0]);

  for (var i=1; i < arrDate.length; i++) {
    if (!cachedStats[rkey + '_' + arrDate[i]]) {
      multi.hgetall(keyPrefix + ':' + arrDate[i]);
      dates.push(arrDate[i]);
    } else {
      for (var type in cachedStats[rkey + '_' + arrDate[i]]) {
        obj[type] = obj[type] || {};
        obj[type][arrDate[i]] = cachedStats[rkey + '_' + arrDate[i]][type];
      }  
    }
  }

  multi.exec(function(err, reply) {
    for (var i = 0; i < reply.length; i++) {
      if (reply[i]) {
        for(var type in reply[i]) {
          obj[type] = obj[type] || {};
          obj[type][dates[i]] = reply[i][type];

          cachedStats[rkey + '_' + dates[i]] = cachedStats[rkey + '_' + dates[i]] || {};
          cachedStats[rkey + '_' + dates[i]][type] = reply[i][type];
        }
      }  
    }  

    res.send(obj);
  });

  // version with sorted set which contains keys
  // settings.redis.zrevrangebyscore(settings.REDIS_PREFIX + '-types-' + rkey, now.getTime(), adjDate.getTime(),
  //   function(err,reply) {
  // );
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