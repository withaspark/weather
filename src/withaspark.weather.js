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
    this.config.sun_url = options.sun_url || "https://api.duckduckgo.com/?q=sunrise%20today&format=json";
    this.config.cache_dir = (options.cache_dir || "/tmp").replace(new RegExp("/" + path.sep + "$/"));
    this.config.cache_prefix = options.cache_prefix || "withaspark.weather.";
    this.config.cache_lifetime = (options.hasOwnProperty("cache_lifetime"))
        ? options.cache_lifetime
        : 5;
    this.data = {};

    /**
     * Get the value for a given key.
     *
     * @param {string} key
     * @returns {*}
     */
    this.getValue = function (key) {
        return cache(key) || that.data[key];
    };

    /**
     * Execute required initialization methods.
     *
     * @returns {void}
     */
    function init() {
        fetchCitySunriseSunsetForZip();
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
        if (!(isCacheExpired('city') || isCacheExpired('sunrise') || isCacheExpired('sunset'))) {
            return;
        }

        var response = request("GET", that.config.sun_url),
            reg = /sunrise in ([^,]+)(,\s.*)* is at ([0-9:]+\s*[aApP][mM]); sunset at ([0-9:]+\s*[aApP][mM])/,
            matches = JSON.parse(response.getBody("UTF-8")).Answer.match(reg),
            city = matches[1],
            sunrise = matches[3],
            sunset = matches[4];

        cache('city', city, that.config.cache_lifetime);
        cache('sunrise', sunrise, that.config.cache_lifetime);
        cache('sunset', sunset, that.config.cache_lifetime);
    };

    init();

    return this;
}

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

module.exports = Weather;
