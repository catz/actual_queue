var settings = require('./config/settings'),
  events = require('events'),
  util = require('util'),
  url = require('url'),
  http = require('http'),
  logger = require('./logger');

function UrlSender(options) {

}

util.inherits(UrlSender, events.EventEmitter)

UrlSender.prototype.send_remote = function(url_parts, event_id, uid, type) {
  try {
    var self = this;

    var request = http.request(url_parts, function(response) {
      if (response.statusCode == 200) {
        self.emit("event-sent", event_id, uid, type); 
      } else {
        self.emit("event-sent-error", event_id);
      };
    });
    request.on('error', function(err) {
      logger.error(err);
      self.emit("event-sent-error", event_id);
    })
    request.end();
  } catch (e) {
    logger.error(e);
    self.emit("event-sent-error", event_id);
  }  
}

UrlSender.prototype.send = function(event_id, event_data) {
  try {
    var self = this;
    var url_parts = url.parse(event_data.url, true);
    var uid = event_data.uid;
    var type = event_data.type;

    if(event_data.recheck_url) {
      var recheck_url_parts = url.parse(event_data.recheck_url, true);
      logger.debug('recheck_url found: ' + event_data.recheck_url);

      var recheck_request = http.request(recheck_url_parts, function(response) {        
        if (response.statusCode != 200) {          
          logger.error('recheck url '+ event_data.recheck_url + 'returns code ' + response.statusCode);          
        };

        response.on('data', function (chunk) {
          if(chunk && (chunk.toString().toLowerCase() == 'ok')) {
            self.send_remote(url_parts, event_id, uid, type);
            self.emit("event-recheck-sent", event_id, uid);             
          } else {
            self.emit("event-recheck-sent-error", event_id);
          }
        });
      });

      recheck_request.on('error', function(err) {
        logger.error(err);
        self.emit("event-recheck-sent-error", event_id);
      })
      recheck_request.end();
    } else {
      self.send_remote(url_parts, event_id, uid, type);
    }

  } catch (e) {
    logger.error(e);
    self.emit("event-sent-error", event_id);
  }
}

module.exports = UrlSender;