const replaceString = require('replace-string');

function data_ranger(origin_data) {
    var uvi = {};
    var locations = {};

    for (var i = 0; i < 34; i++) {
        if (origin_data[i]["uvi"].length !== 0) {
            uvi[origin_data[i]["sitename"]] = parseFloat(origin_data[i]["uvi"]);
        }

        var temp_lon = origin_data[i]["wgs84lon"].split(',');
        var temp_lat = origin_data[i]["wgs84lat"].split(',');
        var output_lon = parseInt(temp_lon[0]) + temp_lon[1] / 60 + temp_lon[2] / 3600;
        var output_lat = parseInt(temp_lat[0]) + temp_lat[1] / 60 + temp_lat[2] / 3600;

        locations[i] = {
            lng: parseFloat(output_lon.toFixed(5)),
            lat: parseFloat(output_lat.toFixed(5)),
            Sitename: origin_data[i]["sitename"]
        }
    }

    return [replaceString(origin_data[0]["publishtime"], '-', '/'), uvi, locations]
}


module.exports = { data_ranger }