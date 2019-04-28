#! /usr/bin/env node

var Weather = require('../src/withaspark.weather.js')();
var args = process.argv;

if (args.length < 3) {
    console.log(Weather.get());
    return;
}

console.log(Weather.getValue(args[2]));
return;
