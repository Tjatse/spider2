var Debug = require('./util/debug'),
  _ = require('lodash'),
  chalk = require('chalk'),
  Nest = require('./cluster/nest'),
  helper = require('./util/helper'),
  EventEmitter = require('events').EventEmitter;

module.exports = Spider;

function Spider(options) {
  if (!(this instanceof Spider)) {
    return new Spider(options);
  }
  this.options = _.defaults(options || {}, {
    debug: process.env.SP_DEBUG,
    domain: true
    // workers: numCPUs
    // concurrency: 1
  });

  this._log = Debug({
    namespace: 'spider2',
    debug: this.options.debug
  });

  this.nest = Nest(this.options);
  this.nest.on('error', this._handleError.bind(this));
  this.nest.on('data', this._processData.bind(this));
  this.nest.on('end', this.emit.bind(this, 'end'));
};

Spider.prototype.__proto__ = EventEmitter.prototype,

_.assign(Spider.prototype, {
  crawl: function (urls) {
    this.nest.forage(urls, helper.SPIDER_TYPE.LINK);
  },
  read: function (urls) {
    this.nest.forage(urls, helper.SPIDER_TYPE.ARTICLE);
  },
  destroy: function () {
    this._log.w('destroy', 'graceful exit');
    this.nest.destroy();
  },
  ping: function () {
    return this.nest.ping();
  },
  _handleError: function (err, data) {
    this.emit('error', err, data);
  },
  _processData: function (data, body) {
    this.emit('data', data, body);
  }
});

Spider.type = helper.SPIDER_TYPE;