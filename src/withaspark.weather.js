"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");
const moment = require("moment");
const SunCalc = require("suncalc");
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
    this.config.station = options.station || "KJAX";
    this.config.weather_url = "https://api.weather.gov/stations/{station}/observations/latest";
    this.config.alert_url = "https://api.weather.gov/alerts/active?point={point}";
    this.config.cache_dir = (options.cache_dir || "/tmp").replace(new RegExp("/" + path.sep + "$/"));
    this.config.cache_prefix = options.cache_prefix || ("withaspark.weather." + this.config.station + ".");
    this.config.cache_lifetime = (options.hasOwnProperty("cache_lifetime"))
        ? options.cache_lifetime
        : 5;
    this.config.unknown = options.unknown || '?';
    this.config.sunrise_buffer = 15;
    this.data = {};
    this.setNow();

    cache('station', this.config.station);

    this.icons = {
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
        'fire': '\uf0c7',
        'smoke': '\uf062',
        'dust': '\uf063',
        'ice': '\uf015',
        'drizzle': '\uf019',
        'haze': '\uf014',
        'hurricane': '\uf073',
        'lightning': '\uf016',
        'showers': '\uf019',
        'tropstorm': '\uf073',
        'windy': '\uf050'
    };

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
                : null,
            value = null;

        if (cached !== null) {
            value = cached;
        }

        if (saved !== null) {
            value = saved;
        }

        // Round all numbers to integers
        if (that.isNumber(value)) {
            return parseInt(value);
        }

        // If unknown or NaN
        if (value === null || value !== value || value === 'NaN') {
            return that.config.unknown;
        }

        return value;
    };

    /**
     * Execute required initialization methods.
     *
     * @returns {void}
     */
    function init() {
        fetchWeatherForStation();
        fetchAlerts();

        calcSecondaryProperties();
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
                    return console.error(err);
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
     * Fetch weather conditions for a station.
     *
     * @returns {void}
     */
    function fetchWeatherForStation() {
        if (!isCacheExpiredMany([
            'station',
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
        cache(
            'coordinates',
            response.geometry.coordinates
                ? response.geometry.coordinates[1] + ',' + response.geometry.coordinates[0]
                : null
        );
        cache('elevation', that.metersToFeet(response.properties.elevation.value));
        cache('text', response.properties.textDescription);
        cache('temperature', that.degCtoF(response.properties.temperature.value));
        cache('dewpoint', that.degCtoF(response.properties.dewpoint.value));
        cache('windDirection', response.properties.windDirection.value);
        cache('windSpeed', that.metersPerSecondToMph(response.properties.windSpeed.value));
        cache('pressure', that.pascalsToMmhg(response.properties.barometricPressure.value));
        cache('visibility', that.metersToMiles(response.properties.visibility.value));
        cache('precipitation', that.metersToInches(response.properties.precipitationLastHour.value));
        cache('humidity', response.properties.relativeHumidity.value);
        cache('feelsLike', that.degCtoF(response.properties.heatIndex.value));
    }

    /**
     * Fetch weather advisories and alerts.
     *
     * @returns {void}
     */
    function fetchAlerts() {
        if (!isCacheExpiredMany(['alerts'])) {
            return;
        }

        var response = request(
            "GET",
            that.config.alert_url.replace('{point}', that.getCoordinates()),
            {
                headers: {
                    'user-agent': '@withaspark/weather User',
                },
            }
        );
        response = JSON.parse(response.getBody("UTF-8"));

        var events = [];
        for (var i = 0; i < response.features.length; i++) {
            events.push(response.features[i].properties.event);
        }
        cache('alerts', events.join("\n"));
    }

    /**
     * Calculate secondary properties that are derived from primary properties.
     *
     * @returns {void}
     */
    function calcSecondaryProperties() {
        var now = that.now,
            coordinates = that.getCoordinates().split(",");

        if (coordinates && coordinates.length == 2) {
            var suntimes = SunCalc.getTimes(now, coordinates[0], coordinates[1]);
            that.data.sunrise = moment(suntimes.sunrise).toISOString(true);
            that.data.sunset = moment(suntimes.sunset).toISOString(true);
        }

        that.data.isDay = that.getIsDay();
        that.data.isNight = that.getIsNight();
        that.data.isSunrise = that.getIsSunrise();
        that.data.isSunset = that.getIsSunset();
        that.data.sunIcon = that.getSunIcon();
        that.data.conditionIcon = that.getConditionIcon();
    }

    init();

    return this;
}

/**
 * Get the internal now time.
 *
 * @returns {Moment}
 */
Weather.prototype.getNow = function () {
    return this.now;
};

/**
 * Set the internal now time. If no time is provided, will use current time.
 *
 * @param {Moment} now (optional)
 * @returns {void}
 */
Weather.prototype.setNow = function (now) {
    if (typeof now === 'undefined') {
        now = moment();
    }

    this.now = now;
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
 * Is the current time during the day.
 *
 * @return {integer}
 */
Weather.prototype.getIsDay = function () {
    var now = this.getNow(),
        sunrise = moment(this.getSunrise()),
        sunset = moment(this.getSunset());

    if (now.isBetween(sunrise, sunset, null, '[]')) {
        return 1;
    }

    return 0;
};

/**
 * Is the current time during the night.
 *
 * @return {integer}
 */
Weather.prototype.getIsNight = function () {
    return 1 - this.getIsDay();
};

/**
 * Is the given time around sunrise.
 *
 * @return {integer}
 */
Weather.prototype.getIsSunrise = function () {
    var now = this.getNow(),
        sunrise = moment(this.getSunrise());

    if (now.isBetween(moment(sunrise).subtract(this.config.sunrise_buffer, 'minutes'), moment(sunrise).add(this.config.sunrise_buffer, 'minutes'), null, '[]')) {
        return 1;
    }

    return 0;
};

/**
 * Is the given time around sunset.
 *
 * @return {integer}
 */
Weather.prototype.getIsSunset = function () {
    var now = this.getNow(),
        sunset = moment(this.getSunset());

    if (now.isBetween(moment(sunset).subtract(this.config.sunrise_buffer, 'minutes'), moment(sunset).add(this.config.sunrise_buffer, 'minutes'), null, '[]')) {
        return 1;
    }

    return 0;
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

/**
 * Get the weather last update time.
 *
 * @returns {string}
 */
Weather.prototype.getTimestamp = function () {
    return this.getValue('timestamp');
};

/**
 * Get the raw METAR data.
 *
 * @returns {string}
 */
Weather.prototype.getRaw = function () {
    return this.getValue('raw');
};

/**
 * Get the latitude-longitude coordinates.
 *
 * @returns {string}
 */
Weather.prototype.getCoordinates = function () {
    return this.getValue('coordinates');
};

/**
 * Get the elevation of the station.
 *
 * @return {integer}
 */
Weather.prototype.getElevation = function () {
    return this.getValue('elevation');
};

/**
 * Get a brief textual description of conditions.
 *
 * @returns {string}
 */
Weather.prototype.getText = function () {
    return this.getValue('text');
};
/**
 * Get the temperature at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getTemperature = function () {
    return this.getValue('temperature');
};

/**
 * Get the dewpoint temperature at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getDewpoint = function () {
    return this.getValue('dewpoint');
};

/**
 * Get the wind direction at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getWindDirection = function () {
    return this.getValue('windDirection');
};

/**
 * Get the wind speed at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getWindSpeed = function () {
    return this.getValue('windSpeed');
};

/**
 * Get the barometric pressure at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getPressure = function () {
    return this.getValue('pressure');
};

/**
 * Get the visibility distance at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getVisibility = function () {
    return this.getValue('visibility');
};

/**
 * Get the amount of rainfall in the previous 1 hour at the station.
 *
 * @returns {string}
 */
Weather.prototype.getPrecipitation = function () {
    return this.getValue('precipitation');
};

/**
 * Get the relative humidity at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getHumidity = function () {
    return this.getValue('humidity');
};

/**
 * Get the feels-like temperature at the station.
 *
 * @returns {integer}
 */
Weather.prototype.getFeelsLike = function () {
    return this.getValue('feelsLike');
};

/**
 * Get the weather advisory event types at the station.
 *
 * @returns {string} A newline delimited list of advisory event types
 */
Weather.prototype.getAlerts = function () {
    return this.getValue('alerts');
};

/**
 * Gets an icon for the sun position (day/night/rising/setting).
 *
 * @returns {char} Character code of icon for weather icon font
 */
Weather.prototype.getSunIcon = function () {
    if (this.getIsSunset()) {
        return this.icons.sunset;
    }

    if (this.getIsSunrise()) {
        return this.icons.sunrise;
    }

    if (this.getIsDay()) {
        return this.icons.day;
    }

    return this.icons.night;
}

/**
 * Gets an icon for the conditions.
 *
 * @returns {char} Character code of the icon for the weather icon font
 */
Weather.prototype.getConditionIcon = function () {
    var icon = this.getSunIcon(),
        condition = this.getAlerts() + "\n" + this.getText();

    if (condition.match(/trop.*storm/i)) {
        return this.icons.tropstorm;
    }

    if (condition.match(/hurricane/i)) {
        return this.icons.hurricane;
    }

    if (condition.match(/tornado/i)) {
        return this.icons.tornado;
    }

    if (condition.match(/thunderstorm/i)) {
        return this.icons.lightning;
    }

    if (condition.match(/(mixed|freezing|sleet)/i)) {
        return this.icons.mixed;
    }

    if (condition.match(/(blizzard|snow)/i)) {
        return this.icons.snow;
    }

    if (condition.match(/drizzle/i)) {
        return this.icons.drizzle;
    }

    if (condition.match(/showers/i)) {
        return this.icons.showers;
    }

    if (condition.match(/hail/i)) {
        return this.icons.hail;
    }

    if (condition.match(/dust/i)) {
        return this.icons.dust;
    }

    if (condition.match(/fog/i)) {
        return this.icons.fog;
    }

    if (condition.match(/haze/i)) {
        return this.icons.haze;
    }

    if (condition.match(/fire/i)) {
        return this.icons.fire;
    }

    if (condition.match(/smok(e|y)/i)) {
        return this.icons.smoke;
    }

    if (condition.match(/bluster|windy/i)) {
        return this.icons.window;
    }

    if (condition.match(/mostly cloudy/i)) {
        return this.icons.vcloud;
    }

    if (condition.match(/cloudy/i)) {
        return this.icons.cloudy;
    }

    return icon;
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

/**
 * Determines if value is not a number.
 *
 * @param {*} value
 * @returns {boolean}
 */
Weather.prototype.isNumber = function (value) {
    return (!isNaN(parseFloat(value)) && isFinite(value));
};



/**
 * Get all of the most important properties.
 *
 * @returns {object}
 */
Weather.prototype.get = function () {
    return {
        station: this.getStation(),
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
        feelsLike: this.getFeelsLike(),
        alerts: this.getAlerts(),
        sunIcon: this.getSunIcon(),
        conditionIcon: this.getConditionIcon(),
        isDay: this.getIsDay(),
        isNight: this.getIsNight(),
        isSunrise: this.getIsSunrise(),
        isSunset: this.getIsSunset()
    };
};



module.exports = Weather;
