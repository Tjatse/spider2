var Debug = require('./lib//util/debug'),
  _ = require('lodash'),
  cheerio = require('cheerio'),
  Nest = require('./lib/cluster/nest'),
  helper = require('./lib/util/helper'),
  EventEmitter = require('events').EventEmitter;

module.exports = Spider;

function Spider(options){
  if(!(this instanceof Spider)){
    return new Spider(options);
  }
  this.options = _.defaults(options || {}, {
    debug: process.env.SP_DEBUG,
    // workers: numCPUs
    concurrency: 1
  });

  this._log = Debug({
    namespace: 'spider2',
    debug: this.options.debug
  });

  this.nest = Nest(this.options);
  this.nest.on('error', this._handleError.bind(this));
  this.nest.on('data', this._processData.bind(this));
};

Spider.prototype.__proto__ = EventEmitter.prototype,

Spider.prototype.crawl = function(urls){
  this._log.i('crawl', 'begin foraging...');
  this.nest.forage(urls, [SPIDER_TYPE.LINKS]);
};
Spider.prototype.destroy = function(){
  this._log.w('destroy', 'graceful exit');
  this.nest.destroy();
};
Spider.prototype.ping = function(){
  return this.nest.ping();
};
Spider.prototype._handleError = function(err, data){
  this.emit('error', err, data);
};
Spider.prototype._processData = function(data, body){
  if (body.search(/^\s*</) < 0) {
    return this._handleError(new Error('Body is not a type of HTML, can not be loaded by cheerio.'), data);
  }
  try {
    var $ = cheerio.load(body, {
      ignoreWhitespace: false,
      xmlMode: false,
      lowerCaseTags: true,
      decodeEntities: false
    });
    if(!!~data._args.indexOf(SPIDER_TYPE.LINKS)){
      this._log.i(SPIDER_TYPE.LINKS, 'processing...');
      var retVal = helper.analyzeLinks({
        ele: $,
        url: data.uri,
        domain: true,
        predication:this.options.predication,
        onProcess: function(ele){
          this.emit('data', SPIDER_TYPE.LINKS, ele);
        }.bind(this)
      });
      if(retVal instanceof Error){
        this._handleError(retVal, data);
      }
    }else{
      console.log(SPIDER_TYPE.ARTICLE);
    }
  } catch (err) {
    this._handleError(err, data);
  }
};

Object.defineProperties(Spider, SPIDER_TYPE);

var SPIDER_TYPE = {
  LINKS: 'links',
  ARTICLE: 'article'
};