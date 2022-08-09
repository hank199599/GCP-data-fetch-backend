const cheerio = require('cheerio');
var request = require('request');
var md5 = require('md5');

function request_time() {

    var today = new Date();
    var nowTime = today.getTime() + 8 * 3600 * 1000;
    today.setTime(parseInt(nowTime));
    var oYear = today.getFullYear();
    var oMoth = (today.getMonth() + 1).toString();
    if (oMoth.length <= 1) oMoth = '0' + oMoth;
    var oDay = today.getDate().toString();
    if (oDay.length <= 1) oDay = '0' + oDay;
    var oHour = today.getHours().toString();
    if (oHour.length <= 1) oHour = '0' + oHour;
    var oMinute = today.getMinutes().toString();
    if (oMinute.length <= 1) oMinute = '0' + oMinute;
    var oSecond = today.getSeconds().toString();
    if (oSecond.length <= 1) oSecond = '0' + oSecond;
    return oYear + oMoth + oDay + oHour + oMinute + oSecond;

}

async function getAstroData(num) {
    return new Promise(
        function(resolve, reject) {

            let dateStr = getDate(num);
            var time_now = request_time();
            var token = md5('astroAssist' + time_now + 'YGKE2UBg7J');

            request.post({
                    url: 'https://www.click108.com.tw/api/googleAssistant/astro_daily',
                    form: {
                        'accountID': 'astroAssist',
                        'checkToken': token,
                        'getDateTime': time_now,
                        'searchDate': dateStr
                    }
                },
                function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        resolve(body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>(?=\s*<)/gi, "$1"));
                    } else { reject(error) }
                });

        }).then(function(final_data) {

        //console.log(final_data)
        const $ = cheerio.load(final_data, { decodeEntities: false });

        let results = $('Click108Doc>result>data>*')
            .filter((i, e) => {
                return $(e).find('astro_name').length > 0
            })
            .map((i, e) => {
                let result = {}
                e.childNodes
                    .filter((e, i) => {
                        return !!e.tagName
                    })
                    .forEach((e, i) => {
                        let value = $(e).find('value').text().trim()
                        let content = $(e).find('content').text().trim()
                        if (!value && !content) {
                            value = $(e).text().trim()
                        }
                        let type = e.tagName

                        if (value.length === 1) {
                            var temp = parseInt(value) - 1;
                            var output = "";
                            for (var i = 0; i < 5; i++) {
                                if (i <= temp) { output = output + "★" } else { output = output + "☆" }
                            }
                            value = output
                        }

                        if (type !== "astro_name") {
                            result[type] = value
                        }
                    })
                return result
            })

        return Array.from(results);

    }).catch(function(error) {
        return error
    });
}
/**
 * 根據傳入數字，取得對應日期(today + num)
 * @param {number} num
 */
function getDate(num) {
    var today = new Date();
    var nowTime = today.getTime() + 8 * 3600 * 1000;
    var ms = 24 * 3600 * 1000 * num;
    today.setTime(parseInt(nowTime + ms));
    var oYear = today.getFullYear().toString();
    var oMoth = (today.getMonth() + 1).toString();
    if (oMoth.length === 1) {
        oMoth = '0' + oMoth;
    }
    var oDay = today.getDate().toString();
    if (oDay.length === 1) {
        oDay = '0' + oDay;
    }
    return oYear + '-' + oMoth + '-' + oDay;
}

module.exports = { getAstroData }