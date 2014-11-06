var URI = require('URIjs');

var helper = module.exports;


/**
 * Analyze href of the specific anchor
 * @param {Object} options, including:
 *                  {URIjs} baseURI
 *                  {Cheerio} ele anchor
 *                  {Function} predication verification
 * @returns {*}
 */
helper.analyzeHref = function(options){
  var href = options.ele.attr('href'), parent;
  // if href attribute does not exist.
  if(!href && (parent = options.ele.parent()) && parent.length > 0){
    var onclick;
    // try to get href from onclick if onclick like `window.open('/link_to.html')`.
    if(onclick = parent.attr('onclick')){
      var link;
      if(link = onclick.match(/['"]([^'"]+)['"]/)){
        href = link[1];
      }
    }
  }
  // if href still does not exist, returns nothing.
  if(!href){
    return;
  }

  // trim href.
  href = href.trim();

  // if href only contains hash, returns nothing.
  if(href.indexOf('#') == 0){
    return;
  }

  var uri;

  // try to parse href as URIjs object.
  try{
    uri = URI(href);
    if(uri.is('relative')){
      // make sure it is an absolute url.
      uri = uri.absoluteTo(options.baseURI);
    }
  }catch(err){
    return;
  }
  // both of them must in a same domain.
  if(options.domain && uri.domain().toLowerCase() != options.baseURI.domain().toLowerCase()){
    return;
  }

  // expose returning value.
  var retVal = {
    uri: uri.href(),
    title: (options.ele.attr('title') || options.ele.text() || '').trim().replace(/[\r\n\t]/g, ' ')
  };

  // verify predication if it exists.
  if(options.predication && !options.predication(retVal)){
    return;
  }

  return retVal;
};

/**
 * Analyze links on the specific element (including children-anchors).
 * @param {Object} options
 *          {String} url basic url
 *          {Cheerio} ele body cheerio element
 *          {Function} predication verification
 *          {Function} onProcess process data
 * @returns {*}
 */
helper.analyzeLinks = function(options){
  if(typeof options.onProcess != 'function'){
    return new Error('`onProcess` must be provided as a function.');
  }
  var baseURI;
  try{
    // parse base url as URIjs object.
    baseURI = URI(options.url).normalize();

    // the `base` tag in `head` takes top priority as base href.
    var baseEle = options.ele('head>base'), baseHref;
    if(baseEle && baseEle.length > 0 && (baseHref = baseEle.eq(0).attr('href'))){
      var baseHrefURI = URI(baseHref);
      if(baseHrefURI.is('absolute')){
        baseURI = baseHrefURI;
      }else{
        baseURI = baseHrefURI.absoluteTo(baseURI);
      }
    }
  }catch(err){
    return err;
  }

  var _predication;
  if(typeof options.predication == 'function'){
    _predication = options.predication;
  }else{
    _predication = function(){return true;};
  }

  // map all anchors as simple {title: '', href:''} object.
  process.nextTick(function(){
    options.ele('a').each(function(idx,lnk){
      var ele = helper.analyzeHref({
        ele: options.ele(this),
        domain: options.domain,
        baseURI: baseURI,
        predication: _predication
      });
      if(ele) {
        options.onProcess(ele);
      }
    });
  });
  return;
}
