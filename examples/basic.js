var Spider = require('../');

var spider = Spider({
  debug: true,
  workers: 2,
  concurrency: 1,
  /**
   * must be:
   * 1. uri must have 4 digital at least
   * 2. uri can not be a bitmap
   * 3. uri can not have no path
   * 4. length of title must greater than 5
   */
  predication: function(ele){
    var qsi, uri = ele.uri;
    if((qsi = uri.indexOf('?')) > 0){
      uri = uri.substr(0, qsi);
    }
    return uri.match(/\d{4,}/i) && !uri.match(/\.(jpg|png|jpeg|pdf)/i) && uri.indexOf('/') != uri.length - 1 && ele.title.length >= 5;
  }
});
spider.on('error', function(err, data){
  console.log('[ERROR]', err.message, data.uri);
});
spider.on('data', function(type, data){
  console.log('[' + type + ']', data.uri, data.title);
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
}, 500);
*/

/*
setTimeout(function(){
  spider.destroy();
}, 500);*/
/*
setTimeout(function(){
  var pong = spider.ping();
  console.log(pong + ' spiders.');
}, 3000);*/