var settings = require('./config/settings');
var testKey = settings.REDIS_PREFIX + "-test-list";

var Log = require('log'),
    fs = require('fs'),
    stream = fs.createWriteStream(__dirname + '/log/logger.log', { flags: 'a' }); 

var Logger = function() {
  var _isProd = false,
      _isDev = false,
      _isTest = false;

  switch (process.env.APP_ENV) {
    case  'production':
      _isProd = true;
      break;
    case  'development':
      _isDev = true;
      break;
    case  'test':
      _isTest = true;
      break;
    default:
      _isDev = true;
      break;  
  }

  this.isProd = function() { return _isProd }
  this.isDev = function() { return _isDev }
  this.isTest = function() { return _isTest }  
}

Logger.prototype = new Log('debug', stream)

Logger.prototype.debug = function(msg) {
  //do not print debug logs in production
  if (!this.isProd())
    Log.prototype.debug.call(this, msg); 
}

Logger.prototype.spec = function(msg) {
  if (this.isTest()) {
    settings.redis.lpush(testKey, msg);
  }  
}

module.exports = new Logger();