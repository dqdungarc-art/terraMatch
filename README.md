# TerraMatch · ACS.AEROTECH

Prototype for exploring Earth analog sites for Lunar Terrain Vehicle (LTV) trials in the South Pole–Aitken Basin.

## Local run

On Windows, double-click [Run-Local.bat](Run-Local.bat). If frontend dependencies are installed, it starts Vite in development mode. Otherwise, it serves the checked-in static preview from `frontend/dist`.

For development mode, install Node.js 20.19+ and run `npm ci` in `frontend`.

## Current prototype scope

- Three LTV operation modes: crewed traverse, autonomous scouting, and wheel/suspension testing.
- Six illustrative candidate analog regions with an explainable G-GD score breakdown.
- H3 resolution 4 candidate cells and a 10 km elevation profile using Open-Meteo elevation data.
- Candidate terrain and scores are illustrative inputs from the team's technical design document, not validated field measurements.

NASA POWER, SoilGrids, Macrostrat, and land-cover integration remain planned work.

## Repository layout

- `frontend/src/spa`: ACS.AEROTECH SPA Basin explorer.
- `backend`: TerraMatch API and geospatial data services.
- `Run-Local.bat`: Windows one-click local launcher.
- `REVIEW.md`: implementation notes and data limitations.
