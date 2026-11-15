import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, Database, MapPin, Minus, Plus, RotateCcw, Search } from "lucide-react";
import "./MoonSouthPoleMap.css";

const layerCatalog = {
  sites: {
    label: "Địa điểm",
    description: "Các điểm tham chiếu có tọa độ và nguồn dữ liệu được ghi bên dưới.",
    source: "Tọa độ địa danh",
    sourceUrl: "https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf",
  },
  elevation: {
    label: "Độ cao LOLA",
    description: "Raster địa hình LOLA có thể dùng để khảo sát cao độ. Raster chưa được đóng gói trong prototype này.",
    source: "NASA GSFC PGDA · LOLA DEM",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  slope: {
    label: "Độ dốc",
    description: "NASA cung cấp raster độ dốc LOLA (LDSM); cần tải và căn chỉnh raster để hiển thị trên bản đồ.",
    source: "NASA GSFC PGDA · LOLA Slope Map",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  illumination: {
    label: "Chiếu sáng",
    description: "Có thể đánh giá thời lượng chiếu sáng theo địa hình và thời gian; lớp raster chưa được tích hợp.",
    source: "NASA GSFC PGDA · LOLA products",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/90",
  },
  psr: {
    label: "Vùng tối vĩnh viễn",
    description: "Lớp PSR cần raster và tiêu chí thời gian chiếu sáng xác định; bản xem trước chưa hiển thị ranh giới PSR.",
    source: "NASA GSFC PGDA · South Pole data",
    sourceUrl: "https://pgda.gsfc.nasa.gov/products/81",
  },
};

function formatCoordinate(value, positive, negative) {
  const number = Number(value);
  return `${Math.abs(number).toFixed(4)}°${number < 0 ? negative : positive}`;
}

export default function MoonSouthPoleMap({ sites = [], selectedSiteId, onSelect }) {
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [showMarkers, setShowMarkers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeLayer, setActiveLayer] = useState("sites");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return sites.filter((site) => {
      const matchesFilter = siteFilter === "all"
        || (siteFilter === "south-pole" && Number(site.latitude) < -70)
        || (siteFilter === "heritage" && site.category === "heritage");
      const matchesQuery = !normalizedQuery
        || `${site.name} ${site.reference ?? ""} ${site.kind ?? ""}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [sites, query, siteFilter]);

  const southPoleSites = filteredSites.filter((site) => Number(site.latitude) < -70);
  const otherSites = filteredSites.filter((site) => Number(site.latitude) >= -70);
  const selectedSite = filteredSites.find((site) => site.site_id === selectedSiteId) ?? filteredSites[0];
  const selectedLatitude = Number(selectedSite?.latitude);
  const selectedLongitude = Number(selectedSite?.longitude);
  const activeLayerInfo = layerCatalog[activeLayer];

  // South-polar stereographic projection, normalized so the 70°S boundary fits the map.
  const project = (latitude, longitude) => {
    const angularDistance = ((90 + Number(latitude)) * Math.PI) / 360;
    const boundary = (20 * Math.PI) / 360;
    const distance = Math.max(0, Math.min(1, Math.tan(angularDistance) / Math.tan(boundary)));
    const angle = (Number(longitude) * Math.PI) / 180;
    return {
      left: `${50 + distance * 43 * Math.sin(angle)}%`,
      top: `${50 - distance * 43 * Math.cos(angle)}%`,
    };
  };

  const changeZoom = (nextZoom) => {
    const bounded = Math.min(2.6, Math.max(1, nextZoom));
    setZoom(bounded);
    if (bounded === 1) setPan({ x: 0, y: 0 });
  };

  const beginPan = (event) => {
    if (zoom <= 1 || event.target.closest("button")) return;
    dragRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePan = (event) => {
    if (!dragRef.current) return;
    const limit = 130 * (zoom - 1);
    setPan({
      x: Math.max(-limit, Math.min(limit, event.clientX - dragRef.current.x)),
      y: Math.max(-limit, Math.min(limit, event.clientY - dragRef.current.y)),
    });
  };

  const selectSite = (site) => onSelect?.(site);

  return (
    <div className="moon-south-pole">
      <div className="polar-map-container">
        <div className="polar-toolbar">
          <label className="polar-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Tìm địa điểm Mặt Trăng</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm…" />
          </label>
          <div className="polar-filters" role="group" aria-label="Lọc địa điểm">
            {[ ["all", "Tất cả"], ["south-pole", "Vùng cực Nam"], ["heritage", "Điểm hạ cánh"] ].map(([value, label]) => (
              <button key={value} type="button" className={siteFilter === value ? "active" : ""} aria-pressed={siteFilter === value} onClick={() => setSiteFilter(value)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="polar-map-frame">
          <div
            className={`polar-circle ${zoom > 1 ? "is-zoomed" : ""}`}
            role="group"
            aria-label="Bản đồ chiếu cực Nam Mặt Trăng; có thể kéo bản đồ sau khi phóng to"
            onPointerDown={beginPan}
            onPointerMove={movePan}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {showGrid && <>
              <div className="lat-ring lat-80"><span>80°S</span></div>
              <div className="lat-ring lat-85"><span>85°S</span></div>
              {[0, 45, 90, 135].map((degree) => <div key={degree} className="lon-line" style={{ transform: `rotate(${degree}deg)` }} />)}
              <span className="lon-label lon-north">0°</span>
              <span className="lon-label lon-east">90°E</span>
              <span className="lon-label lon-south">180°</span>
              <span className="lon-label lon-west">90°W</span>
            </>}
            <div className="pole-label" aria-hidden="true">S</div>

            {showMarkers && southPoleSites.map((site) => {
              const isSelected = selectedSite?.site_id === site.site_id;
              return (
                <button
                  key={site.site_id}
                  type="button"
                  className={`polar-marker ${isSelected ? "selected" : ""}`}
                  style={project(site.latitude, site.longitude)}
                  onClick={() => selectSite(site)}
                  aria-label={`Chọn ${site.name}, vĩ độ ${formatCoordinate(site.latitude, "N", "S")}, kinh độ ${formatCoordinate(site.longitude, "E", "W")}`}
                  aria-pressed={isSelected}
                >
                  <span className="marker-dot" />
                  {isSelected && <span className="marker-label">{site.name}</span>}
                </button>
              );
            })}
          </div>
          <div className="polar-map-controls" role="group" aria-label="Điều khiển bản đồ">
            <button type="button" aria-label="Phóng to bản đồ" onClick={() => changeZoom(zoom + 0.3)} disabled={zoom >= 2.6}><Plus size={16} /></button>
            <button type="button" aria-label="Thu nhỏ bản đồ" onClick={() => changeZoom(zoom - 0.3)} disabled={zoom <= 1}><Minus size={16} /></button>
            <button type="button" aria-label="Đặt lại bản đồ" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={14} /></button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="polar-legend">
          <span>Cực Nam · phạm vi 70°S–90°S</span>
          <span className="legend-note">Chiếu cực lập thể · kinh độ 0° hướng lên Bắc</span>
        </div>
        <div className="polar-map-options">
          <label><input type="checkbox" checked={showMarkers} onChange={(event) => setShowMarkers(event.target.checked)} /> Hiện điểm</label>
          <label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> Lưới kinh/vĩ độ</label>
          <span>{filteredSites.length} địa điểm</span>
        </div>
        {activeLayer !== "sites" && <div className="layer-status" role="status"><Database size={15} /><span><strong>{activeLayerInfo.label} chưa được nạp vào bản đồ.</strong> {activeLayerInfo.description}</span></div>}
      </div>

      <aside className="polar-info" aria-label="Chi tiết địa điểm và lớp dữ liệu">
        <div className="polar-layer-picker">
          <div className="polar-card-heading"><span className="section-kicker">Lớp dữ liệu</span><span className="layer-status-pill">Nguồn mở</span></div>
          <div className="layer-options" role="group" aria-label="Chọn lớp dữ liệu">
            {Object.entries(layerCatalog).map(([key, layer]) => (
              <button key={key} type="button" className={activeLayer === key ? "active" : ""} aria-pressed={activeLayer === key} onClick={() => setActiveLayer(key)}>{layer.label}</button>
            ))}
          </div>
          <p>{activeLayerInfo.description}</p>
          <a href={activeLayerInfo.sourceUrl} target="_blank" rel="noreferrer">{activeLayerInfo.source} <ArrowUpRight size={13} /></a>
        </div>

        <div className="polar-selected" aria-live="polite" aria-atomic="true">
          <div className="polar-card-heading"><span className="section-kicker">Chi tiết địa điểm</span><span className="verified-pill">Có nguồn dẫn</span></div>
          {selectedSite ? <>
            <h3><MapPin size={16} /> {selectedSite.name}</h3>
            <p className="polar-reference">{selectedSite.reference} · {selectedSite.kind}</p>
            <p className="polar-coordinates"><span>Vĩ độ {formatCoordinate(selectedLatitude, "N", "S")}</span><span>Kinh độ {formatCoordinate(selectedLongitude, "E", "W")}</span></p>
            <p className="polar-site-summary">{selectedSite.summary}</p>
            <small className="polar-source-note">{selectedSite.sourceNote}</small>
            <a className="polar-source-link" href={selectedSite.sourceUrl} target="_blank" rel="noreferrer">Nguồn: {selectedSite.source} <ArrowUpRight size={13} /></a>
          </> : <p>Không tìm thấy địa điểm phù hợp. Hãy đổi bộ lọc hoặc từ khóa.</p>}
        </div>

        <div className="other-sites">
          <small>{southPoleSites.length ? "Địa điểm vùng cực Nam" : "Không có địa điểm vùng cực khớp bộ lọc"}</small>
          <div className="other-chips">
            {southPoleSites.map((site) => <button key={site.site_id} type="button" className={`other-chip ${selectedSite?.site_id === site.site_id ? "active" : ""}`} onClick={() => selectSite(site)} aria-pressed={selectedSite?.site_id === site.site_id}>{site.name}</button>)}
          </div>
        </div>
        <div className="other-sites">
          <small>{otherSites.length ? "Điểm hạ cánh lịch sử" : "Không có điểm lịch sử khớp bộ lọc"}</small>
          <div className="other-chips">
            {otherSites.map((site) => <button key={site.site_id} type="button" className={`other-chip ${selectedSite?.site_id === site.site_id ? "active" : ""}`} onClick={() => selectSite(site)} aria-pressed={selectedSite?.site_id === site.site_id}>{site.name}</button>)}
          </div>
        </div>
        <p className="polar-data-note">Tọa độ là điểm tham chiếu trong nguồn được dẫn, không đại diện ranh giới địa hình. Các lớp raster khoa học cần được tải và căn chỉnh trước khi hiển thị.</p>
      </aside>
    </div>
  );
}
