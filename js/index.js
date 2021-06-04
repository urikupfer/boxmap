//https://github.com/urikupfer/boxmap
//https://canvasjs.com/docs/charts/basics-of-creating-html5-chart/
//https://canvasjs.com/javascript-charts/chart-image-overlay/
//https://getbootstrap.com/docs/5.0/getting-started/introduction/
//https://docs.mapbox.com/help/tutorials/find-elevations-with-tilequery-api/
//https://medium.com/@dtkatz/3-ways-to-fix-the-cors-error-and-how-access-control-allow-origin-works-d97d55946d9
//https://www.bigdatacloud.com/blog/how-to-implement-free-reverse-geocoding-javascript-api-without-api-key
//https://developers.google.com/maps/documentation/javascript/adding-a-google-map#all
// popup modal https://pateladitya.com/puymodals/
//https://docs.mapbox.com/mapbox.js/example/v1.0.0/custom-legend/

//https://docs.mapbox.com/mapbox.js/example/v1.0.0/custom-popup/

/*       // Initialize and add the map
      function initMap() {
        // The location of Uluru
        const uluru = { lat: -25.344, lng: 131.036 };
        // The map, centered at Uluru
        const map = new google.maps.Map(document.getElementById("map"), {
          zoom: 4,
          center: uluru,
        });
        // The marker, positioned at Uluru
        const marker = new google.maps.Marker({
          position: uluru,
          map: map,
        });
      }

      function getReverseGeocodingData(lat, lng) {
        var latlng = new google.maps.LatLng(lat, lng);
        // This is making the Geocode request
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'latLng': latlng }, function (results, status) {
            if (status !== google.maps.GeocoderStatus.OK) {
                alert(status);
            }
            // This is checking to see if the Geoeode Status is OK before proceeding
            if (status == google.maps.GeocoderStatus.OK) {
                console.log(results);
                var address = (results[0].formatted_address);
            }
        });
    }
 */


var layer;
var chart;
var chardata = [];
var moreInfo;
var wikidata;
var prevtr;
var lng;
var lat;
var elevation;
var placeDescription;
var weatherBtnControl;
var dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', hour12: false, minute: '2-digit' };
var mapdiv = document.getElementById("map");
var pointWeatherData = document.getElementById("pointWeatherData");
var weatherbutton = document.getElementById("weatherbutton");

mapboxgl.accessToken = 'pk.eyJ1Ijoia3VwZmVydSIsImEiOiJja3A4NXpwYmkwMTV6MnBsbG9lcTYwdzhwIn0.XUB-OlC2DnKVvK8eP0z22w';

mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
    null,
    true // Lazy load the plugin
);

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g',
    center: [34.77, 31.24], // starting position
    zoom: 9,
});

map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false
    })
);

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

var scale = new mapboxgl.ScaleControl({
    maxWidth: 80,
    unit: 'imperial'
});
map.addControl(scale);
scale.setUnit('metric');

map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    })
);

// Control implemented as ES6 class
class WeatherBtnControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl';
        let btn = document.createElement('btn');
        btn.id = 'weatherbutton';
/*         btn.onclick = function () {
            showweather();
        };
 */        btn.innerHTML = `
    <div class="btn-group" role="group" aria-label="Basic checkbox toggle button group">
        <button id="weatherBtn" onclick="showweather()">
            <img src="https://api.met.no/images/weathericons/svg/clearsky_day.svg" width="60px" />       
        </button>
        <button id="wikiBtn" onclick="showwiki()">
            <img src="https://icons.iconarchive.com/icons/dakirby309/windows-8-metro/128/Web-Wikipedia-alt-2-Metro-icon.png" width="60px" />       
        </button>
        <button type="button" class="btn btn-info" id="infoBtn" onclick="getmoreinfo()" >
            <div>Longitude: <span id='lng'>123</span></div>
            <div>Latitude: <span id='lat'></span></div>
            <div>Elevation: <span id='ele'></span></div>
        </button>
    </div>`;
        this._container.appendChild(btn);
        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

weatherBtnControl = new WeatherBtnControl();
map.addControl(weatherBtnControl, 'top-left');
var lngDisplay = document.getElementById('lng');
var latDisplay = document.getElementById('lat');
var eleDisplay = document.getElementById('ele');
var weatherBtn = document.getElementById('weatherBtn');
var wikiBtn = document.getElementById('wikiBtn');
var infoBtn = document.getElementById('infoBtn');
infoBtn.style.display = "none";
weatherBtn.style.display = "none";
wikiBtn.style.display = "none";

map.on('load', function () {
    map.addSource('dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1'
    });
    map.addLayer(
        {
            'id': 'hillshading',
            'source': 'dem',
            'type': 'hillshade'
            // insert below waterway-river-canal-shadow;
            // where hillshading sits in the Mapbox Outdoors style
        },
        'waterway-river-canal-shadow'
    );
});

var marker = new mapboxgl.Marker({
    'color': '#314ccd'
});


// Initialise Reverse Geocode API Client 
var reverseGeocoder = new BDCReverseGeocode();
// You can also set the locality language as needed 
reverseGeocoder.localityLanguage = 'en';

// Get the current user's location information, based on the coordinates provided by their browser 
// Fetching coordinates requires the user to be accessing your page over HTTPS and to allow the location prompt. 
/* reverseGeocoder.getClientLocation(function (result) {
    console.log(result);
}); */

// Request the current user's coordinates (requires HTTPS and acceptance of prompt) 
/* reverseGeocoder.getClientCoordinates(function (result) {
    console.log(result);
}); */

map.on('click', function (e) {
    lng = e.lngLat.lng;
    lat = e.lngLat.lat;
    mapclick(lng, lat)
});

function mapclick(lng, lat) {
    infoBtn.style.display = "block";
    weatherBtn.style.display = "none";
    wikiBtn.style.display = "none";
    lngDisplay.textContent = lng.toFixed(2);
    latDisplay.textContent = lat.toFixed(2);

    //    map.flyTo({center: [lng, lat],});
    var l = new mapboxgl.LngLat(lng, lat);

    marker.setLngLat(l).addTo(map);

    url = `http://api.geonames.org/srtm3JSON?lat=${lat}&lng=${lng}&username=urikupfer`;
    getlongitude1(url);

    url = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=urikupfer`;
    getTimeZone(url);

    /* Get the administrative location information using a set of known coordinates */
    reverseGeocoder.getClientLocation({
        latitude: lat,
        longitude: lng,
    }, function (result) {
        console.log(result);
        placeDescription = '';
        var administrative = result.localityInfo.administrative;
        for (i = 0; i < administrative.length; i++) {
            console.log(administrative[i].name);
            placeDescription += administrative[i].name + ',';
        }
        console.log(placeDescription);
        var d = document.getElementById('tz');
        //        d.textContent=placeDescription;
    });
}

async function getlongitude(url) {
    fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
    })
        .then(async data => {
            console.log('getlongitude: ' + url);
            console.log('getlongitude: ' + data);
            const formData = await data.json();
            console.log('getlongitude: ' + formData);
        })
        .catch(error => {
            console.log(error);
        })
}

function getlongitude1(url) {
    $.ajax({
        type: "GET",
        url: url,
        jsonp: "callback",
        dataType: 'jsonp',
        data: {
            action: "query",
            format: "json"
        },
        xhrFields: { withCredentials: true },
        success: function (response) {
            console.log('getlongitude1  ' + url);
            console.log('getlongitude1  ' + response);
            var newData;
            try {
                newData = JSON.stringify(response);
                console.log('getlongitude1  ' + newData);
                var obj = JSON.parse(newData);
                elevation = obj.srtm3;
                console.log('getlongitude1  ' + elevation);
                if (elevation < -1000) {
                    getElevation();
                } else {
                    eleDisplay.textContent = elevation + ' m';

                    lngDisplay.textContent = lng.toFixed(2);
                    latDisplay.textContent = lat.toFixed(2);
                    eleDisplay.textContent = elevation + ' m';

                    weatherBtn.style.display = "block";
                    wikiBtn.style.display = "block";
                }
            } catch (e) {
                console.log('getlongitude1 err ' + newData);
            }
        }
    });
}

function getTimeZone(url) {
    $.ajax({
        type: "GET",
        url: url,
        jsonp: "callback",
        dataType: 'jsonp',
        data: {
            action: "query",
            format: "json"
        },
        xhrFields: { withCredentials: true },
        success: function (response) {
            console.log('getTimeZone  ' + url);
            console.log('getTimeZone  ' + response);
            var newData;
            try {
                newData = JSON.stringify(response);
                console.log('getTimeZone  ' + newData);
                var obj = JSON.parse(newData);
                moreInfo = {
                    sunrise: obj.sunrise,
                    countryCode: obj.countryCode,
                    gmtOffset: obj.gmtOffset,
                    rawOffset: obj.rawOffset,
                    sunset: obj.sunset,
                    timezoneId: obj.timezoneId,
                    dstOffset: obj.dstOffset,
                    countryName: obj.countryName,
                    time: obj.time,
                    lat: obj.lng,
                    lat: obj.lat,
                };
                console.log('getTimeZone  ' + moreInfo.time);
            } catch (e) {
                console.log('getTimeZone err ' + newData);
            }
        }
    });
}

function getmoreinfo() {
    if (moreInfo == undefined) return;

    pointWeatherData.style.display = "block"
    pointWeatherData.classList.add("show");
    $('#pointWeatherData').draggable({ handle: ".modal-header" });
    document.getElementById("exampleModalLabel").textContent = 'more info data';

    pointweathedata.innerHTML = `
    <table class="table table-bordered border-primary">
    <tr><td>time</td><td> <b> ${moreInfo.time} </b></td></tr>
    <tr><td>sunrise</td><td><b> ${moreInfo.sunrise} </b></td></tr>
    <tr><td>sunset</td><td><b> ${moreInfo.sunset} </b></td></tr> 
    <tr><td>countryCode</td><td> <b> ${moreInfo.countryCode} </b></td></tr>
    <tr><td>gmtOffset</td><td><b> ${moreInfo.gmtOffset}</b></td></tr>
    <tr><td>rawOffset:</td><td> <b> ${moreInfo.rawOffset}</b></td></tr>
    <tr><td>timezoneId</td><td> <b> ${moreInfo.timezoneId}</b></td></tr>
     <tr><td>dstOffset</td><td> <b> ${moreInfo.dstOffset}</b></td></tr>
    <tr><td>countryName</td><td><b>${moreInfo.countryName}</b></td></tr>
    </table>`;
}

function getWikiData(url) {
    $.ajax({
        type: "GET",
        url: url,
        jsonp: "callback",
        dataType: 'jsonp',
        data: {
            action: "query",
            format: "json"
        },
        xhrFields: { withCredentials: true },
        success: function (response) {
            console.log('getWikiData  ' + url);
            console.log('getWikiData  ' + response);
            var newData;
            try {
                newData = JSON.stringify(response);
                var obj = JSON.parse(newData);
                console.log('getWikiData  ' + obj.query.geosearch.length);
                wikidata = [];
                for (i = 0; i < obj.query.geosearch.length; i++) {
                    wikidata.push({
                        pageid: obj.query.geosearch[i].pageid,
                        url: `http://en.wikipedia.org/wiki?curid=${obj.query.geosearch[i].pageid}`,
                        ns: obj.query.geosearch[i].ns,
                        title: obj.query.geosearch[i].title,
                        lat: obj.query.geosearch[i].lat,
                        lon: obj.query.geosearch[i].lon,
                        dist: obj.query.geosearch[i].dist,
                        primary: obj.query.geosearch[i].primary
                    });
                }
                console.log('getWikiData  ' + newData);

                if (wikidata == undefined) return;

                pointWeatherData.style.display = "block"
                pointWeatherData.classList.add("show");
                $('#pointWeatherData').draggable({ handle: ".modal-header" });
                document.getElementById("exampleModalLabel").textContent = 'wiki points';

                s = `<div class="scroll-table-container">
                <table class="table table-bordered border-primary" class="scrolldown">`;
                //<a href= ${wikidata[i].url} target="_blank"rel=" noopener noreferrer">open link </a>
                for (i = 0; i < wikidata.length; i++) {
                    s += `<tr id='tr${i}' onclick="wikitableItemClick(${i})">
                    <td>${wikidata[i].title}</td>
                    <td>
                    <a href="#" onClick="MyWindow=window.open('${wikidata[i].url}','MyWindow','width=600,height=300'); return false;">open link</a>
                    </td>
                      </tr>`;
                }
                s += `</table></div>`;
                pointweathedata.innerHTML = s;

            } catch (e) {
                console.log('getWikiData err ' + newData);
            }
        }
    });
}

function showwiki() {
    url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=10000&gslimit=200`;
    getWikiData(url);
}

function wikitableItemClick(i) {
    map.flyTo({ center: [wikidata[i].lon, wikidata[i].lat], });
    mapclick(wikidata[i].lon, wikidata[i].lat);
}

async function getWeather(url) {
    fetch(url, {
        method: 'GET',
        mode: 'cors'
    })
        .then(async data => {
            console.log('getWeather: ' + url);
            const formData = await data.json();
            console.log(formData);
            loadTable(formData);
        })
        .catch(error => {
            console.log(error);
        })
}

function loadTable(items) {
    //    mapdiv.style.height = "500px";
    let tableData = `<thead>
    <tr>
      <th>image</th>
      <th>time</th>
      <th>air_temperature</th>
      <th>description</th>
    </tr>
    </thead><tbody>`;

    let icontable = '<tr>';
    var timeseries = items.properties.timeseries;

    let time = '';
    let air_temperature = '';
    let symbol_code = '';
    chardata = [];
    let j = 0;
    let thisDay;
    let iconString = '';
    for (i = 0; i < timeseries.length; i++) {
        time = new Date(timeseries[i].time);
        time = new Date(new Date(timeseries[i].time));
        let d = time.getDay();

        // fill weather table and chart data
        air_temperature = timeseries[i].data.instant.details.air_temperature;

        // check if symbol_code is in json
        symbol_code = '';
        if (timeseries[i].data.next_1_hours != undefined) {
            symbol_code = timeseries[i].data.next_1_hours.summary.symbol_code;
        } else if (timeseries[i].data.next_6_hours != undefined) {
            symbol_code = timeseries[i].data.next_6_hours.summary.symbol_code;
        }
        if (symbol_code == '') {
            symbol_code = chardata[chardata.length - 1].name;
        }

        // create icons list for icons table
        iconString += symbol_code;
        if (i == 0) {
            thisDay = d;
        }
        if (thisDay != d) {
            thisDay = d;
            icontable += `<th scope="col" class='icon' id='thicon${j}'>
                            <img src="https://api.met.no/images/weathericons/svg/${getIcon(iconString)}.svg" width="50px" height="50px">
                        </th>`;
            iconString = '';
            j++;
        }

        tableData += `
        <tr id='tr${i}' onclick="tableItemClick(this)" ondblclick="tableItemdblClick(this)">
            <td><img src="https://api.met.no/images/weathericons/svg/${symbol_code}.svg" width="50px" height="50px"/></td>
            <td>${time.toLocaleDateString("en-US", dateFormatOptions)}</td>
            <td>${air_temperature}\u2103</td>
            <td>${symbol_code}</td>
        </tr>         
        `;

        chardata.push(
            {
                x: time,
                y: air_temperature,
                indexLabel: '',
                markerType: 'circle',
                name: symbol_code,
                markerColor: setTempColor(air_temperature),
                index: i,
                air_pressure_at_sea_level: timeseries[i].data.instant.details.air_pressure_at_sea_level,
                cloud_area_fraction: timeseries[i].data.instant.details.cloud_area_fraction,
                cloud_area_fraction_high: timeseries[i].data.instant.details.cloud_area_fraction_high,
                cloud_area_fraction_low: timeseries[i].data.instant.details.cloud_area_fraction_low,
                cloud_area_fraction_medium: timeseries[i].data.instant.details.cloud_area_fraction_medium,
                fog_area_fraction: timeseries[i].data.instant.details.fog_area_fraction,
                relative_humidity: timeseries[i].data.instant.details.relative_humidity,
                ultraviolet_index_clear_sky: timeseries[i].data.instant.details.ultraviolet_index_clear_sky,
                wind_from_direction: timeseries[i].data.instant.details.wind_from_direction,
                wind_speed: timeseries[i].data.instant.details.wind_speed
            }
        );
    }
    tableData += `</tbody>`;
    document.getElementById("weatherdata").innerHTML = tableData;

    icontable += `</tr>`;
    //   console.log(icontable);
    document.getElementById("icontable").innerHTML = icontable;

    //   console.log(chardata);
    chart.options.data[0].dataPoints = chardata;
    chart.render();
    chart.title.set("text", placeDescription);
}

function tableItemClick(x) {
    var index = x.rowIndex;
    console.log('tableItemClick  ' + index);
    if (prevtr != undefined) {
        prevtr.style.backgroundColor = "white";
    }
    var tr = document.getElementById("weatherdata").getElementsByTagName("tr");
    tr[index].style.backgroundColor = "lightyellow";
    prevtr = tr[index];

    chart.options.axisX.stripLines[0].value = chardata[index - 1].x;
    chart.render();
}

function tableItemdblClick(x) {
    var index = x.rowIndex;
    console.log('tableItemClick  ' + index);
    if (prevtr != undefined) {
        prevtr.style.backgroundColor = "white";
    }
    var tr = document.getElementById("weatherdata").getElementsByTagName("tr");
    tr[index].style.backgroundColor = "lightyellow";
    prevtr = tr[index];

    chart.options.axisX.stripLines[0].value = chardata[index - 1].x;
    chart.render();

    pointWeatherData.style.display = "block"
    pointWeatherData.classList.add("show");
    $('#pointWeatherData').draggable({ handle: ".modal-header" });

    document.getElementById("exampleModalLabel").textContent = 'weather detailes';

    pointweathedata.innerHTML = `<table class="table table-bordered border-primary">
    <tr><td><b> ${chardata[index - 1].x.toLocaleDateString("en-US", dateFormatOptions)} </b></td><td><img src="https://api.met.no/images/weathericons/svg/${chardata[index - 1].name}.svg" width="50px" height="50px"/></td></tr>
    <tr><td>description</td><td><b> ${chardata[index - 1].name} </b></td></tr>
    <tr><td>air temperature at 2m above the ground</td><td> <b> ${chardata[index - 1].y} \u2103</b></td></tr>
    <tr><td>air pressure at sea level</td><td><b> ${chardata[index - 1].air_pressure_at_sea_level} hPa </b></td></tr>
    <tr><td>total cloud cover for all heights:</td><td> <b> ${chardata[index - 1].cloud_area_fraction} %</b></td></tr>
    <tr><td>cloud cover higher than 5000m above the ground: </td><td><b> ${chardata[index - 1].cloud_area_fraction_high} %</b></td></tr> 
    <tr><td>cloud cover lower than 2000m above the ground:</td><td> <b> ${chardata[index - 1].cloud_area_fraction_low} %</b></td></tr>
    <tr><td>cloud cover between 2000 and 5000m above the ground:</td><td><b>  ${chardata[index - 1].cloud_area_fraction_medium} %</b></td></tr> 
    <tr><td>dew point temperature 2m above the ground:</td><td> <b> ${chardata[index - 1].fog_area_fraction} \u2103</b></td></tr>
    <tr><td>relative humidity at 2m above the ground:</td><td><b>${chardata[index - 1].relative_humidity} %</b></td></tr>
    <tr><td>ultraviolet index for cloud free conditions, 0 (low) to 11+ (extreme):</td><td> <b> ${chardata[index - 1].ultraviolet_index_clear_sky} </b></td></tr>
    <tr><td>direction the wind is coming from (0° is north, 90° east, etc.):</td><td> <b> ${chardata[index - 1].wind_from_direction} degrees</b></td></tr>
    <tr><td>wind speed at 10m above the ground (10 min average):</td><td><b>${chardata[index - 1].wind_speed} m/s</b></td></tr>
    </table>`;
}

function closeModal() {
    document.getElementById("backdrop").style.display = "none"
    pointWeatherData.style.display = "none"
    pointWeatherData.classList.remove("show")
}

function getIcon(iconString) {
    let s = 'partlycloudy_day';
    if (iconString.includes("snowshowers")) {
        s = "snowshowers_day";
    } else if (iconString.includes("snow")) {
        s = "snow";
    } else if (iconString.includes("sleetshowers")) {
        s = "sleetshowers_day";
    } else if (iconString.includes("sleet")) {
        s = "sleet";
    } else if (iconString.includes("rainshowers")) {
        s = "rainshowers_day";
    } else if (iconString.includes("rain")) {
        s = "rain";
    } else if (iconString.includes("partlycloudy")) {
        s = "partlycloudy_day";
    } else if (iconString.includes("cloudy")) {
        s = "cloudy";
    } else if (iconString.includes("fair")) {
        s = "fair_day";
    } else if (iconString.includes("fog")) {
        s = "fog";
    } else {
        s = "clearsky_day";
    }
    return s;
}

function setTempColor(t) {
    var r = 255, g = 255, b = 255;

    if (t >= 20) {
        r = 255;
        g = ((50 - t) * 255 / 50);
        b = 0;
    } else if (t > 0) {
        r = 255;
        g = 255;
        b = ((20 - t) * 255 / 20);
    } else if (t >= -30) {
        r = ((t + 30) * 255 / 30);
        g = ((t + 30) * 255 / 30);
        b = 255;
    } else if (t < -30) {
        r = 255;
        g = ((t + 80) * 255 / 50);
        b = 255;
    }
    return `rgb(${r}, ${g}, ${b})`;
}

function getElevation() {
    var query = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?layers=contour&limit=50&access_token=${mapboxgl.accessToken}`;
    $.ajax({
        method: 'GET',
        url: query,
    }).done(function (data) {
        // Get all the returned features
        var allFeatures = data.features;
        console.log(allFeatures);
        // Create an empty array to add elevation data to
        var elevations = [];
        // For each returned feature, add elevation data to the elevations array
        for (i = 0; i < allFeatures.length; i++) {
            elevations.push(allFeatures[i].properties.ele);
        }
        // In the elevations array, find the largest value
        elevation = Math.max(...elevations);
        // Display the largest elevation value
        eleDisplay.textContent = elevation + ' m';

        weatherBtn.style.display = "block";
        wikiBtn.style.display = "block";
    });
}

function showweather() {
    var url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat};&lon=${lng}&altitude=${elevation}`;
    getWeather(url);
}

window.onload = function () {
    chart = new CanvasJS.Chart("chartContainer", {
        theme: "dark1", // "light1", "light2", "dark1", "dark2"
        animationEnabled: true,
        title: {
            text: "weather chart"
        },

        axisX: {
            stripLines: [
                {
                    value: 15,
                    showOnTop: true,
                    thickness: 2,
                    color: "#9999fd",
                    lineDashType: "dash"
                }
            ],
            title: "time",
            gridThickness: 2,
            interval: 1,
            intervalType: "day",
            valueFormatString: "D/M/YYYY",
            labelAngle: -20
        },
        axisY: {
            title: "temp"
        },
        toolTip: {
            shared: true,
            content: "{x}:00 </br>{name}</br> <strong>Temperature: </strong> </br>{y} °C "
        },
        mouseover: onMouseover,
        data: [
            {
                click: function (e) {
                    if (prevtr != undefined) {
                        prevtr.style.backgroundColor = "white";
                    }
                    let index = e.dataPoint.index + 1;
                    var x = document.getElementById("weatherdata").getElementsByTagName("tr");
                    x[index].style.backgroundColor = "lightyellow";
                    x[index].scrollIntoView(true);
                    console.log(index);
                    prevtr = x[index];
                    chart.options.axisX.stripLines[0].value = chardata[index - 1].x;
                    chart.render();
                },
                type: "spline",
                markerSize: 10,
                hoveredMarkerSize: 30,
                xValueFormatString: "DD/MM/YYYY HH",
                yValueFormatString: "###.#",
                dataPoints: chardata
            }
        ]
    });

    function onMouseover(e) {
        alert(e.dataSeries.type + ", dataPoint { x:" + e.dataPoint.x + ", y: " + e.dataPoint.y + " }");
    }

}
