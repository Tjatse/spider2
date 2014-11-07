var async = require('async'),
  cheerio = require('cheerio'),
  helper = require('../util/helper'),
  Crawler = require('../util/crawler'),
  read = require('read-art'),
  _ = require('lodash');

var options = JSON.parse(process.argv.slice(2));

run();

function run(){
  var crawler = Crawler(options);

  var queue = async.queue(function (job, fn) {
    crawler.crawl(job, processData.bind(null, job._type, fn));
  }, options.concurrency);

  /**
   * Listen on message.
   */
  process.on('message', function(msg){
    // zip array to an object
    var req = _.zipObject(['code', 'data', 'type'], msg);
    if(req.code == 'kill'){
      // try to quit peaceful.
      crawler.destroy();
      queue.kill();
      process.exit(0);
    }else if(req.code == 'data'){
      // wrap data, and begin working.
      queue.push(_.map(req.data, function(url){
        if(_.isString(url)){
          url = {uri: url};
        }
        return _.assign(url, {_type: req.type});
      }));
    }
  });
}

/**
 * Process data.
 * @param {String} type `links` or `article`
 * @param {Function} callback of queue
 * @param {Error} err
 * @param {Object} data
 * @param {String} body
 */
function processData(type, callback, err, data, body){
  // make sure process is connected.
  if(!process.connected) {
    return callback();
  }
  // bind type.
  _.assign(data, {_type: type});

  var result;
  if(err){
    // handle error.
    result = err.message;
  }else if (type == helper.SPIDER_TYPE.LINK) {
    // crawl links from site.
    result = crawlLinks(data, body);
  }else if(type == helper.SPIDER_TYPE.ARTICLE){
    // read article by url.
    return read(body, function(data, callback, err, art){
      if(err){
        process.send(['fin', data, {error: err.message}]);
      }else{
        process.send(['fin', data, {title: art.title, content: art.content}]);
      }
      art = null;
      return callback();
    }.bind(null, data, callback));
  }else{
    result = 'only `links` and `articles` can be crawled.';
  }
  // send finish signal.
  process.send(['fin', data, _.isString(result) ? {error: result} : result]);
  callback();
}

/**
 * Crawl links from a site.
 * @param {Object} data request data
 * @param {Object} body html body
 * @returns {*}
 */
function crawlLinks(data, body){
  // body must be a HTML string.
  if (body.search(/^\s*</) < 0) {
    return 'Body is not a type of HTML, can not be loaded by cheerio.';
  }
  // try to load by cheerio.
  try {
    var $ = cheerio.load(body, {
      ignoreWhitespace: false,
      xmlMode: false,
      lowerCaseTags: true,
      decodeEntities: false
    });

    // analyze links.
    var result = helper.analyzeLinks({
      ele: $,
      url: data.uri,
      domain: !!options.domain
    });
    return result;
  } catch (err) {
    return err.message;
  }
}

