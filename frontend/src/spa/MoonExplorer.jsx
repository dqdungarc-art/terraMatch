import { useMemo, useState } from "react";
import { ArrowUpRight, Database, MapPin, Search } from "lucide-react";
import LunarGlobe from "./LunarGlobe";
import "./MoonExplorer.css";

const layerCatalog = {
  sites: {
    label: "Locations",
    description: "Reference locations with coordinates and cited sources are listed below.",
    source: "Feature coordinates",
    sourceUrl: "https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf",
  },
  elevation: {
    label: "LOLA elevation",
    description: "LOLA elevation data can support terrain analysis. The raster is not bundled with this prototype.",
    source: "NASA GSFC PGDA · LOLA DEM",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  slope: {
    label: "Slope",
    description: "NASA provides the LOLA Digital Slope Model (LDSM). The raster must be downloaded and aligned before it can be shown on the globe.",
    source: "NASA GSFC PGDA · LOLA Slope Map",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  illumination: {
    label: "Illumination",
    description: "Illumination duration can be evaluated by terrain and time; its raster layer has not been integrated.",
    source: "NASA GSFC PGDA · LOLA products",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  psr: {
    label: "Permanently shadowed regions",
    description: "The PSR layer requires a raster and a defined illumination-time criterion. This preview does not show PSR boundaries.",
    source: "NASA GSFC PGDA · South Pole data",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/81",
  },
};

function formatCoordinate(value, positive, negative) {
  const number = Number(value);
  return `${Math.abs(number).toFixed(4)}°${number < 0 ? negative : positive}`;
}

export default function MoonExplorer({ sites = [], selectedSiteId, onSelect }) {
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeLayer, setActiveLayer] = useState("sites");

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en");
    return sites.filter((site) => {
      const matchesFilter = siteFilter === "all"
        || (siteFilter === "south-pole" && Number(site.latitude) < -70)
        || (siteFilter === "heritage" && site.category === "heritage");
      const matchesQuery = !normalizedQuery
        || `${site.name} ${site.reference ?? ""} ${site.kind ?? ""}`.toLocaleLowerCase("en").includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [sites, query, siteFilter]);

  const selectedSite = filteredSites.find((site) => site.site_id === selectedSiteId) ?? filteredSites[0];
  const activeLayerInfo = layerCatalog[activeLayer];
  const southPoleCount = filteredSites.filter((site) => Number(site.latitude) < -70).length;

  const selectSite = (site) => onSelect?.(site);

  return (
    <section className="moon-explorer" aria-label="Explore the Moon on a 3D globe">
      <div className="polar-toolbar">
        <label className="polar-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search lunar locations</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search locations…" />
        </label>
        <div className="polar-filters" role="group" aria-label="Filter locations">
          {[ ["all", "All"], ["south-pole", "South pole"], ["heritage", "Landing sites"] ].map(([value, label]) => (
            <button key={value} type="button" className={siteFilter === value ? "active" : ""} aria-pressed={siteFilter === value} onClick={() => setSiteFilter(value)}>{label}</button>
          ))}
        </div>
        <label className="explorer-marker-toggle"><input type="checkbox" checked={showMarkers} onChange={(event) => setShowMarkers(event.target.checked)} /> Show markers</label>
        <span className="explorer-count">{filteredSites.length} locations</span>
      </div>

      <div className="moon-explorer-layout">
        <div className="moon-globe-column">
          <LunarGlobe sites={filteredSites} selectedSiteId={selectedSite?.site_id} onSelect={selectSite} showMarkers={showMarkers} />
          <div className="south-pole-context">
            <span className="south-pole-context-icon"><MapPin size={15} /></span>
            <div><strong>South pole on the global view</strong><p>{southPoleCount} south-polar reference points are shown on the globe. Select a location from the list or click its marker to rotate to it.</p></div>
          </div>
        </div>

        <aside className="moon-explorer-inspector" aria-label="Location details">
          <div className="polar-layer-picker">
            <div className="polar-card-heading"><span className="section-kicker">Data layers</span><span className="layer-status-pill">Open sources</span></div>
            <div className="layer-options" role="group" aria-label="Choose data layer">
              {Object.entries(layerCatalog).map(([key, layer]) => (
                <button key={key} type="button" className={activeLayer === key ? "active" : ""} aria-pressed={activeLayer === key} onClick={() => setActiveLayer(key)}>{layer.label}</button>
              ))}
            </div>
            <p>{activeLayerInfo.description}</p>
            <a href={activeLayerInfo.sourceUrl} target="_blank" rel="noreferrer">{activeLayerInfo.source} <ArrowUpRight size={13} /></a>
            {activeLayer !== "sites" && <div className="layer-status" role="status"><Database size={15} /><span><strong>{activeLayerInfo.label} is not loaded.</strong> A georeferenced raster is required to overlay this layer on the globe.</span></div>}
          </div>

          <div className="polar-selected" aria-live="polite" aria-atomic="true">
            <div className="polar-card-heading"><span className="section-kicker">Selected location</span><span className="verified-pill">Source cited</span></div>
            {selectedSite ? <>
              <h3><MapPin size={16} /> {selectedSite.name}</h3>
              <p className="polar-reference">{selectedSite.reference} · {selectedSite.kind}</p>
              <p className="polar-coordinates"><span>Latitude {formatCoordinate(selectedSite.latitude, "N", "S")}</span><span>Longitude {formatCoordinate(selectedSite.longitude, "E", "W")}</span></p>
              <p className="polar-site-summary">{selectedSite.summary}</p>
              <small className="polar-source-note">{selectedSite.sourceNote}</small>
              <a className="polar-source-link" href={selectedSite.sourceUrl} target="_blank" rel="noreferrer">Source: {selectedSite.source} <ArrowUpRight size={13} /></a>
            </> : <p>No matching locations. Try changing the filter or search term.</p>}
          </div>

          <div className="explorer-site-list">
            <div className="polar-card-heading"><span className="section-kicker">Location list</span><span>{filteredSites.length}</span></div>
            <div className="explorer-site-grid">
              {filteredSites.map((site) => (
                <button key={site.site_id} type="button" className={selectedSite?.site_id === site.site_id ? "active" : ""} onClick={() => selectSite(site)} aria-pressed={selectedSite?.site_id === site.site_id}>
                  <span><strong>{site.name}</strong><small>{Number(site.latitude) < -70 ? "South polar region" : "Historic landing site"} · {site.reference}</small></span><MapPin size={14} aria-hidden="true" />
                </button>
              ))}
              {!filteredSites.length && <p>No matching locations.</p>}
            </div>
          </div>
          <p className="polar-data-note">Coordinates mark reference points in the cited sources; they do not define terrain boundaries. The globe uses a surface image; scientific raster layers have not been integrated.</p>
        </aside>
      </div>
    </section>
  );
}

