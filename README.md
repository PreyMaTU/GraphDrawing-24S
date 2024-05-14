# GraphDrawing-24S

The project is part of the annual [Graph Drawing Contest](https://mozart.diei.unipg.it/gdcontest/2024/creative/)
as an submission for the creative topic in 2024.

## Setup

This project is based on JS and D3, and can be installed via `npm`
or equivalent compatible package managers after pulling the repository.

```bash
npm i
npm run start
```

## Data Sources

- `olympics.json` - The main data set [from the contest](https://mozart.diei.unipg.it/gdcontest/assets/2024/olympics.json)
- `gdp_per_capita.csv` - [CIA Factbook](https://www.cia.gov/the-world-factbook/field/real-gdp-per-capita/country-comparison/)
- `country_codes.csv` - [CIA Factbook](https://www.cia.gov/the-world-factbook/references/country-data-codes/)
- `ioc_codes.csv` - [Wikipedia](https://simple.wikipedia.org/wiki/Comparison_of_IOC,_FIFA,_and_ISO_3166_country_codes) downloaded with [this CSV converter](https://wikitable2csv.ggor.de/).
- `olympic_committees.csv` - Tables from multiple Wikipedia articles merged together
  - [Africa](https://en.wikipedia.org/wiki/Association_of_National_Olympic_Committees_of_Africa)
  - [America](https://en.wikipedia.org/wiki/Panam_Sports)
  - [Asia](https://en.wikipedia.org/wiki/Olympic_Council_of_Asia)
  - [Europe](https://en.wikipedia.org/wiki/European_Olympic_Committees)
  - [Oceania](https://en.wikipedia.org/wiki/Oceania_National_Olympic_Committees)
- `country_display_names.csv` - Custom names for countries with names too bulky to display

## Icons

The icons of countries were taken from [@djaiss](https://github.com/djaiss)/[mapsicon](https://github.com/djaiss/mapsicon).
The needed vector icons were extracted and renamed with their ISO 3166 Alpha2 codes.

The icons of continents are edited versions of Public Domain images taken from [SVG Silh](https://svgsilh.com/).
(Links: [Africa][Africa], [Europe][Europe], [Oceania][Oceania], [Asia][Asia], [America][America] (only parts used))

[Africa]: https://svgsilh.com/image/153088.html
[Europe]: https://svgsilh.com/image/2239723.html
[Oceania]: https://svgsilh.com/image/151644.html
[Asia]: https://svgsilh.com/image/151642.html
[America]: https://svgsilh.com/image/306338.html

The icon for some defunct countries were taken from Wikimedia Commons and edited to fit the icon format.

- [Czechoslovakia](https://commons.wikimedia.org/wiki/File:Flag-map_of_Czechoslovakia.svg) (CC BY-SA 3.0)
- [East Germany](<https://en.wikipedia.org/wiki/File:Flag_map_of_East_Germany_(1949%E2%80%931959).svg>) (CC BY-SA 3.0)
- [Soviet Union](https://commons.wikimedia.org/wiki/File:Map-Flag_of_the_Soviet_Union.svg) (CC BY-SA 3.0)
- [Yugoslavia](https://en.m.wikipedia.org/wiki/File:Yugoslavia_silhouette_grey.svg) (public domain)

## Authors

This project is created by Group 1 of the Graph Drawing Algorithms
course at TU Wien in 2024S. The authors are listed below.

- Philipp Vanek
- Matthias Preymann
- Raphael Kunert
- Michael Eickmeyer

## License

This project's source code is licensed under the MIT license.
The datasets used and included in this repository are licensed
under their respective individual licenses.
