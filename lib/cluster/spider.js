var async = require('async'),
  Crawler = require('../crawler'),
  _ = require('lodash');

run();

function run(){
  var options = JSON.parse(process.argv.slice(2));

  var crawler = Crawler(options);

  var queue = async.queue(function (job, fn) {
    crawler.crawl(job.data, function(args, callback, err, data, body){
      if(process.connected) {
        process.send(['fin', err ? err.stack : null, _.assign(data, {_args: args}), body]);
      }
      callback();
    }.bind(null, job.args, fn));
  }, options.concurrency);

  function destroy(){
    crawler.destroy();
    queue.kill();
    process.exit(0);
  };

  queue.drain = function(){
    process.send(['drain']);
    destroy();
  };

  process.on('message', function(msg){
    var req = _.zipObject(['code', 'data', 'args'], msg);
    if(req.code == 'kill'){
      destroy();
    }else if(req.code == 'data'){
      queue.push(_.map(req.data, function(url){
        if(_.isString(url)){
          url = {uri: url};
        }
        return {data: url, args: req.args};
      }));
    }
  });
}

