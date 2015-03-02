var _ = require('lodash'),
  chalk = require('chalk'),
  req = require('req-fast'),
  Debug = require('./debug');

module.exports = Crawler;

function Crawler(options) {
  if (!(this instanceof Crawler)) {
    return new Crawler(options);
  }

  this.options = _.defaults(options || {}, {
    method: 'GET',
    timeout: 10000,
    debug: false
  });

  this._log = Debug({
    namespace: 'crawler',
    debug: this.options.debug
  });
}

_.assign(Crawler.prototype, {
  crawl: function (url, fn) {
    if (_.isArray(url)) {
      for (var i = 0; i < url.length; i++) {
        this.crawl(url[i], fn);
      }
      return;
    }
    if (typeof url == 'string') {
      url = {uri: url};
    }
    if (!url || !url.uri) {
      return fn(new Error('`uri` is required'), url);
    }
    _.defaults(url, this.options);
    this._request(url, fn);
  },
  destroy: function () {
    this._destroyed = true;
  },
  _request: function (url, fn) {
    this._log.i('http', chalk.magenta('GET'), chalk.underline.grey(url.uri));
    var pickedKeys = ['uri', 'method', 'timeout', 'dataType', 'data', 'agent', 'charset', 'disableRedirect', 'maxRedirects', 'disableGzip', 'trackCookie', 'headers', 'cookies', 'proxy'],
        options = _.pick(url, pickedKeys);
    options.__data = _.omit(url, pickedKeys);

    req(options, function (callback, error, resp) {
      if (this._destroyed) {
        error = new Error('request was destroyed.');
      }
      // handle error.
      if (!error && !resp) {
        error = new Error('No response from server.');
      } else if (!error && resp && !resp.body) {
        error = new Error('No body has been found.');
      }
      this._processHTML(error, options, resp, callback);
    }.bind(this, fn));
  },
  _processHTML: function (error, data, resp, fn) {
    var uriArg = chalk.underline.grey(data.uri);

    // handle error.
    if (error) {
      this._log.e(error.message, uriArg);
      return fn(error, data);
    }

    this._log.i('http', chalk.magenta(resp.statusCode), uriArg);

    var body = resp.body;

    // handle JSON.
    if (typeof body == 'object') {
      var errMsg = 'Body is a type of JSON, can not be crawled.';
      this._log.w(errMsg, uriArg);
      return fn(new Error(errMsg), data);
    }

    // make sure response body is string.
    if (typeof body != 'string') {
      this._log.w('Body is not a type of String, try to decode by UTF-8 encoding.', uriArg);
      body = body.toString('utf-8');
    }

    this._log.i('http', chalk.magenta('FIN'), uriArg);
    fn(null, data, body);
  }
});