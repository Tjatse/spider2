var Debug = require('../util/debug'),
  path = require('path'),
  _ = require('lodash'),
  cluster = require("cluster"),
  EventEmitter = require('events').EventEmitter,
  numCPUs = require('os').cpus().length;

module.exports = Nest;

function Nest(options) {
  if (!(this instanceof Nest)) {
    return new Nest(options);
  }
  options = _.defaults(options || {}, {
    debug: false,
    workers: numCPUs,
    concurrency: 1
  });
  this.options = options;

  this._log = Debug({
    namespace: 'sp-nest',
    debug: this.options.debug
  });
}

Nest.prototype.__proto__ = EventEmitter.prototype;

_.assign(Nest.prototype, {
  forage: function(urls, args){
    if(urls.length < this.options.workers){
      this.options.workers = urls.length;
    }

    this._setupCluster();

    var p = parseInt(urls.length / this.options.workers) + (urls.length % this.options.workers > 0 ? 1 : 0);
    _.values(cluster.workers).forEach(function (worker, i) {
      !worker.suicide && worker.send(['data', _(urls).rest(i * p).first(p).value(), args]);
    });
  },
  ping: function(){
    var workers = _(cluster.workers).values().filter(function(w){
      return !w.suicide;
    }).value();
    return workers.length;
  },
  destroy: function () {
    _.values(cluster.workers).forEach(function (worker) {
      this._log.i('spider', '#' + worker.id, 'was destroyed.');
      worker.send(['kill']);
      worker.disconnect();
    }.bind(this));
    this._setup = false;
  },
  _setupCluster: function () {
    if(this._setup){
      return;
    }
    this._setup = true;

    if (this.options.workers > numCPUs || this.options.workers < 0) {
      this._log.w('cluster', 'maximize of workers is', numCPUs, 'but currency', this.options.workers);
      this.options.workers = numCPUs;
    }
    this._log.i('cluster', 'setup master');

    cluster.setupMaster({
      exec: path.resolve(__dirname, 'spider.js'),
      args: [JSON.stringify(_.omit(this.options, 'workers'))],
      silent: false
    });

    for (var i = 0; i < this.options.workers; i++) {
      var worker = cluster.fork();
      worker.on('online', function (id) {
        this._log.i('spider', '#' + id,  'is alive');
      }.bind(this, worker.id))
        .on('error', function (id, err) {
          this._log.e('spider', '#' + id, 'has an error:', err.message);
        }.bind(this, worker.id))
        .on('exit', function (id, code, sgnal) {
          this._log.i('spider', '#' + id,  'has exited yet, code:', (!isNaN(code) ? code : 'unknown'));
        }.bind(this, worker.id))
        .on('message', this._processData.bind(this, worker.id));
    }
  },
  _processData: function(id, data){
    var resp = _.zipObject(['code', 'error', 'data', 'body'], data);
    if(resp.code == 'drain'){
      return cluster.workers[id].disconnect();
    }
    if(resp.code == 'fin'){
      if(resp.error) {
        var err = new Error(resp.error.substr(0, resp.error.indexOf('\n')).replace(/^Error:\s*/, ''));
        err.stack = resp.error;
        return this.emit('error', err, resp.data);
      }
      this.emit('data', resp.data, resp.body);
    }
  }
});

