var assert = require('assert');
var Weather = require('../src/withaspark.weather.js')({ cache_lifetime: 0 });

assert.ok(Weather.getCity());
assert.ok(Weather.getSunrise());
assert.ok(Weather.getSunset());