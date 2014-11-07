var path = require('path'),
  _ = require('lodash'),
  Spider = require('../');

var spider = Spider({
  debug: true,
  workers: 7,
  concurrency: 1
});
spider.on('error', function (err, req) {
  if (req.worker) {
    console.error('worker #', req.worker, 'has an error:', err.message);
  } else {
    console.error(req.uri, err.message);
  }
});
spider.on('data', function (req, res) {
  if (req._type == Spider.type.LINK) {
    spider.read(_.filter(res, validLink));
  } else if (req._type == Spider.type.ARTICLE) {
    console.log(req.uri, res.title);
  }
});
spider.on('end', function () {
  console.log('[END]');
});

spider.crawl([
  'http://www.sina.com.cn',
  'http://www.163.com',
  'http://www.autohome.com.cn',
  'http://www.sohu.com'
]);

/*
setTimeout(function(){
 spider.crawl([
 'http://getbootstrap.com/components/',
 'https://lodash.com/docs#compact',
 'https://www.npmjs.org/package/read-art'
 ]);
}, 200);*/

/*
 setTimeout(function(){
 spider.destroy();
 }, 500);*/

 setTimeout(function(){
   var pong = spider.ping();
   console.log(pong);
 }, 20000);

function validLink(ele){
  if(!ele.uri || !ele.title){
    return false;
  }
  /**
   * must be:
   * 1. uri must have 4 digital at least
   * 2. uri can not be a bitmap
   * 3. uri can not have no path
   * 4. length of title must greater than 5
   */
  var qsi, uri = ele.uri;
  if ((qsi = uri.indexOf('?')) > 0) {
    uri = uri.substr(0, qsi);
  }
  return uri.match(/\d{4,}/i) && !uri.match(/\.(jpg|png|jpeg|pdf)/i) && uri.indexOf('/') != uri.length - 1 && ele.title.length >= 5;
}