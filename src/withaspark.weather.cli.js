#! /usr/bin/env node

var args = require("minimist")(process.argv.slice(2));

var Weather = require("../src/withaspark.weather.js")({
    station: args.station || null,
    cache_dir: args.hasOwnProperty("cache_dir")
        ? args.cache_dir
        : null,
    cache_prefix: args.hasOwnProperty("cache_prefix")
        ? args.cache_prefix
        : null,
    cache_lifetime: args.hasOwnProperty("cache_lifetime")
        ? args.cache_lifetime
        : null,
    unknown: args.hasOwnProperty("unknown")
        ? args.unknown
        : null
});

if (args["_"] == "") {
    console.log(Weather.get());
    return;
}

console.log(Weather.getValue(args["_"][0]));
return;
