var settings = require('./../config/settings'),
    common = require('../common');
var cachedStats = {}; // {daily\hourly_timestamp: {type: {received: count, sent: count}}}

exports.common = function(req, res){
  var obj = {};

  settings.redis.hmget(settings.REDIS_PREFIX + "-stats", "events_received", "online_events_received",
     "events_processed", "events_sent_error", "event-recheck-sent", "event-recheck-sent-error", function(err, reply) {
        obj.received = reply[0] || 0;
        obj.online_received = reply[1] || 0;
        obj.sent = reply[2] || 0;
        obj.errors = reply[3] || 0;
        obj.recheck_sent = reply[4] || 0;
        obj.recheck_errors = reply[5] || 0;
        res.send(obj);
  });      
};

exports.types = function(req, res){
  var obj = {};
  var now = new Date();
  var arrDate = [];
  var dates = []; 

  var rkey = req.params.key; //daily or hourly
  var keyPrefix = settings.REDIS_PREFIX + '-types-' + rkey;

  //create arrDate - array of dates(redis keys) we need
  if (rkey == 'daily') {
    for (var i=0; i < 7; i++) {
      var adjDate = new Date();
      adjDate.setDate(adjDate.getDate()-i);
      arrDate.push(common.getDayMill(adjDate));
    }
  } else {
    for (var i=0; i < 24; i++) {
      var adjDate = new Date();
      adjDate.setHours(adjDate.getHours()-i);
      arrDate.push(common.getHourMill(adjDate));
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
        obj[type][arrDate[i]] = obj[type][arrDate[i]] || {};
        for(var process in cachedStats[rkey + '_' + arrDate[i]][type]) {
          obj[type][arrDate[i]][process] = cachedStats[rkey + '_' + arrDate[i]][type][process];
        }
      }  
    }
  }

  multi.exec(function(err, reply) {
    for (var i = 0; i < reply.length; i++) {
      if (reply[i]) {
        for(var type in reply[i]) {
          //type = process:type 
          var proc_type = type.split(':'); 

          obj[proc_type[1]] = obj[proc_type[1]] || {};
          obj[proc_type[1]][dates[i]] = obj[proc_type[1]][dates[i]] || {};
          obj[proc_type[1]][dates[i]][proc_type[0]] = reply[i][type];

          cachedStats[rkey + '_' + dates[i]] = cachedStats[rkey + '_' + dates[i]] || {};
          cachedStats[rkey + '_' + dates[i]][proc_type[1]] = cachedStats[rkey + '_' + dates[i]][proc_type[1]] || {};
          cachedStats[rkey + '_' + dates[i]][proc_type[1]][proc_type[0]] = reply[i][type];
        }
      }  
    }  
    
    res.send(obj);
  });
};
