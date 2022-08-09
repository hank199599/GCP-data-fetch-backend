var http = require('http');
var cheerio = require('cheerio');
const { Console } = require('console');
var host = 'sprite.phys.ncku.edu.tw';

function parse($, dom) {
    var centers = [];
    var urls = [];
    var main_content_keys = [];
    var texts = [];
    var vitals = [];

    $('center').each(function(i, elem) {
        centers[i] = $(this).text().replace(/[/\n]/gm, "");
    });

    var main_content = $("body > p").text().replace(/[/\s|/\n]/gm, "").replace('說明:', "");

    $('a').each(function(i, elem) {
        urls[i] = $(this).attr("href");
        texts.push($(this).text())

        var temp = $(this).text()
        if (main_content.indexOf(temp) !== -1) {
            main_content_keys.push($(this).text())
        }
    });

    $('b').each(function(i, elem) {
        vitals[i] = $(this).text().replace(/[/\s|\(.+)]/gm, "")
    });

    var providers = centers[1].split(vitals[0])[1]//.replace(/^\s*/gm,"")
    var picture_url = "";

    var yt_url = $('iframe').attr('src');

    for (var i = 0; i < urls.length; i++) {

        if (urls[i].indexOf('.png') !== -1 ||urls[i].indexOf('.jpg') !== -1 || urls[i].indexOf('.JPG') !== -1 && urls[i].indexOf('image/') !== -1) {
            picture_url = 'http://sprite.phys.ncku.edu.tw/astrolab/mirrors/apod/' + urls[i];
            break
        } else {
            picture_url = ""
        }
    }

    if ($('iframe').attr('src') !== undefined) {
        picture_url = "http://img.youtube.com/vi/" + yt_url.split('/')[4].replace("?rel=0", "") + "/hqdefault.jpg";
    }

    if($('.vp-preview').style!==undefined){
        picture_url=$('.vp-preview').style.backgroundImage.split('\"')[1]
    }

    var output = {
        url: picture_url,
        title: vitals[0],
        copyright: providers,
        text: main_content
    }

    if (output.url.length === 0) {
        console.log(output.url)
        delete output.url
    }
    return output
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
        path: '/astrolab/mirrors/apod/apod.html', //每日路徑
        //path: '/astrolab/mirrors/apod/ap150629.html', //測試用路徑
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