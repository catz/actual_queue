var express = require('express'),
    routes = require('./routes'),
    json = require('./routes/json');

var app = express.createServer();
var appUI = express.createServer();

app.configure(function(){
  app.use(express.bodyParser());
});

appUI.configure(function(){
  appUI.set('view options', { doctype: 'html' });
  appUI.set('views', __dirname + '/views');
  appUI.set('view engine', 'jade');
  appUI.set('title', 'Actual queue');
  appUI.use(express.bodyParser());
  appUI.use(express.methodOverride());
  appUI.use(require('stylus').middleware({ src: __dirname + '/public' }));
  appUI.use(appUI.router);
  appUI.use(express.static(__dirname + '/public'));
});

var event_tracker = require('./workers/event_tracker');

app.get('/send_delayed', event_tracker);
app.post('/send_delayed', event_tracker);

app.get('/health', function(req, res) {
  // console.log('health received');
  res.send("ok");
})

// json api
appUI.get('/stats/common',json.common);
appUI.get('/stats/types/:key',json.types);

//routes
appUI.get('/', routes.index);

module.exports =  app;
module.exports.ui = appUI;