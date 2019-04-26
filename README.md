# Weather
Current weather and forecast fetching script

## Install

NPM
```sh
npm install --save @withaspark/weather
```

## Usage

```js
var Weather = require('../src/withaspark.weather.js')({ cache_lifetime: 10 });

console.log(Weather.getCity());
// "Jacksonville"

console.log(Weather.getSunrise());
// "6:46 AM"

console.log(Weather.getSunset());
// "7:59 PM"
```

## Options

| Option | Default | Description |
|---|---|---|
| `zip` | 32202 | Zip code to find weather for. |
| `cache_dir` | "/tmp" | Directory to write cache files too. |
| `cache_prefix` | "withaspark.weather." | Prefix for cache file names. |
| `cache_lifetime` | 5 | Number of minutes to cache results before refetching. |
