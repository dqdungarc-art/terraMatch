import { useMemo } from "react";
import { MapPin } from "lucide-react";
import "./MoonSouthPoleMap.css";

export default function MoonSouthPoleMap({ sites = [], selectedSiteId, onSelect }) {
  const southPoleSites = useMemo(
    () => sites.filter((site) => Number(site.latitude) < -70),
    [sites],
  );
  const otherSites = useMemo(
    () => sites.filter((site) => Number(site.latitude) >= -70),
    [sites],
  );
  const selectedSite = sites.find((site) => site.site_id === selectedSiteId) ?? southPoleSites[0];
  const selectedLatitude = Number(selectedSite?.latitude);
  const selectedLongitude = Number(selectedSite?.longitude);

  const project = (latitude, longitude) => {
    const distance = Math.max(0, Math.min(1, (90 + Number(latitude)) / 20));
    const angle = (Number(longitude) * Math.PI) / 180;
    return {
      left: `${50 + distance * 42 * Math.sin(angle)}%`,
      top: `${50 - distance * 42 * Math.cos(angle)}%`,
    };
  };

  return (
    <div className="moon-south-pole">
      <div className="polar-map-container">
        <div className="polar-circle" role="group" aria-label="Bản đồ chiếu cực Nam Mặt Trăng">
          <div className="lat-ring lat-80"><span>80°S</span></div>
          <div className="lat-ring lat-85"><span>85°S</span></div>
          <div className="pole-label" aria-hidden="true">S</div>
          {[0, 90, 180, 270].map((degree) => (
            <div key={degree} className="lon-line" style={{ transform: `rotate(${degree}deg)` }} />
          ))}

          {southPoleSites.map((site) => {
            const isSelected = selectedSite?.site_id === site.site_id;
            return (
              <button
                key={site.site_id}
                type="button"
                className={`polar-marker ${isSelected ? "selected" : ""}`}
                style={project(site.latitude, site.longitude)}
                onClick={() => onSelect?.(site)}
                title={`${site.name} (${site.latitude}°, ${site.longitude}°)`}
                aria-label={`Chọn ${site.name}, ${site.latitude} độ vĩ Nam, ${site.longitude} độ kinh Đông`}
                aria-pressed={isSelected}
              >
                <span className="marker-dot" />
                <span className="marker-label">{site.name}</span>
              </button>
            );
          })}
        </div>
        <div className="polar-legend">
          <span>Cực Nam Mặt Trăng · vĩ độ từ 70°S đến 90°S</span>
          <span className="legend-note">Chọn điểm để xem tọa độ</span>
        </div>
      </div>

      <aside className="polar-info" aria-live="polite">
        {selectedSite && (
          <div className="polar-selected">
            <span className="section-kicker">Địa điểm đang chọn</span>
            <h3><MapPin size={16} /> {selectedSite.name}</h3>
            <p>{Math.abs(selectedLatitude).toFixed(3)}°{selectedLatitude < 0 ? "S" : "N"} <span>·</span> {Math.abs(selectedLongitude).toFixed(3)}°{selectedLongitude < 0 ? "W" : "E"}</p>
          </div>
        )}

        {otherSites.length > 0 && (
          <div className="other-sites">
            <small>Địa điểm ngoài vùng cực Nam</small>
            <div className="other-chips">
              {otherSites.map((site) => (
                <button
                  key={site.site_id}
                  type="button"
                  className={`other-chip ${selectedSite?.site_id === site.site_id ? "active" : ""}`}
                  onClick={() => onSelect?.(site)}
                  aria-pressed={selectedSite?.site_id === site.site_id}
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="polar-data-note">Các tọa độ hiện lấy từ bộ dữ liệu mẫu của nhóm, dùng để minh họa vị trí và chưa phải dữ liệu khảo sát đã kiểm chứng.</p>
      </aside>
    </div>
  );
}
