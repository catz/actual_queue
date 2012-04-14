var redis = require('redis');
exports.redis = redis.createClient(6379, '127.0.0.1');
exports.REDIS_PREFIX = "actual_queue";
exports.EVENT_QUEUE_TTL = 60 * 60; // 1 hour
exports.USER_POLL_THRESHOLD = 60 * 60; // 30 min;
exports.PS_TITLE = "actual_queue";
exports.PORT = 8000;