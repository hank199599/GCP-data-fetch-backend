var http = require('https');
var cheerio = require('cheerio');
const { Console } = require('console');
var host = 'www.taiwanlottery.com.tw';
var lottery_type=["BINGO BINGO","雙贏彩","威力彩","38樂合彩","大樂透","49樂合彩","今彩539","39樂合彩","3星彩","4星彩"]
var lottery_price=["威力彩","大樂透"]

function sortNumber(a,b) {
    return a - b;
}

function parse($, dom) {
    var results={}
    var ball_yellow=[]
    var ball_blue=[]
    var ball_green=[]
    var ball_lemon=[]
    var ball_purple=[]

    $('div.top_dollar').each(function(i, elem) {
        results[lottery_price[i]]= { maximun_price:parseInt($(this).text())}; //威力彩、大樂透
    });
    $('span.font_black15').each(function(i, elem) {
        var temp = results[lottery_type[i]];
        if (temp===undefined){temp={}}
        temp['date']=$(this).text().match(/\S+/gm)[0]
        temp['period']=$(this).text().match(/\S+/gm)[1]
        results[lottery_type[i]]=temp
    });

    // Bingo Bingo 資料區塊
    $('div.ball_box01>div.ball_tx.ball_yellow').each(function(i, elem) {
        ball_yellow[i]=parseInt($(this).text())
    });
    results[lottery_type[0]]["numbers"]=ball_yellow
    results[lottery_type[0]]["超級獎號"]=$('div.contents_mine_tx08>div.ball_red').text()
    results[lottery_type[0]]["猜大小"]=$('div.contents_mine_tx08>div.ball_blue_BB1').text()
    results[lottery_type[0]]["猜單雙"]=$('div.contents_mine_tx08>div.ball_blue_BB2').text()

    //雙贏彩 資料區塊
    $('div.contents_box06>div.ball_tx.ball_blue').each(function(i, elem) {
        ball_blue[i]=parseInt($(this).text())
    });
    results[lottery_type[1]]["numbers"]=Array.from(new Set(ball_blue)).sort(sortNumber)

    //威力彩、樂合彩 資料區塊
    $('div.contents_box02>div.ball_tx.ball_green').each(function(i, elem) {
        ball_green[i]=parseInt($(this).text())
    });
    results[lottery_type[2]]["numbers"]=Array.from(new Set(ball_green)).sort(sortNumber)
    results[lottery_type[2]]["special"]=$('div.contents_box02>div.ball_red').text().match(/\S+/gm)[0]
    results[lottery_type[3]]["numbers"]=Array.from(new Set(ball_green)).sort(sortNumber)

    //大樂透、49樂合彩 資料區塊
    ball_yellow=[]
    $('div.contents_box02>div.ball_tx.ball_yellow').each(function(i, elem) {
        ball_yellow[i]=parseInt($(this).text())
    });
    results[lottery_type[4]]["numbers"]=Array.from(new Set(ball_yellow)).sort(sortNumber)
    results[lottery_type[4]]["special"]=$('div.contents_box02>div.ball_red').text().match(/\S+/gm)[1]
    results[lottery_type[5]]["numbers"]=Array.from(new Set(ball_yellow)).sort(sortNumber)

    //今彩539、39樂合彩 資料區塊
    $('div.contents_box03>div.ball_tx.ball_lemon').each(function(i, elem) {
        ball_lemon[i]=parseInt($(this).text())
    });
    results[lottery_type[6]]["numbers"]=Array.from(new Set(ball_lemon)).sort(sortNumber)
    results[lottery_type[7]]["numbers"]=Array.from(new Set(ball_lemon)).sort(sortNumber)

    //3星彩、4星彩 資料區塊
    $('div.contents_box04>div.ball_tx.ball_purple').each(function(i, elem) {
        ball_purple[i]=parseInt($(this).text())
    });
    results[lottery_type[8]]["numbers"]=ball_purple.slice(0,3)
    results[lottery_type[9]]["numbers"]=ball_purple.slice(3)

    return results
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
        path: '/index_new.aspx', 
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