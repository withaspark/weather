"use strict";

const fs = require("fs");
const path = require("path")
const util = require("util");
const request = require("sync-request");

function Weather(options) {
    if (!options) {
        options = {};
    }

    if (!(this instanceof Weather)) {
        return new Weather(options);
    }

    var that = this;

    this.config = options;
    this.config.zip = options.zip || 32202;
    this.config.station = options.station || 'KJAX';
    this.config.sun_url = options.sun_url || "https://api.duckduckgo.com/?q=sunrise%20today&format=json";
    this.config.weather_url = options.weather_url || "https://api.weather.gov/stations/{station}/observations/latest";
    this.config.cache_dir = (options.cache_dir || "/tmp").replace(new RegExp("/" + path.sep + "$/"));
    this.config.cache_prefix = options.cache_prefix || "withaspark.weather.";
    this.config.cache_lifetime = (options.hasOwnProperty("cache_lifetime"))
        ? options.cache_lifetime
        : 5;
    this.config.unknown = options.unknown || '?';
    this.data = {};

    cache('zip', this.config.zip);
    cache('station', this.config.station);

    /**
     * Get the value for a given key.
     *
     * @param {string} key
     * @returns {*}
     */
    this.getValue = function (key) {
        var cached = cache(key),
            saved = that.data.hasOwnProperty(key)
                ? that.data[key]
                : null;

        if (cached !== null) {
            return cached;
        }

        if (saved !== null) {
            return saved;
        }

        return that.config.unknown;
    };

    /**
     * Execute required initialization methods.
     *
     * @returns {void}
     */
    function init() {
        fetchCitySunriseSunsetForZip();
        fetchWeatherForStation();
    }

    /**
     * Work with the cache interface. When only key is specified, the value will be fetched. When
     * key and value are specified, value will be written to cache key's values.
     *
     * @param {string} key
     * @param {*} value
     * @param {integer} expiry
     * @returns {*} Value of value
     */
    function cache(key, value, expiry) {
        if (typeof value === "undefined") {
            if (isCacheExpired(key)) {
                return null;
            }

            return getFromCache(key);
        }

        if (typeof expiry === "undefined") {
            expiry = that.config.cache_lifetime;
        }

        setInCache(key, value, expiry);

        return value;
    }

    /**
     * Check if the cache of key has expired.
     *
     * @param {string} key
     * @returns {boolean}
     */
    function isCacheExpired(key) {
        var data = (getFromCache(key, true) || "").split("\n", 2);

        // Invalid cache file, just say it is expired
        if (data.length !== 2) {
            return true;
        }

        var expiry = data[0].split(":", 2)[1],
            age = getCacheAge(key);

        return (age >= expiry);
    }

    /**
     * Check if the cache of any provided keys has expired.
     *
     * @param {Array<string>} keys
     * @returns {boolean}
     */
    function isCacheExpiredMany(keys) {
        for (var i = 0; i < keys.length; i++) {
            if (isCacheExpired(keys[i])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Write a given value to the cache and internal data repository.
     *
     * @param {string} key
     * @param {*} value
     * @param {*} expiry
     * @returns {void}
     */
    function setInCache(key, value, expiry) {
        if (typeof key !== "string" || typeof value === "undefined") {
            throw "Unable to set value in cache. String type key and any value is required.";
        }

        if (typeof expiry === 'undefined') {
            expiry = that.cache_lifetime;
        }

        that.data[key] = value;

        fs.writeFileSync(
            getKeyCacheFile(key),
            "expires:" + expiry + "\n" + value,
            function (err) {
                if (err) {
                    return console.log(err);
                }
            }
        );
    }

    /**
     * Get the data for key from cache.
     *
     * @param {string} key
     * @param {boolean} include_headers If true, will include metadata in return value
     * @returns {string}
     */
    function getFromCache(key, include_headers) {
        if (typeof key !== "string") {
            throw "Unable to get value from cache. String type key is required.";
        }

        if (typeof include_headers !== "boolean") {
            include_headers = false;
        }

        if (!fs.existsSync(getKeyCacheFile(key))) {
            return null;
        }

        var data = fs.readFileSync(getKeyCacheFile(key), { encoding: "utf8" });

        if (include_headers) {
            return data;
        }

        return data.split("\n", 2)[1];
    }

    /**
     * Generate the absolute path to the key's cache file.
     *
     * @param {string} key
     * @returns {string}
     */
    function getKeyCacheFile(key) {
        return that.config.cache_dir
            + path.sep
            + that.config.cache_prefix
            + key;
    }

    /**
     * Get the cache age in minutes.
     *
     * @param {string} key
     * @returns {integer}
     */
    function getCacheAge(key) {
        var stats = fs.statSync(getKeyCacheFile(key));

        var mtime = new Date(util.inspect(stats.mtime));

        return Math.round((new Date() - mtime) / 60000);
    };

    /**
     * If needed, fetch the values for city, sunrise time, sunset time. If the values are already
     * in the cache and non-expired, the data will not be requested again this time.
     *
     * @returns {void}
     */
    function fetchCitySunriseSunsetForZip() {
        if (!isCacheExpiredMany(['city', 'sunrise', 'sunset'])) {
            return;
        }

        var response = request("GET", that.config.sun_url),
            reg = /sunrise in ([^,]+)(,\s.*)* is at ([0-9:]+\s*[aApP][mM]); sunset at ([0-9:]+\s*[aApP][mM])/,
            matches = JSON.parse(response.getBody("UTF-8")).Answer.match(reg),
            city = matches[1],
            sunrise = matches[3],
            sunset = matches[4];

        cache('city', city);
        cache('sunrise', sunrise);
        cache('sunset', sunset);
    };

    function fetchWeatherForStation() {
        if (!isCacheExpiredMany([
            'timestamp', 'raw', 'coordinates', 'elevation', 'text',
            'temperature', 'dewpoint', 'windDirection', 'windSpeed',
            'pressure', 'visibility', 'precipitation', 'humidity',
            'feelsLike'
        ])) {
            return;
        }

        var response = request(
            "GET",
            that.config.weather_url.replace('{station}', that.config.station),
            {
                headers: {
                    'user-agent': '@withaspark/weather User',
                },
            }
        );
        response = JSON.parse(response.getBody("UTF-8"));

        cache('timestamp', response.properties.timestamp);
        cache('raw', response.properties.rawMessage);
        cache('coordinates', response.geometry.coordinates);
        cache('elevation', that.metersToFeet(response.properties.elevation.value));
        cache('text', response.properties.textDescription);
        cache('temperature', that.degCtoF(response.properties.temperature.value));
        cache('dewpoint', that.degCtoF(response.properties.dewpoint.value));
        cache('windDirection', response.properties.windDirection.value);
        cache('windSpeed', that.metersPerSecondToMph(response.properties.windSpeed));
        cache('pressure', that.pascalsToMmhg(response.properties.barometricPressure));
        cache('visibility', that.metersToMiles(response.properties.visibility.value));
        cache('precipitation', that.metersToInches(response.properties.precipitationLastHour.value));
        cache('humidity', response.properties.relativeHumidity.value);
        cache('feelsLike', that.degCtoF(response.properties.heatIndex.value));
    }

    init();

    return this;
}

/**
 * Get the zip code.
 *
 * @returns {string}
 */
Weather.prototype.getZip = function () {
    return this.getValue('zip');
};

/**
 * Get the station code.
 *
 * @returns {string}
 */
Weather.prototype.getStation = function () {
    return this.getValue('station');
};

/**
 * Get the locale's city.
 *
 * @returns {string}
 */
Weather.prototype.getCity = function () {
    return this.getValue('city');
};

/**
 * Get the locale's sunrise time.
 *
 * @returns {string}
 */
Weather.prototype.getSunrise = function () {
    return this.getValue('sunrise');
};

/**
 * Get the locale's sunset time.
 *
 * @returns {string}
 */
Weather.prototype.getSunset = function () {
    return this.getValue('sunset');
};

Weather.prototype.getTimestamp = function () {
    return this.getValue('timestamp');
};

Weather.prototype.getRaw = function () {
    return this.getValue('raw');
};

Weather.prototype.getCoordinates = function () {
    return this.getValue('coordinates');
};

Weather.prototype.getElevation = function () {
    return this.getValue('elevation');
};

Weather.prototype.getText = function () {
    return this.getValue('text');
};

Weather.prototype.getTemperature = function () {
    return this.getValue('temperature');
};

Weather.prototype.getDewpoint = function () {
    return this.getValue('dewpoint');
};

Weather.prototype.getWindDirection = function () {
    return this.getValue('windDirection');
};

Weather.prototype.getWindSpeed = function () {
    return this.getValue('windSpeed');
};

Weather.prototype.getPressure = function () {
    return this.getValue('pressure');
};

Weather.prototype.getVisibility = function () {
    return this.getValue('visibility');
};

Weather.prototype.getPrecipitation = function () {
    return this.getValue('precipitation');
};

Weather.prototype.getHumidity = function () {
    return this.getValue('humidity');
};

Weather.prototype.getFeelsLike = function () {
    return this.getValue('feelsLike');
};

/**
 * Convert temperature from degrees Celcius to degrees Fahrenheit.
 *
 * @param {integer|float} temp Temperature in degrees Celcius
 * @returns {float} Temperature in degrees Fahrenheit
 */
Weather.prototype.degCtoF = function (temp) {
    return ((9 / 5) * temp) + 32;
};

/**
 * Convert speed from meters per second to miles per hour.
 *
 * @param {integer|float} speed Speed in m/s
 * @returns {float} Speed in mph
 */
Weather.prototype.metersPerSecondToMph = function (speed) {
    return speed * 2.23694;
};

/**
 * Convert length from meters to inches.
 *
 * @param {integer|float} length Length in m
 * @returns {float} Length in in
 */
Weather.prototype.mToIn = function (length) {
    return length * 3.28084 * 12;
};

/**
 * Convert pressure from Pa to mmHg.
 *
 * @param {integer|float} pressure Pressure in Pa
 * @returns {float} Pressure in mmHg
 */
Weather.prototype.pascalsToMmhg = function (pressure) {
    return pressure * 0.00750062;
};

/**
 * Convert length from meters to miles.
 *
 * @param {integer|float} length Length in m
 * @returns {float} Length in mi
 */
Weather.prototype.metersToMiles = function (length) {
    return this.metersToFeet(length) / 5280;
};

/**
 * Convert length from meters to feet.
 *
 * @param {integer|float} length Length in m
 * @returns {float} Length in ft
 */
Weather.prototype.metersToFeet = function (length) {
    return length * 3.28084;
};

/**
 * Convert length from meters to inches.
 *
 * @param {integer|float} length Length in m
 * @returns {float} Length in in
 */
Weather.prototype.metersToInches = function (length) {
    return this.metersToFeet(length) * 12;
};

Weather.prototype.get = function () {
    return {
        zip: this.getZip(),
        station: this.getStation(),
        city: this.getCity(),
        sunrise: this.getSunrise(),
        sunset: this.getSunset(),
        timestamp: this.getTimestamp(),
        raw: this.getRaw(),
        coordinates: this.getCoordinates(),
        elevation: this.getElevation(),
        text: this.getText(),
        temperature: this.getTemperature(),
        dewpoint: this.getDewpoint(),
        windDirection: this.getWindDirection(),
        windSpeed: this.getWindSpeed(),
        pressure: this.getPressure(),
        visibility: this.getVisibility(),
        precipitation: this.getPrecipitation(),
        humidity: this.getHumidity(),
        feelsLike: this.getFeelsLike()
    };
};

Weather.icons = {
    'sunset': '\uf047',
    'sunrise': '\uf046',
    'day': '\uf00d',
    'night': '\uf02e',

    'tornado': '\uf056',
    'mixed': '\uf017',
    'snow': '\uf01b',
    'rain': '\uf019',
    'fog': '\uf014',
    'vcloud': '\uf013',
    'cloudy': '\uf041',
    'hail': '\uf015',
    'smoke': '\uf062',
    'dust': '\uf063',
    'ice': '\uf015',
    'drizzle': '\uf019',
    'haze': '\uf014',
    'hurricane': '\uf073',
    'lightning': '\uf016',
    'showers': '\uf019',
    'tropstorm': '\uf073',
    'windy': '\uf050',
}



module.exports = Weather;
