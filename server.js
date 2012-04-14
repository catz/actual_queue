var express = require('express');
var app = express.createServer();

app.configure(function(){
  app.use(express.bodyParser());
});

var event_tracker = require('./workers/event_tracker');

app.get('/send_delayed', event_tracker);
app.post('/send_delayed', event_tracker);

app.get('/health', function(req, res) {
  console.log('health received');
  res.send("ok");
})

module.exports =  app;