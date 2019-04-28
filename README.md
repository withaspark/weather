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
var Weather = require('../src/withaspark.weather.js')({ cache_lifetime: 10 });

console.log(Weather.getCity());
// "Jacksonville"

console.log(Weather.getSunrise());
// "6:46 AM"

console.log(Weather.getSunset());
// "7:59 PM"
```

### Commandline
```sh
path/to/withaspark.weather.cli.js temperature
# 68

path/to/withaspark.weather.cli.js sunrise
# "6:45 AM"

path/to/withaspark.weather.cli.js
# { city: 'Saint Augustine',
#   sunrise: '6:45 AM',
#   sunset: '8:00 PM',
#   timestamp: '2019-04-28T00:56:00+00:00',
#   raw: 'KJAX 280056Z 15007KT 10SM FEW250 20/11 A2999 RMK AO2 SLP156 T02000111 $',
#   coordinates: '-81.7,30.5',
#   elevation: '29.52756',
#   text: 'Mostly Clear',
#   temperature: '68',
#   dewpoint: '51.98000000000005',
#   windDirection: '150',
#   windSpeed: 'NaN',
#   pressure: 'NaN',
#   visibility: '9.997862803030303',
#   precipitation: '0',
#   humidity: '56.53567747610329',
#   feelsLike: '32' }
```


## Options

| Option | Default | Description |
|---|---|---|
| `zip` | 32202 | Zip code to find weather for. |
| `station` | "KJAX" | Local weather station to find weather for. Choose nearest station from [https://www.aviationweather.gov/docs/metar/stations.txt](https://www.aviationweather.gov/docs/metar/stations.txt). |
| `cache_dir` | "/tmp" | Directory to write cache files too. |
| `cache_prefix` | "withaspark.weather." | Prefix for cache file names. |
| `cache_lifetime` | 5 | Number of minutes to cache results before refetching. |
| `unknown` | "?" | Symbol for unknown value. |
