var Debug = require('../util/debug'),
  helper = require('../util/helper'),
  path = require('path'),
  _ = require('lodash'),
  chalk = require('chalk'),
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
  forage: function(urls, type){
    this._setupCluster();

    if(!_.isArray(urls)){
      urls = [urls];
    }
    this._allocateJobs(urls, type);
  },
  ping: function(){
    var result = [];
    for(var id in cluster.workers){
      var w = cluster.workers[id];
      result.push({
        id: id,
        suicide: !!w.suicide,
        count: w.count || 0
      });
    }
    return result;
  },
  destroy: function () {
    _.values(cluster.workers).forEach(function (worker) {
      this._log.i('spider', chalk.blue('#' + worker.id), 'was destroyed');
      worker.count = 0;
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
    this._log.i('cluster', chalk.bold.yellow('setup master...'));

    cluster.setupMaster({
      exec: path.resolve(__dirname, 'spider.js'),
      args: [JSON.stringify(_.omit(this.options, 'workers'))],
      silent: false
    });

    for (var i = 0; i < this.options.workers; i++) {
      var worker = cluster.fork();
      worker.count = 0;
      this._log.i('spider', chalk.blue('#' + worker.id),  'has prepared to work');
      worker.on('error', function (id, err) {
          this._log.e('spider', chalk.blue('#' + id), 'has an error:', err.message);
          this.emit('error', err, {worker: id});
        }.bind(this, worker.id))
        .on('exit', function (id, code, sgnal) {
          this._log.i('spider', chalk.blue('#' + id),  'has exited yet, code:', (!isNaN(code) ? code : 'unknown'));
          if(this.ping() == 0){
            this.emit('end');
          }
        }.bind(this, worker.id))
        .on('message', this._processData.bind(this, worker.id));
    }
  },
  _allocateJobs: function(urls, type){
    // grep id and count, then sort by count.
    var wks = _(cluster.workers).values().map(function(w){
      return {id: w.id, count: w.count};
    }).sortBy(function(w){
      return w.count;
    }).clone();

    if(wks.length == 0){
      return;
    }

    var max = wks[wks.length - 1].count;

    function allocate(_urls, _wks, _fill){
      var size = 0, extra = 0;
      if(_fill) {
        size = parseInt(_urls.length / this.options.workers);
        extra = _urls.length % this.options.workers, i = 0;
      }
      for(var i = 0; i < _wks.length; i++){
        var data = _urls.splice(0, size + ((i < extra) ? 1 : 0) + max - _wks[i].count);
        if(data.length == 0) {
          break;
        }

        var worker = cluster.workers[_wks[i].id];
        worker.count += data.length;
        worker.send(['data', data, type]);
      }
    }

    // Equal allocation
    if(max == 0){
      return allocate.call(this, urls, wks, true);
    }
    // load balance
    var sum = _(wks).map(function(w){ return w.count; }).reduce(function(sum, num){ return sum + num; });
    allocate.call(this, urls, wks, urls.length > max * wks.length - sum)
  },
  _processData: function(id, data){
    cluster.workers[id].count--;

    var resp = _.zipObject(['code', 'data', 'body'], data);

    if(resp.code == 'fin'){
      if(resp.body && resp.body.error) {
        return this.emit('error', new Error(resp.body.error), resp.data);
      }
      this.emit('data', resp.data, resp.body);
    }
  }
});

