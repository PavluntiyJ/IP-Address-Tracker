import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { LookupResult } from "../shared/lookup";
import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "trace-marker",
  html: '<span class="trace-marker__pulse"></span><span class="trace-marker__pin"></span>',
  iconAnchor: [18, 42],
  iconSize: [36, 42],
  popupAnchor: [0, -38],
});

function MapViewport({ location }: { location: LookupResult["location"] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([location.lat, location.lng], 13, { duration: 1.2 });
  }, [location, map]);

  return null;
}

function WheelZoomGate() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.disable();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    map.on("click", enable);
    map.on("mouseout", disable);
    return () => {
      map.off("click", enable);
      map.off("mouseout", disable);
    };
  }, [map]);

  return null;
}

export function MapPanel({ result }: { result: LookupResult | null }) {
  const position: [number, number] = result
    ? [result.location.lat, result.location.lng]
    : [20, 0];

  return (
    <section className="map-panel" aria-label="Location map">
      <MapContainer
        center={position}
        zoom={result ? 13 : 2}
        minZoom={2}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <WheelZoomGate />
        {result ? (
          <>
            <MapViewport location={result.location} />
            <Marker position={position} icon={markerIcon}>
              <Popup>
                <strong>{result.ip}</strong>
                <br />
                {[result.location.city, result.location.region]
                  .filter(Boolean)
                  .join(", ")}
              </Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>
      {!result ? (
        <div className="map-panel__loading" aria-hidden="true">
          <span /> Establishing map coordinates
        </div>
      ) : null}
    </section>
  );
}
