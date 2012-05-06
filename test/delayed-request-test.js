/*
 * INSTRUCTIONS
 *
 * export APP_ENV=test
 *
 * run npm start
 *
 * run vows --spec test/cluster-delayed-test.js
 *
 */

var settings = require("./../config/settings.test");

var request = require('request'),
    vows = require('vows'),
    assert = require('assert'),
    apiUrl = "http://localhost:"+settings.PORT,
    testKey = settings.REDIS_PREFIX + "-test-list",
    healthApi = apiUrl +'/health',
    jsonApiUrl = "http://localhost:"+settings.PORT_UI,
    redis_sskey = settings.REDIS_PREFIX + "-types-hourly",
    redis_sskey2 = settings.REDIS_PREFIX + "-types-daily",
    test_uid = "test_spec_user_666",
    cookie = null;

var apiTest = {
  general: function( method, url, data, cb ){
    request(
      {
        method: method,
        url: url, //apiUrl+(url||''),
        json: data || {},
        headers: {Cookie: cookie}
      },
      function(req, res){
        cb( req, res )
      }
    )
  },
  get: function( url, data, cb  ){ apiTest.general( 'GET', url, data, cb    )  },
  post: function( url, data, cb ){ apiTest.general( 'POST', url, data, cb   )  },
  put: function( url, data, cb  ){ apiTest.general( 'PUT', url, data, cb    )  },
  del: function( url, data, cb  ){ apiTest.general( 'DELETE', url, data, cb )  }
}

process.on('uncaughtException', function(err) {
  console.log('spy an error: ' + err);
});


function getHourMill(date) {
  var now = date || new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return a.getTime();
}


var suite = vows.describe('Actual queue API delayed test')

.addBatch({
  "*Test delayed: sending '/send_delayed'": {
    topic: function(){
      settings.redis.flushdb();
      // settings.redis.del(testKey);
      apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&delay=1', {} ,this.callback )
    },
    'should be 200' : function(res) {
        assert.ok(res.statusCode == 200)
    },
    "server should send delayed request": {
      topic: function() {
        var self = this;
        setTimeout(function() {
          self.callback();
        }, 5000);
      },
      'after waiting' : {
          topic: function() {
            settings.redis.lrange(testKey, 0, 10, this.callback)
          },
          'delayed request should be sent by strict sequence of actions': function(err, reply) {
             assert.ok(reply.join() == 'event-processed,event-fetched,event-received')
          }  
      }
    }
  }  
})

.addBatch({
  "*Test type: sending test_type_spec": {
    topic: function(){
      apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&delay=1&type=test_type_spec', {} ,this.callback )
    },
    'should be 200' : function(res) {
      assert.ok(res.statusCode == 200)
    },
    ".": {
      topic: function(){
        apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&delay=1&type=test_type_spec', {} ,this.callback )
      },
      'should be 200' : function(res) {
        assert.ok(res.statusCode == 200)
      }
    }
  },

  "*Test JSON API: server track type stats": {
    topic: function() {
      var self = this;
      setTimeout(function() {
        self.callback();
      }, 2000);
    },
    'after waiting' : {
      topic: function() {
        apiTest.get(jsonApiUrl+'/stats/types/hourly', {} ,this.callback )
      },
      "count of received types is 2": function(res) {
        // *** TODO after merge add prefix ***
        assert.ok(res.body['test_type_spec'][getHourMill()]['received'] == 2);
      },
      '//clean database': {
        topic: function(data) {
          settings.redis.zrevrangebyscore(settings.REDIS_PREFIX + "-types-hourly", '+inf', '-inf', 'limit', 0, 1, this.callback ); 
        },
        'OK': function(hashkey) {
          settings.redis.del(hashkey);
          settings.redis.zrem(redis_sskey, hashkey);
          settings.redis.zrem(redis_sskey2, hashkey);
        }
      }
    }
  }
})

.addBatch({
  "Test UID delay: sending uid": {
    topic: function(){
      apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&delay=1&uid='+test_uid, {} ,this.callback )
    },
    'should be 200' : function(res) {
      assert.ok(res.statusCode == 200)
    },
    ".": {
      topic: function() {
        var self = this;
        setTimeout(function() {
          self.callback();
        }, 5000);
      },
      ".": {
        topic: function(){
          apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&delay=1&uid='+test_uid, {} ,this.callback )
        },
        'should be 200' : function(res) {
          assert.ok(res.statusCode == 200)
        },
        "Server should NOT send second request": {
          topic: function() {
            var self = this;
            setTimeout(function() {
              self.callback();
            }, 5000);
          },
          'after waiting' : {
              topic: function() {
                settings.redis.lrange(testKey, 0, 100, this.callback)
              },
              'user skipped': function(err, reply) {
                assert.ok(reply.join().indexOf('user-skipped') != -1)
              }  
          }
        }
      }
    }
  }
})  

.addBatch({
  "*Test online : sending delayed with uid": {
    topic: function() {
      var self = this;
      settings.redis.flushdb();
      setTimeout(function() {
        self.callback();
      }, 1000);
    },
    ".": {
      topic: function(){
        apiTest.get(apiUrl + '/send_delayed?url='+ healthApi +'&uid='+ test_uid +'&delay=1&send_than_online=true', {} ,this.callback )
      },
      'should be 200' : function(res) {
        assert.ok(res.statusCode == 200)
      },
      ".": {
        topic: function() {
          var self = this;
          settings.redis.flushdb();
          setTimeout(function() {
            self.callback();
          }, 5000);
        },
        ".": {
          topic: function(){
            apiTest.get(apiUrl + '/user_online?uid='+ test_uid, {} ,this.callback )
          },
          'should be 200' : function(res) {
            assert.ok(res.statusCode == 200)
          },

          "online sent by /user_online": {
            topic: function() {
              var self = this;
              setTimeout(function() {
                self.callback();
              }, 7000);
            },
            'after waiting' : {
              topic: function() {
                settings.redis.lrange(testKey, 0, 10, this.callback)
              },
              'online sent': function(err, reply) {
                assert.ok(reply.join().indexOf('online-event-to-process-queue') != -1)
              }  
            }
          }
        }
      }  
    }
  }
})

.addBatch({
  "*Test JSON API /common (depends on previous test, check online sending)": {
    ".": {
      topic: function() {
        var self = this;
        settings.redis.flushdb();
        setTimeout(function() {
          self.callback();
        }, 2000);
      },
      topic: function(){
        apiTest.get(jsonApiUrl + '/stats/common', {} ,this.callback )
      },
      'stats should be correct' : function(res) {
        settings.redis.flushdb();
        assert.ok(res.body['sent']*1 == 1);
      }
    }  
  }  
})
.export( module );
