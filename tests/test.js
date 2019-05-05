const assert = require("assert");
const moment = require("moment");
const Weather = require("../src/withaspark.weather.js")({ station: "KJAX", cache_lifetime: 0 });

assert.ok(Weather.get());
assert.ok(Weather.getStation());
assert.ok(Weather.getSunrise());
assert.ok(Weather.getSunset());
assert.ok(Weather.getTimestamp());
assert.ok(Weather.getRaw());
assert.ok(Weather.getCoordinates());
assert.ok(Weather.getElevation());
assert.ok(Weather.getText());
assert.ok(Weather.getTemperature());
assert.ok(Weather.getDewpoint());
// assert.ok(Weather.getWindDirection());
// assert.ok(Weather.getWindSpeed());
assert.ok(Weather.getPressure());
assert.ok(Weather.getVisibility());
// assert.ok(Weather.getPrecipitation());
// assert.ok(Weather.getHumidity());
assert.ok(Weather.getFeelsLike());

(function testBeforeSunrise() {
    var sunrise = moment(Weather.getSunrise()),
        now = moment(sunrise).subtract(120, "minutes");

    Weather.setNow(now);

    assert.equal(0, Weather.getIsDay());
    assert.equal(1, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    Weather.setNow();
})();

(function testDuringSunrise() {
    var sunrise = moment(Weather.getSunrise()),
        now = moment(sunrise).subtract(1, "minutes");

    Weather.setNow(now);

    assert.equal(0, Weather.getIsDay());
    assert.equal(1, Weather.getIsNight());
    assert.equal(1, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    now = moment(sunrise);

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(1, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    now = moment(sunrise).add(1, "minutes");

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(1, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    Weather.setNow();
})();

(function testAfterSunrise() {
    var sunrise = moment(Weather.getSunrise()),
        now = moment(sunrise).add(120, "minutes");

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    Weather.setNow();
})();

(function testBeforeSunset() {
    var sunset = moment(Weather.getSunset()),
        now = moment(sunset).subtract(120, "minutes");

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    Weather.setNow();
})();

(function testDuringSunset() {
    var sunset = moment(Weather.getSunset()),
        now = moment(sunset).subtract(1, "minutes");

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(1, Weather.getIsSunset());

    now = moment(sunset);

    Weather.setNow(now);

    assert.equal(1, Weather.getIsDay());
    assert.equal(0, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(1, Weather.getIsSunset());

    now = moment(sunset).add(1, "minutes");

    Weather.setNow(now);

    assert.equal(0, Weather.getIsDay());
    assert.equal(1, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(1, Weather.getIsSunset());

    Weather.setNow();
})();

(function testAfterSunset() {
    var sunset = moment(Weather.getSunset()),
        now = moment(sunset).add(120, "minutes");

    Weather.setNow(now);

    assert.equal(0, Weather.getIsDay());
    assert.equal(1, Weather.getIsNight());
    assert.equal(0, Weather.getIsSunrise());
    assert.equal(0, Weather.getIsSunset());

    Weather.setNow();
})();
