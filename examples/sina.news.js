var _      = require('lodash'),
    Spider = require('../');

var spider = Spider({
  debug      : true,
  concurrency: 5
});
spider.on('error', function(err, req){
  if (req.worker) {
    console.error('worker #', req.worker, 'has an error:', err.message);
  } else {
    console.error(req.uri, err.message);
  }
});
spider.on('data', function(req, res){
  if (req._type == Spider.type.LINK) {
    var links = _.filter(res, validLink);
    console.log('length of articles:',  links.length);
    spider.read(links);
  } else if (req._type == Spider.type.ARTICLE) {
    console.log(req.uri, res.title);
  }
});
spider.on('end', function(){
  console.log('[END]');
});

spider.crawl([
  'http://news.sina.com.cn'
]);

function validLink(ele){
  if (!ele.uri || !ele.title) {
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