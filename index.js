
var data_geter = require("./fetch.js");
var astro_en = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const admin = require('firebase-admin');
let serviceAccount = require("./config/b1a2b-krmfch-firebase-adminsdk-1tgdm-ec3c00705d.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://b1a2b-krmfch.firebaseio.com/"
});
const database = admin.database();

var getJSON = require('get-json')
const getCSV = require('get-csv');
var request = require('request'),
    cheerio = require('cheerio');
const replaceString = require('replace-string');
const fetch = require("node-fetch");

var transfor_list = require('./transform_list.json');
var generator = require("./generator.js");
var lottery_fetch = require('./lottery_fetch.js');
var Astro = require('./daily_astro_fetcher.js');

function air_report() {

    var output = {};
    var locations = [];

    return new Promise(function (resolve, reject) {
        fetch("https://data.epa.gov.tw/api/v2/aqx_p_432?api_key=afb0521d-3673-4601-8aa1-f4da89cf8883").then(function (response) {
            resolve(response.json())
        }).catch(function (error) { reject(new Error('資料獲取失敗', error)) });
    }).then((data)=>{
            
        origin_data = data["records"]

            for (var i = 0; i < origin_data.length; i++) {
                output[origin_data[i]["sitename"]] = {
                    Pollutant: origin_data[i]["pollutant"],
                    AQI: origin_data[i]["aqi"],
                    PM10: origin_data[i]['pm10'],
                    PM25: origin_data[i]['pm2.5'],
                    O3: origin_data[i]["o3"],
                }
            locations[i] = {
                lng: parseFloat(origin_data[i]["longitude"]),
                lat: parseFloat(origin_data[i]["latitude"]),
                Sitename: origin_data[i]["sitename"]
            }
        }

        // console.log(output)
        // console.log(replaceString(origin_data[0].publishtime,':00:00',':00'))

        if (Object.keys(output).length !== 0) {
            database.ref('/TWair').update({ 'data': output });
        }
        if (locations.length !== 0) {
            database.ref('/TWair').update({ 'locations': locations });
        }
            database.ref('/TWair').update({ 'PublishTime': replaceString(origin_data[0].publishtime,':00:00',':00')});

        }).catch(function(error) {
            console.log("air_report_set error : " + error)
        });
}

async function predict_report() {

    return new Promise(
        function(resolve, reject) {
            //取得概況報告
            var time = new Date();
            var hour_now = (time.getHours()+8) % 24;

            request('https://airtw.epa.gov.tw/CHT/Forecast/Forecast_3days.aspx', function(err, response, body) {
                if (!err && response.statusCode == 200) {

                    var $ = cheerio.load(body, { decodeEntities: false });
                    var aqi_temp = $('#CPH_Content_hf_DT').val();
                    var FCJsonObj = JSON.parse(aqi_temp.replace(/\r\n|\n/g, ""));

                    if ([0, 7, 8, 12, 17, 22].indexOf(hour_now) !== -1) {

                        var return_array1 = [];
                        var return_array2 = [];
                        var return_array3 = [];

                        for (var i = 0; i < 10; i++) {
                            return_array1.push({ AQI: FCJsonObj[i].DAY1_AQI, Pollutant: FCJsonObj[i].DAY1_POLL })
                            if (i < 7) {
                                return_array2.push({ AQI: FCJsonObj[i].DAY2_AQI, Pollutant: FCJsonObj[i].DAY2_POLL })
                                return_array3.push({ AQI: FCJsonObj[i].DAY3_AQI, Pollutant: FCJsonObj[i].DAY3_POLL })
                            }
                        }
                        database.ref('/TWair').update({
                            predicts: {
                                "0": return_array1,
                                "1": return_array2,
                                "2": return_array3
                            }
                        });
                    }

                    if (hour_now > 9) { var data = FCJsonObj[0].Content1; } else { var data = FCJsonObj[0].Content2; }

                    database.ref('/TWair').update({ report: data });
                    resolve(data)
                } else { reject(err) }
            });

        })
}

function uvi_index() {

    return new Promise(function (resolve, reject) {
        fetch("https://data.epa.gov.tw/api/v2/uv_s_01?limit=34&api_key=afb0521d-3673-4601-8aa1-f4da89cf8883").then(function (response) {
                resolve(response.json())
            }).catch(function (error) { reject(new Error('資料獲取失敗', error)) });
    }).then(function (origin_data) {

        var processed_data = generator.data_ranger(origin_data["records"]);

        console.log('ultraviolet rays index fetch success')
        database.ref('/TWuvi').update({ PublishTime: processed_data[0] });
        database.ref('/TWuvi').update({ data: processed_data[1] });
        database.ref('/TWuvi').update({ locations: processed_data[2] });

    }).catch(function (error) {
        console.log("ultraviolet rays index fetch error : " + error)
    });

}

function radiation_index() {

    return new Promise(function (resolve, reject) {
        getCSV('https://www.aec.gov.tw/dataopen/index.php?id=2').then(function (response) {

            resolve(response)
        }).catch(function (error) { reject(new Error('資料獲取失敗')) });
    }).then(function (origin_data) {

        var output = {};

        for (i = 0; i < origin_data.length; i++) {
            output[transfor_list[origin_data[i]['�ʴ���(�^��)']]] = {
                "PublishTime": replaceString(origin_data[i]['�ɶ�'],'-','/'),
                "SVC": origin_data[i]['�ʴ���(�L�襱/��)']
            }

        }
        console.log('radiation data fetch success')

        database.ref('/TWradiation').update({ data: output });
        database.ref('/TWradiation').update({ PublishTime: replaceString(origin_data[0]['�ɶ�'],'-','/') });
    }).catch(function (error) {
        console.log("radiation data fetch error : " + error)
    });
}

function blood_index() {
    return new Promise(
        function (resolve) {
            getJSON('https://us-central1-newagent-1-f657d.cloudfunctions.net/data_fetching_backend/tw_blood_index').then(function (response) {
                resolve(response)
            }).catch(function (error) { reject(new Error(error)) });

        }).then(function (origin_data) {
            console.log('blood storage data fetch success')
            database.ref('/TWblood').update(origin_data)

        }).catch(function (error) {
            console.log("blood storage data fetch error : " + error)
        });
}

async function getAstroData() {
    var time = new Date();
    var nowTime = time.getTime() + 8 * 3600 * 1000;
    time.setTime(parseInt(nowTime));
    var minute_now = time.getMinutes();

    if (minute_now <= 30) {
        
        Promise.all([data_geter.getAstroData(0), data_geter.getAstroData(1), data_geter.getAstroData(2)])
            .then(function (data) {

                for (var num = 0; num < 3; num++) {
                    var output = {};
                    var temp = data[num];

                    if (Object.keys(temp).length > 0) {

                        for (var j = 0; j < temp.length; j++) {
                            output[astro_en[j]] = temp[j];
                        }

                        var updates = {};
                        if (Object.keys(output).length > 0) {
                            updates[num] = output;
                            //console.log(["今天", "明天", "後天"][num])
                            //console.log(updates)
                            database.ref('/Astro').update(updates);
                        }
                    }

                }
            })
    }
    else {
        //進行資料測試，如果檢測不到則重新拉取資料

        return new Promise(
            function (resolve) {
                // indexer = num.toString();
                database.ref('/Astro').on('value', e => { resolve(e.val()) });
            }).then(function (test_data) {

                for (var num = 0; num <= 2; num++) {
                    console.log(["今天", "明天", "後天"][num])
                    if (test_data[num] !== undefined) {
                        console.log("運勢資料檢測正常")
                    } else {
                        console.log("發現遺失的運勢資料")
                        var index = num;

                        data_geter.getAstroData(index).then(function (data) {
                            var output = {};

                            if (Object.keys(data).length > 0) {
                                for (var j = 0; j < data.length; j++) {
                                    output[astro_en[j]] = data[j];
                                }

                                var updates = {};
                                if (Object.keys(output).length > 0) {
                                    updates[index] = output;
                                    // console.log(["今天", "明天", "後天"][num])
                                    console.log(updates)
                                    database.ref('/Astro').update(updates);
                                }
                            }
                        })
                    }
                }
            });
    }
}

async function lottery(){

    new Promise(function(resolve, reject) {
        lottery_fetch.query(function(err, info) {
            if (err) {
                reject(err.stack);
            }
            resolve(info);
        });
    }).then(function(origin_data) {

        console.log(origin_data);
        database.ref('/TWLottery').update(origin_data)
        console.log("tw lottery index success");
    }).catch(function(error) {
        console.log(error)
        res.end(error)
        console.log("tw lottery index error");
    });
}

async function Nasa_picture(){

    new Promise(function(resolve, reject) {
        Astro.query(function(err, info) {
            if (err) {
                reject(err.stack);
            }
            resolve(info);
        });
    }).then(function(origin_data) {
        //database.ref('/Nasa_picture').update(origin_data)
        console.log("Nasa picture index success");
    }).catch(function(error) {
        console.log(error)
        console.log("Nasa picture index error");
    });
}

function weather_report_set() {

    var station_list = [];
    var sorted_list=[[],[],[]];

        new Promise(function(resolve, reject) {
            getJSON('https://opendata.cwb.gov.tw/fileapi/v1/opendataapi/F-A0012-001?Authorization=CWB-D48B64A0-8BCB-497F-96E3-BD5EB63CF502&downloadType=WEB&format=JSON').then(
                function(response) {
                    data = response.cwbopendata.dataset;
                    resolve(data)
                }).catch(function(error) {
                var reason = new Error('資料獲取失敗');
                reject(reason)
            });
        }).then(function(origin_data) {

            var weather_data=origin_data.location;

            for (i = 0; i < weather_data.length; i++) {

                for(j=0;j<3;j++){

                    sorted_list[j][i]=[
                        weather_data[i].weatherElement[0].time[j].parameter.parameterName,
                        weather_data[i].weatherElement[0].time[j].parameter.parameterValue,
                        weather_data[i].weatherElement[1].time[j].parameter.parameterName,
                        weather_data[i].weatherElement[2].time[j].parameter.parameterName,
                        weather_data[i].weatherElement[3].time[j].parameter.parameterName,
                        weather_data[i].weatherElement[4].time[j].parameter.parameterName,
    
                    ]
                }
                station_list[i] = weather_data[i].locationName;
            }

            var report_PublishTime = origin_data.datasetInfo.issueTime.split('+08:00')[0];
            report_PublishTime = replaceString(report_PublishTime, 'T', ' ');
            report_PublishTime = replaceString(report_PublishTime, '-', '/');

            console.log('sea weather data fetch success')

            database.ref('/TWsea').update({ Today: sorted_list[0] });
            database.ref('/TWsea').update({ Tomorrow: sorted_list[1] });
            database.ref('/TWsea').update({ AfterTomorrow: sorted_list[2] });
            database.ref('/TWsea').update({ SiteName: station_list });
            database.ref('/TWsea').update({ PublishTime: report_PublishTime });

        }).catch(function(error) {
            console.log("sea weather data fetch error : " + error)
        });
}

async function lottery(){

    new Promise(function(resolve, reject) {
        lottery_fetch.query(function(err, info) {
            if (err) {
                reject(err.stack);
            }
            resolve(info);
        });
    }).then(function(origin_data) {

        console.log(origin_data);
        database.ref('/TWLottery').update(origin_data)
        console.log("tw lottery index success");
    }).catch(function(error) {
        console.log(error)
        res.end(error)
        console.log("tw lottery index error");
    });
}

exports.firebase_data_updater = (event,context) => {
    var time = new Date();
    var nowTime = time.getTime() + 8 * 3600 * 1000;
    time.setTime(parseInt(nowTime));
    var hour_now = time.getHours();
    var minute_now = time.getMinutes();

    if (minute_now >= 0 && minute_now <= 30 && minute_now%2 == 0) { air_report() }
    if (minute_now < 20) { predict_report()}
    if (minute_now >= 0 && minute_now <= 30 && minute_now%2 == 1) { uvi_index() }
    if (minute_now % 5 === 0) { radiation_index() }
    if (minute_now === 0) { lottery() }
    if (minute_now === 0) { blood_index() }
    if (minute_now === 0) { Nasa_picture() }
    if (minute_now <=10) { weather_report_set()}

};
