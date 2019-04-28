# Weather
Current weather and forecast fetching script

## Install

NPM
```sh
npm install --save @withaspark/weather
```

## Usage

### Script

```js
var Weather = require('path/to/src/withaspark.weather.js')({ station: "KJAX", cache_lifetime: 10 });

console.log(Weather.getTemperature());
// 68

console.log(Weather.getSunrise());
// "6:45 AM"

console.log(Weather.get());
// { station: 'KJAX',
//   sunrise: '2019-04-28T06:47:22.419-04:00',
//   sunset: '2019-04-28T20:03:36.240-04:00',
//   timestamp: '2019-04-28T03:56:00+00:00',
//   raw: 'KJAX 280356Z 00000KT 10SM CLR 17/12 A3003 RMK AO2 SLP169 T01720122 $',
//   coordinates: [ 30.5, -81.7 ],
//   elevation: 29,
//   text: 'Clear',
//   temperature: 62,
//   dewpoint: 53,
//   windDirection: 0,
//   windSpeed: 0,
//   pressure: 762,
//   visibility: 9,
//   precipitation: 0,
//   humidity: 72,
//   feelsLike: 32,
//   alerts: '',
//   sunIcon: \uf02e,
//   conditionIcon: \uf02e,
//   isDay: 0,
//   isNight: 1,
//   isSunrise: 0,
//   isSunset: 0 }
```

### Commandline
```sh
path/to/src/withaspark.weather.cli.js --station=KJAX temperature
# 68

path/to/src/withaspark.weather.cli.js --station=KJAX sunrise
# "6:45 AM"

path/to/src/withaspark.weather.cli.js --station=KJAX
# { station: 'KJAX',
#   sunrise: '2019-04-28T06:47:22.419-04:00',
#   sunset: '2019-04-28T20:03:36.240-04:00',
#   timestamp: '2019-04-28T02:58:00+00:00',
#   raw: 'KJAX 280056Z 15007KT 10SM FEW250 20/11 A2999 RMK AO2 SLP156 T02000111 $',
#   coordinates: '30.5,-81.7',
#   elevation: 30,
#   text: 'Mostly Clear',
#   temperature: 68,
#   dewpoint: 52,
#   windDirection: 150,
#   windSpeed: 0,
#   pressure: 762,
#   visibility: 10,
#   precipitation: 0,
#   humidity: 57,
#   feelsLike: 32,
#   alerts: '',
#   sunIcon: \uf02e,
#   conditionIcon: \uf02e,
#   isDay: 0,
#   isNight: 1,
#   isSunrise: 0,
#   isSunset: 0 }
```


## Options

| Option | Default | Description |
|---|---|---|
| `station` | "KJAX" | Local weather station to find weather for. Choose nearest station from [https://www.aviationweather.gov/docs/metar/stations.txt](https://www.aviationweather.gov/docs/metar/stations.txt). |
| `cache_dir` | "/tmp" | Directory to write cache files too. |
| `cache_prefix` | "withaspark.weather." | Prefix for cache file names. |
| `cache_lifetime` | 5 | Number of minutes to cache results before refetching. |
| `unknown` | "?" | Symbol for unknown value. |


## Properties

| Property | Method | Description |
|---|---|---|
| station | getStation() | Get the weather station data was requested for. E.g., "KJAX". |
| sunrise | getSunrise() | Get the ISO-8601 formatted time of sunrise for the station. E.g., "2019-04-28T06:47:22.419-04:00". |
| sunset | getSunset() | Get the ISO-8601 formatted time of sunset for the station. E.g., "2019-04-28T20:03:36.240-04:00". |
| timestamp | getTimestamp() | Get the timestamp of when the weather data was last fetched. E.g., "2019-04-28T01:58:00+00:00". |
| raw | getRaw() | Get the raw METAR data for the station. |
| coordinates | getCoordinates() | Get the approximate longitude and latitude for the station. |
| elevation | getElevation() | Get the approximate elevation for the station, in feet. |
| text | getText() | Get the brief textual description of current conditions at the station. |
| temperature | getTemperature() | Get the current temperature at the station, in Fahrenheit. |
| dewpoint | getDewpoint() | Get the current dewpoint temperature at the station, in Fahrenheit. |
| windDirection | GetWindDirection() | Get the current wind direction at the station, in degrees. |
| windSpeed | getWindSpeed() | Get the current wind speed at the station, in mph. |
| pressure | getPressure() | Get the current barometric pressure at the station, in mmHg. |
| visibility | getVisibility() | Get the current ground-level visibility at the station, in miles. |
| precipitation | getPrecipitation() | Get the amount of precipitation in the last hour at the station, in inches. |
| humidity | getHumidity() | Get the current relative humidity at the station, in percent. |
| feelsLike | getFeelsLike() | Get the current feels-like temperature at the station, in degrees Fahrenheit. |
| alerts | getAlerts() | Get the current weather advisory types at the station. This will contain a newline delimited list of advisory types. |
| sunIcon | getSunIcon() | Get the unicode character that represents the sun position. To be used with the font [Weather Icons](https://github.com/erikflowers/weather-icons) by [@erikflowers](https://github.com/erikflowers). |
| conditionIcon | getConditionIcon() | Get the unicode character that represents the weather conditions. If it is currently clear with no conditions of note, the icon will default to `sunIcon`. To be used with the font [Weather Icons](https://github.com/erikflowers/weather-icons) by [@erikflowers](https://github.com/erikflowers). |
| isDay | getIsDay() | Get if the sun is currently up at the station. Returns integer value (value of 1 means sun is up). |
| isNight | getIsNight() | Get if the sun is currently down at the station. Returns integer value (value of 1 means sun is down). |
| isSunrise | getIsSunrise() | Get if the sun is currently rising at the station. Returns integer value (value of 1 means the sun is rising). |
| isSunset | getIsSunset() | Get if the sun is currently setting at the station. Returns integer value (value of 1 means the sun is setting). |
