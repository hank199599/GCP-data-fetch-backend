var http = require('https');
var cheerio = require('cheerio');
var host = 'invoice.etax.nat.gov.tw';

function parse($, dom) {
    var numbers= new Set();
    var title = new Set();
    var interval = new Set();
    
    $('.etw-tbiggest').each(function(i, elem) {
        numbers.add($(this).text().replace(/\D+/,''));
    });
    numbers = Array.from(numbers)
    $('.etw-on').each(function(i, elem) {
        title.add($(this).text().replace('中獎號碼單',''));
    });
    $('.text-center.etw-color-redbrown').each(function(i, elem) {
        interval.add($(this).text().replace(/[\領|\獎|\期|\間|\自|\起|\止]/g, ""));
    });

    return {
        "title": Array.from(title)[0],
        "interval":Array.from(interval)[0],
        "super":numbers[0],
        "special":numbers[1],
        "first":numbers.slice(2,5), 
        "addition":numbers.slice(5,numbers.length)
    }
}

/**
 * Query Receipt Lottery Information
 *
 * @param   {Function}  callback(err: Error, invoiceInfo: Object)
 * @param   {Number!}   timeout  default is 10000ms
 */
exports.query = function(callback, timeout) {
    var cb = typeof callback === 'function' ? callback : function() {};
    timeout = timeout || 10 * 1000;

    var options = {
        hostname: host,
        path: '/',
        method: 'GET'
    };

    var req = http.request(options, function(res) {
        if (res.statusCode !== 200) {
            return cb(new Error('request to ' + options.hostname + ' failed, status code = ' + res.statusCode + ' (' + res.statusMessage + ')'));
        }

        var buffer = [];
        res.on('data', function(chunk) {
            buffer.push(chunk.toString());
        });
        res.on('end', function() {
            var html = buffer.join();
            var $ = cheerio.load(html);
            return cb(null, parse($, $('')));
        });
        res.on('error', function(err) {
            return cb(err, null);
        });
    });

    req.setTimeout(timeout, function() {
        req.abort();
        return cb(new Error('request to ' + options.hostname + ' timeout'), null);
    });

    req.on('error', function(err) {
        return cb(err, null);
    });

    req.end();
};