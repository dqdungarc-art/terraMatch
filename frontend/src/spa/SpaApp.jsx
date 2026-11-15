import { useEffect, useMemo, useState } from "react";
import { latLngToCell } from "h3-js";
import {
  ArrowRight, ArrowUpRight, Check, ChevronRight, Compass, Database,
  Globe2, Hexagon, Info, MapPin, Menu, Moon, ShieldAlert, SlidersHorizontal,
  Sparkles, X,
} from "lucide-react";
import BasinMap from "./BasinMap";
import TraverseProfile from "./TraverseProfile";
import { candidates, lunarSites, metricLabels, modes, target } from "./data";
import { evaluateCandidate } from "./scoring";
import MoonExplorer from "./MoonExplorer";
import "./SpaApp.css";

const formatScore = (score) => `${score}%`;

const dataSources = [
  { name: "NASA Moon Trek · LRO LOLA & WAC", description: "South-polar terrain, slope, illumination, and mosaic tiles load directly when the lunar map is opened.", url: "https://trek.nasa.gov/tiles/Moon/SP/LRO_LOLA_ClrShade_SPole75_30mp_v04/1.0.0/WMTSCapabilities.xml", category: "Lunar map" },
  { name: "NASA PDS · LRO LOLA LDEM_16", description: "Elevation model used to calculate relative elevation, slope, roughness, and local relief at reference sites.", url: "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.img", category: "Lunar terrain" },
  { name: "NASA NTRS & NSSDC · site coordinates", description: "Coordinates for reference sites, Apollo 11, and Luna 17 in the application's location catalog.", url: "https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf", category: "Location catalog" },
  { name: "Natural Earth · land polygons", description: "Land boundaries used as the basemap for Earth analog regions.", url: "https://www.naturalearthdata.com/", category: "Earth map" },
  { name: "Open-Meteo · Copernicus DEM GLO-90", description: "On-demand elevation API used to create a 10 km profile for the selected candidate region.", url: "https://open-meteo.com/en/docs/elevation-api", category: "Earth terrain" },
  { name: "NASA EOSDIS / LP DAAC · SRTMGL1.003", description: "SRTM terrain source used by the server pipeline to index Earth analog sites.", url: "https://www.earthdata.nasa.gov/data/instruments/srtm", category: "Data pipeline" },
  { name: "NASA POWER · Daily API", description: "Air temperature and solar radiation observations for the Earth-data enrichment pipeline when enabled.", url: "https://power.larc.nasa.gov/", category: "Data pipeline" },
  { name: "NASA AppEEARS · MODIS", description: "MODIS land-surface temperature data that the Earth data pipeline can query.", url: "https://appeears.earthdatacloud.nasa.gov/", category: "Data pipeline" },
  { name: "NASA PDS · LRO Diviner PRP", description: "South-polar temperature product used by the server-side lunar data loader.", url: "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/", category: "Data pipeline" },
];

const deviceReferenceSpecs = [
  {
    id: "ltv", name: "Lunar Terrain Vehicle (LTV)", status: "NASA Moon Base reference specifications; commercial configurations may differ.",
    source: "NASA · Moon Base, Lunar Terrain Vehicles", url: "https://www.nasa.gov/wp-content/uploads/2026/03/2-building-the-moon-base.pdf",
    values: [["Dimensions", "2 × 1.7 × 1.9 m"], ["Maximum rover mass", "500 kg"], ["Maximum speed", "10 km/h"], ["Design slope", "±20°"], ["Darkness tolerance", "Up to 150 hours"], ["Operation", "Crewed / autonomous"]],
  },
  {
    id: "trident", name: "TRIDENT Drill (VIPER design)", status: "VIPER drill design reference; this does not imply the drill is fitted to the LTV.",
    source: "NASA · VIPER Technical Briefing, TRIDENT", url: "https://assets.science.nasa.gov/content/dam/science/psd/lunar-science/documents/2025-02-13_VIPER_Updated_Technical_Briefing_Presentation-Shared.pdf",
    values: [["Maximum drilling depth", "1,020 mm"], ["Bit diameter", "25.4 mm"], ["Auger speed", "90 rpm"], ["Average power", "50–150 W"], ["Percussion energy", "2 J/blow"], ["Sampling interval", "10 cm"]],
  },
];

function MetricBars({ result }) {
  const metrics = [
    ["slope", `${result.slopeDeg}°`],
    ["roughness", result.roughnessTRI.toFixed(2)],
    ["geology", result.maficBrecciaScore.toFixed(2)],
    ["albedoLight", result.surfaceAlbedo.toFixed(2)],
    ["thermalShock", `${result.skinThermalShockC}°C`],
    ["horizonOcclusion", `${result.horizonOcclusionDeg}°`],
  ];

  return (
    <div className="metric-list">
      {metrics.map(([key, value]) => (
        <div className="metric-line" key={key}>
          <div className="metric-line-label"><span>{metricLabels[key]}</span><strong>{value}</strong></div>
          <div className="metric-track"><span style={{ width: `${result.breakdown[key]}%` }} /></div>
          <small>{result.breakdown[key]}%</small>
        </div>
      ))}
    </div>
  );
}

function CandidateList({ ranked, selectedId, onSelect }) {
  return (
    <section className="panel candidate-panel" aria-labelledby="candidate-title">
      <div className="panel-heading"><div><span className="section-kicker">EARTH TERRAIN ANALOGS</span><h2 id="candidate-title">Ranked candidate sites</h2></div><span className="count-pill">6 regions</span></div>
      <div className="candidate-list">
        {ranked.map((site, index) => (
          <button
            type="button"
            className={`candidate-row ${selectedId === site.id ? "selected" : ""}`}
            key={site.id}
            onClick={() => onSelect(site.id)}
            aria-pressed={selectedId === site.id}
          >
            <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="candidate-identity"><strong>{site.name}</strong><small>{site.place}</small></span>
            <span className="candidate-score">{formatScore(site.score)}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="panel-footnote"><Info size={14} /> Scores use the illustrative dataset from the team's technical design.</p>
    </section>
  );
}

function SiteDetail({ site, modeKey }) {
  const h3Index = latLngToCell(site.lat, site.lon, 4);
  const lowSun = site.minSunAngleDeg > 10;
  return (
    <section className="panel detail-panel" aria-labelledby="detail-title">
      <div className="panel-heading">
        <div><span className="section-kicker">SELECTED GRID CELL</span><h2 id="detail-title">{site.name}</h2></div>
        <span className="large-score">{site.score}<small>%</small></span>
      </div>
      <div className="site-subtitle"><MapPin size={14} /> {site.place} <span>·</span> {site.lat.toFixed(3)}°, {site.lon.toFixed(3)}°</div>
      <p className="site-description">{site.description}</p>
      <div className="detail-meta">
        <div><span>H3 cell</span><strong>{h3Index}</strong></div>
        <div><span>Logistics</span><strong>{site.logisticsTier}</strong></div>
        <div><span>Test window</span><strong>{site.bestTestingWindow}</strong></div>
      </div>
      <div className="subsection-heading"><h3>Similarity criteria</h3><span>G‑GD · {modes[modeKey].short}</span></div>
      <MetricBars result={site} />
      {site.rolloverHazard && <div className="hazard"><ShieldAlert size={17} /><span>Slope exceeds 20°. A 0.65 safety factor has been applied to the score.</span></div>}
      {lowSun && <div className="mitigation"><Sparkles size={16} /><span>To test sensors at low solar angles, choose a time near sunrise or sunset and measure the illumination angle at the site.</span></div>}
      <p className="panel-footnote">Geology, albedo, and thermal values in this catalog are sample data from the team. Scores are not verified measurements for this H3 cell.</p>
    </section>
  );
}

function TargetCard() {
  return (
    <section className="target-card">
      <div className="target-graphic"><img src="/media/lunar-disk.jpg" alt="" /></div>
      <div className="target-content">
        <span className="section-kicker">MISSION TARGET / MOON</span>
        <h2>{target.name}</h2>
        <p>Test the Lunar Terrain Vehicle in south-polar basin terrain, mafic rock, and low-angle sunlight.</p>
        <div className="target-tags"><span><Moon size={13} /> {target.region}</span><span><Compass size={13} /> NASA LTV</span><a href="https://science.nasa.gov/moon/daily-moon-guide/" target="_blank" rel="noreferrer">Lunar imagery · NASA SVS <ArrowUpRight size={12} /></a></div>
      </div>
    </section>
  );
}

export default function SpaApp() {
  const [modeKey, setModeKey] = useState("CREWED_TRAVERSE");
  const [selectedId, setSelectedId] = useState(candidates[1].id);
  const [selectedLunarSiteId, setSelectedLunarSiteId] = useState("shackleton-rim");
  const [activeSection, setActiveSection] = useState(() => {
    const initialSection = window.location.hash.slice(1);
    return ["overview", "mission", "lunar-sites", "candidates", "analysis", "sources"].includes(initialSection)
      ? initialSection
      : "overview";
  });
  const [marsOpen, setMarsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const ranked = useMemo(
    () => candidates.map((candidate) => ({ ...candidate, ...evaluateCandidate(candidate, modeKey) }))
      .sort((a, b) => b.score - a.score),
    [modeKey],
  );
  const selected = ranked.find((candidate) => candidate.id === selectedId) ?? ranked[0];
  const dualSite = ranked[0].score < 85
    ? {
      mechanics: [...ranked].sort((a, b) => (b.breakdown.roughness + b.breakdown.geology) - (a.breakdown.roughness + a.breakdown.geology))[0],
      optics: [...ranked].sort((a, b) => (b.breakdown.albedoLight + b.breakdown.horizonOcclusion) - (a.breakdown.albedoLight + a.breakdown.horizonOcclusion))[0],
    }
    : null;
  const navigation = [
    { id: "overview", label: "Overview", icon: Globe2 },
    { id: "mission", label: "SPA target", icon: Moon },
    { id: "lunar-sites", label: "Moon map", icon: MapPin },
    { id: "candidates", label: "Terrain analog survey", icon: Hexagon },
    { id: "analysis", label: "Equipment specifications", icon: SlidersHorizontal },
    { id: "sources", label: "Methods & data sources", icon: Database },
  ];

  useEffect(() => {
    let frame = 0;
    const syncActiveSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const marker = window.innerHeight * 0.34;
        const sections = navigation
          .map(({ id }) => ({ id, element: document.getElementById(id) }))
          .filter(({ element }) => element);
        const passedSections = sections
          .map(({ id, element }) => ({ id, top: element.getBoundingClientRect().top }))
          .filter(({ top }) => top <= marker)
          .sort((a, b) => a.top - b.top);
        const nextSection = passedSections.at(-1)?.id ?? sections[0]?.id ?? "overview";
        setActiveSection((current) => current === nextSection ? current : nextSection);
      });
    };

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);
    window.addEventListener("hashchange", syncActiveSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  return (
    <div className="spa-shell">
      <aside className={`spa-sidebar ${mobileNavOpen ? "open" : ""}`}>
        <a className="spa-brand" href="#overview" onClick={() => setActiveSection("overview")}><span><Hexagon size={22} /></span><strong>ACS<span>.</span>AEROTECH</strong></a>
        <p className="sidebar-caption">Mission control</p>
        <nav aria-label="Research navigation">
          {navigation.map(({ id, label, icon: Icon }) => <a key={id} className={activeSection === id ? "active" : ""} href={`#${id}`} aria-current={activeSection === id ? "location" : undefined} onClick={() => { setActiveSection(id); setMobileNavOpen(false); }}><Icon size={17} /> {label}</a>)}
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" /> Technical preview <small>NASA Space Apps Challenge 2026</small></div>
      </aside>
      <main className="spa-main" id="overview">
        <header className="spa-topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={21} /></button>
          <div className="topbar-route">Workspace <ChevronRight size={13} /> <strong>SPA Basin analog explorer</strong></div>
          <div className="topbar-right"><span className="preview-badge"><span /> Design prototype</span><span className="project-name">PROJECT ACS / 2026</span></div>
        </header>
        <div className="spa-content">
          <div className="page-intro">
            <div><span className="eyebrow"><span /> EARTH TERRAIN ANALOG DISCOVERY</span><h1>Find Earth terrain<br /><em>to test the LTV.</em></h1><p>Identify regions with terrain similar to the South Pole–Aitken Basin and suited to the Lunar Terrain Vehicle's operating requirements.</p></div>
            <button className="mars-button" onClick={() => setMarsOpen(true)}><span>Mars cross-compatible</span> Jezero Crater <ArrowUpRight size={16} /></button>
          </div>
          <div id="mission"><TargetCard /></div>
          <div className="section-title lunar-section-title" id="lunar-sites"><div><span className="section-kicker">MISSION CONTEXT / MOON</span><h2>Explore the Moon</h2></div><p>Rotate the 3D globe to explore the Moon and its south-polar reference sites.</p></div>
          <MoonExplorer sites={lunarSites} selectedSiteId={selectedLunarSiteId} onSelect={(site) => setSelectedLunarSiteId(site.site_id)} />
          <div className="section-title" id="candidates"><div><span className="section-kicker">02 / GEOSPATIAL SURVEY</span><h2>H3 candidate grid</h2></div><p>Select a map cell or a site in the list to view its analysis.</p></div>
          <div className="explorer-grid">
            <div className="panel map-panel"><div className="panel-heading"><div><span className="section-kicker">EARTH / CANDIDATE REGIONS</span><h2>6 candidate basins</h2></div><span className="map-status"><span /> H3 resolution 4</span></div><BasinMap ranked={ranked} selected={selected} onSelect={setSelectedId} /><div className="map-legend"><span><i /> Selected cell</span><span><i /> Other candidates</span></div></div>
            <CandidateList ranked={ranked} selectedId={selected.id} onSelect={setSelectedId} />
          </div>
          <div className="analysis-grid">
            <SiteDetail site={selected} modeKey={modeKey} />
            <div className="analysis-side"><TraverseProfile site={selected} />
              {dualSite && <section className="panel pairing-panel"><span className="section-kicker">DUAL-SITE TESTING</span><h2>Complementary site pair</h2><p>The top score is below 85%. Pair two sites to separate mechanical and optical test objectives.</p><div><span>Mechanical</span><strong>{dualSite.mechanics.name}</strong></div><div><span>Optical</span><strong>{dualSite.optics.name}</strong></div></section>}
            </div>
          </div>
          <div className="section-title" id="analysis"><div><span className="section-kicker">03 / LTV CONFIGURATION</span><h2>Operating modes</h2></div><p>Weights and critical criteria vary by test scenario.</p></div>
          <div className="mode-grid" role="group" aria-label="LTV operating modes">
            {Object.entries(modes).map(([key, mode]) => (
              <button type="button" key={key} className={`mode-card ${key === modeKey ? "active" : ""}`} onClick={() => setModeKey(key)} aria-pressed={key === modeKey}>
                <span className="mode-top"><span className="mode-icon">{key === modeKey ? <Check size={15} /> : <Compass size={15} />}</span><span className="mode-index">0{Object.keys(modes).indexOf(key) + 1}</span></span>
                <strong>{mode.label}</strong><small>{mode.short}</small>
              </button>
            ))}
          </div>
          <p className="mode-description"><Info size={15} /> {modes[modeKey].description}</p>
          <div className="device-reference-section" aria-label="Lunar equipment specifications">
            <div className="device-reference-heading"><div><span className="section-kicker">EQUIPMENT / PUBLIC SPECIFICATIONS</span><h3>Reference equipment specifications</h3></div><span>NASA</span></div>
            <div className="device-reference-grid">{deviceReferenceSpecs.map((device) => <article className="device-reference-card" key={device.id}>
              <h4>{device.name}</h4>
              <dl>{device.values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <p>{device.status}</p>
              <a href={device.url} target="_blank" rel="noreferrer">Source: {device.source} ↗</a>
            </article>)}</div>
          </div>
          <div className="section-title" id="sources"><div><span className="section-kicker">04 / METHODS & REFERENCES</span><h2>Methods & data sources</h2></div><p>Scoring approach and open sources used in this prototype.</p></div>
          <section className="panel method-panel" aria-labelledby="method-title"><span className="section-kicker">METHOD / G‑GD</span><h2 id="method-title">Scoring method</h2><p>Gaussian scores are calculated for each criterion, then adjusted with critical-criterion penalties and a safety factor when slope exceeds 20°. The sample includes NDVI for vegetation filtering. Land-cover data for filtering water and urban areas is not yet available.</p></section>
          <div className="source-reference-grid" aria-label="Data sources">
            {dataSources.map(({ name, description, url, category }) => <article className="panel source-reference-card" key={name}>
              <span>{category}</span><h3>{name}</h3><p>{description}</p><a href={url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a>
            </article>)}
            <article className="panel source-reference-card"><span>Equipment / reference specifications</span><h3>NASA technical documents</h3><p>Reference sources for LTV and TRIDENT/VIPER specifications are also listed in the equipment section.</p><a href={deviceReferenceSpecs[0].url} target="_blank" rel="noreferrer">NASA Moon Base · LTV <ArrowUpRight size={14} /></a><a href={deviceReferenceSpecs[1].url} target="_blank" rel="noreferrer">NASA VIPER · TRIDENT <ArrowUpRight size={14} /></a></article>
            <article className="panel source-reference-card"><span>Method / geospatial grid</span><h3>H3</h3><p>Reference for the hierarchical geospatial indexing system used to represent candidate sites.</p><a href="https://h3geo.org/docs/" target="_blank" rel="noreferrer">H3 documentation <ArrowRight size={14} /></a></article>
          </div>
          <footer className="spa-footer"><span>ACS.AEROTECH · Technical prototype</span><span>Candidate locations and simulated metrics are based on the team's design document.</span></footer>
        </div>
      </main>
      {marsOpen && <div className="modal-backdrop" role="presentation" onClick={() => setMarsOpen(false)}><div className="mars-modal" role="dialog" aria-modal="true" aria-labelledby="mars-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={() => setMarsOpen(false)}><X size={19} /></button><span className="section-kicker">CROSS-PLANET EXTENSION</span><h2 id="mars-title">Jezero Crater · Mars</h2><p>The design document identifies Jezero as a potential target for autonomous rover testing in impact-basin terrain. Mars parameters and datasets are not yet available for G‑GD scoring, so this screen introduces a possible future extension.</p><button className="secondary-action" onClick={() => setMarsOpen(false)}>Back to SPA analysis <ArrowRight size={15} /></button></div></div>}
    </div>
  );
}
