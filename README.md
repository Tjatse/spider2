spider2
=======

A 2nd generation spider to crawl any article site, automatic reading title and content.

> Still in developing...

# Features
## Multi-core crawling
Right now it is not a single spider runs in a single thread. To take advantage of multi-core systems we may wanna launch
a cluster of processes to handle the load. Crawling fast and in order to maximum performance.

## Concurrency
**Multi-core crawling** feature is just make spiders work in a fork mode, but concurrency makes them work together in a
same thread and at a same time!!!

## Automatic
The old school crawls links/articles in a manual mode, e.g.: *request to server and get the response(HTML), then using
jQuery or something else to analyze links/articles by hard code*, this feels sucks, currently, we just need to make a list
of websites that you wanna scrape, `spider2` will handle anything else, take a cup of coffee, and wait to harvest the fruit.

## Queue
All the jobs are managed by async queue, so you can keep pushing the urls which to be crawled/read.

## Debug mode
![screenshot](screenshot/debug.jpg)

## More features
- Automatic User-Agent (actually I am a browser, not a spider).
- Proxy supports (avoid being blocked by server).
- Blazing fast with Cheerio & Cluster Fork Mode.
- Automatic Decode encodings (especially useful with non-english language).
- ...

# Installation
```
npm install spider2
```

# Programmatic
## Require
```javascript
var Spider = require('spider2');
```

## Usage
```javascript
var spider = Spider({
  timeout: 5000,
  debug: true,
  domain: true,
  workers: 7,
  concurrency: 1
});
```
### Options
The options including:
- **timeout** Set a timeout (in milliseconds) for the request, `10000` by default.
- **debug** A value indicating whether show the debug log or not, `false` by default, also it could be set with `process.env.SP_DEBUG`.
- **domain** A value indicating whether the links being crawled should in a same domain with the base url or not, `true` by default.
- **workers** Number of multi-core, can not greater than number of CPUs.
- **concurrency** number of concurrency per worker, `1` by default.

### Events
#### error
This event is emitted when an error has been caught, the arguments including:
- `err` Error object
- `req` Request data, if `req.worker` is defined an it is a number, means error is from the worker, `req.worker` is the id of a worker, otherwise it is a normal error.
Example:
```javascript
spider.on('error', function (err, req) {
  if (req.worker) {
    console.error('worker #', req.worker, 'has an error:', err.message);
  } else {
    console.error(req.uri, err.message);
  }
});
```

#### data
Data send by spider are obtained using this event, arguments including:
- `req` Request data.
- `res` Response data, if `req._type` equals `Spider.type.LINK`, `res` should be an array, including key-value pairs like `{title: [ANCHOR_TITLE], uri: [ANCHOR_HREF]}`, and if equals `Spider.type.ARTICLE`, `res` should be an object, keys including `title` and `content`.
Example:
```javascript
spider.on('data', function (req, res) {
  if (req._type == Spider.type.LINK) {
    spider.read(_.filter(res, validLink));
  } else if (req._type == Spider.type.ARTICLE) {
    console.log(req.uri, res.title);
  }
});
```

#### end
This event is emitted after all the spiders terminated abnormally.
Example:
```javascript
spider.on('end', function () {
  console.log('[END]');
});
```

### Methods
#### Crawl
Crawl links, option could be one of below:
- **String** Url
- **Array** Array of urls, both `[String, String, ...]` and `[Object, Object, ...]` will be fine.
- **Object** Must including `uri` property.

Example:
```javascript
spider.crawl([OPTION]);
```

#### read
Read title and content of article, option is same as above.
Example:
```javascript
spider.read([OPTION]);
```

#### destroy
Peaceful quit.
Example:
```javascript
spider.destroy();
```

#### ping
Ping the spider and returns workers' status Array.
Example:
```javascript
var pong = spider.ping();
console.log(pong);
```

`pong` will be printed like:
```
[
  {id: 1, count: 12},
  {id: 2, count: 90},
  ...
]
```

`id` is the id of worker, and `count` is the count of remaining jobs.

# Production
Using NSQ to manage the relationships between links and articles, or links and links, will make this module more powerful.

In my case, I have 9 centos, which have installed ElasticSearch 1.3.2, about 9 million data can be crawled every month.
![screenshot](screenshot/para.jpg)

Ample ability to process data, keep queue out of choking.
![screenshot](screenshot/nsq.jpg)

Hit title & content.
![screenshot](screenshot/search.jpg)

# Test
```
npm test
```

# Examples
Turn to `test/` or `/examples` directory.

# TODO
- [ ] fix typo bug
- [ ] more tests

# License
Copyright 2014 Tjatse

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.