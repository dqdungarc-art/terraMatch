import { useMemo, useState } from "react";
import { ArrowUpRight, Database, MapPin, Search } from "lucide-react";
import LunarGlobe from "./LunarGlobe";
import "./MoonExplorer.css";

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
    description: "NASA cung cấp raster độ dốc LOLA (LDSM); cần tải và căn chỉnh raster để hiển thị trên quả cầu.",
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

export default function MoonExplorer({ sites = [], selectedSiteId, onSelect }) {
  const [query, setQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeLayer, setActiveLayer] = useState("sites");

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

  const selectedSite = filteredSites.find((site) => site.site_id === selectedSiteId) ?? filteredSites[0];
  const activeLayerInfo = layerCatalog[activeLayer];
  const southPoleCount = filteredSites.filter((site) => Number(site.latitude) < -70).length;

  const selectSite = (site) => onSelect?.(site);

  return (
    <section className="moon-explorer" aria-label="Khám phá Mặt Trăng trên quả cầu 3D">
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
        <label className="explorer-marker-toggle"><input type="checkbox" checked={showMarkers} onChange={(event) => setShowMarkers(event.target.checked)} /> Hiện mốc</label>
        <span className="explorer-count">{filteredSites.length} địa điểm</span>
      </div>

      <div className="moon-explorer-layout">
        <div className="moon-globe-column">
          <LunarGlobe sites={filteredSites} selectedSiteId={selectedSite?.site_id} onSelect={selectSite} showMarkers={showMarkers} />
          <div className="south-pole-context">
            <span className="south-pole-context-icon"><MapPin size={15} /></span>
            <div><strong>Vùng cực Nam trên địa cầu</strong><p>{southPoleCount} điểm tham chiếu cực Nam đang hiển thị trên quả cầu. Chọn điểm trong danh sách hoặc bấm marker để xoay tới vị trí.</p></div>
          </div>
        </div>

        <aside className="moon-explorer-inspector" aria-label="Thông tin địa điểm">
          <div className="polar-layer-picker">
            <div className="polar-card-heading"><span className="section-kicker">Lớp dữ liệu</span><span className="layer-status-pill">Nguồn mở</span></div>
            <div className="layer-options" role="group" aria-label="Chọn lớp dữ liệu">
              {Object.entries(layerCatalog).map(([key, layer]) => (
                <button key={key} type="button" className={activeLayer === key ? "active" : ""} aria-pressed={activeLayer === key} onClick={() => setActiveLayer(key)}>{layer.label}</button>
              ))}
            </div>
            <p>{activeLayerInfo.description}</p>
            <a href={activeLayerInfo.sourceUrl} target="_blank" rel="noreferrer">{activeLayerInfo.source} <ArrowUpRight size={13} /></a>
            {activeLayer !== "sites" && <div className="layer-status" role="status"><Database size={15} /><span><strong>{activeLayerInfo.label} chưa được nạp.</strong> Lớp này có nguồn tham khảo; cần raster đã căn chỉnh để phủ lên quả cầu.</span></div>}
          </div>

          <div className="polar-selected" aria-live="polite" aria-atomic="true">
            <div className="polar-card-heading"><span className="section-kicker">Địa điểm đang chọn</span><span className="verified-pill">Có nguồn dẫn</span></div>
            {selectedSite ? <>
              <h3><MapPin size={16} /> {selectedSite.name}</h3>
              <p className="polar-reference">{selectedSite.reference} · {selectedSite.kind}</p>
              <p className="polar-coordinates"><span>Vĩ độ {formatCoordinate(selectedSite.latitude, "N", "S")}</span><span>Kinh độ {formatCoordinate(selectedSite.longitude, "E", "W")}</span></p>
              <p className="polar-site-summary">{selectedSite.summary}</p>
              <small className="polar-source-note">{selectedSite.sourceNote}</small>
              <a className="polar-source-link" href={selectedSite.sourceUrl} target="_blank" rel="noreferrer">Nguồn: {selectedSite.source} <ArrowUpRight size={13} /></a>
            </> : <p>Không tìm thấy địa điểm phù hợp. Hãy đổi bộ lọc hoặc từ khóa.</p>}
          </div>

          <div className="explorer-site-list">
            <div className="polar-card-heading"><span className="section-kicker">Danh sách địa điểm</span><span>{filteredSites.length}</span></div>
            <div className="explorer-site-grid">
              {filteredSites.map((site) => (
                <button key={site.site_id} type="button" className={selectedSite?.site_id === site.site_id ? "active" : ""} onClick={() => selectSite(site)} aria-pressed={selectedSite?.site_id === site.site_id}>
                  <span><strong>{site.name}</strong><small>{Number(site.latitude) < -70 ? "Vùng cực Nam" : "Điểm hạ cánh lịch sử"} · {site.reference}</small></span><MapPin size={14} aria-hidden="true" />
                </button>
              ))}
              {!filteredSites.length && <p>Không có địa điểm phù hợp.</p>}
            </div>
          </div>
          <p className="polar-data-note">Tọa độ là điểm tham chiếu trong nguồn được dẫn, không đại diện ranh giới địa hình. Quả cầu dùng ảnh bề mặt; lớp raster khoa học chưa được tích hợp.</p>
        </aside>
      </div>
    </section>
  );
}

