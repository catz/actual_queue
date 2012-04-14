var settings = require('./config/settings'),
  events = require('events'),
  util = require('util'),
  url = require('url'),
  http = require('http');

function UrlSender(options) {

}

util.inherits(UrlSender, events.EventEmitter)

UrlSender.prototype.send = function(event_id, event_data) {
  try {
  var self = this;
  var url_parts = url.parse(event_data.url, true);
  var uid = event_data.uid; 
  var request = http.request(url_parts, function(response) {
    if (response.statusCode == 200) {
      self.emit("event-sent", event_id, uid); 
    } else {
      self.emit("event-sent-error", event_id);
    };
  });
  request.on('error', function(err) {
    console.log(err);
    self.emit("event-sent-error", event_id);
  })
  request.end();
  } catch (e) {
    console.log(err);
    self.emit("event-sent-error", event_id);
  }
}

module.exports = UrlSender;