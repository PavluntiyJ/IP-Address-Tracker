import {
  AttributionControl,
  Map as LibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { LookupResult } from "../shared/lookup";
import "maplibre-gl/dist/maplibre-gl.css";

const mapStyle = "https://tiles.openfreemap.org/styles/positron";

function createMarkerElement() {
  const marker = document.createElement("div");
  marker.className = "trace-marker";
  marker.setAttribute("aria-hidden", "true");

  const pulse = document.createElement("span");
  pulse.className = "trace-marker__pulse";
  const pin = document.createElement("span");
  pin.className = "trace-marker__pin";
  marker.append(pulse, pin);

  return marker;
}

function createPopupContent(result: LookupResult) {
  const content = document.createElement("div");
  const address = document.createElement("strong");
  address.textContent = result.ip;
  content.append(address, document.createElement("br"));
  content.append(
    [result.location.city, result.location.region].filter(Boolean).join(", "),
  );
  return content;
}

export function MapPanel({ result }: { result: LookupResult | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialViewRef = useRef({
    center: result
      ? ([result.location.lng, result.location.lat] as [number, number])
      : ([0, 20] as [number, number]),
    zoom: result ? 13 : 2,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new LibreMap({
      container: containerRef.current,
      style: mapStyle,
      center: initialViewRef.current.center,
      zoom: initialViewRef.current.zoom,
      minZoom: 2,
      scrollZoom: true,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new AttributionControl({ compact: true }));
    mapRef.current = map;

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !result) return;

    const coordinates: [number, number] = [
      result.location.lng,
      result.location.lat,
    ];
    map.flyTo({ center: coordinates, zoom: 13, duration: 1200 });

    const popup = new Popup({ offset: 34 }).setDOMContent(
      createPopupContent(result),
    );
    if (markerRef.current) {
      markerRef.current.setLngLat(coordinates).setPopup(popup);
      return;
    }

    markerRef.current = new Marker({
      element: createMarkerElement(),
      anchor: "bottom",
    })
      .setLngLat(coordinates)
      .setPopup(popup)
      .addTo(map);
  }, [result]);

  return (
    <section className="map-panel" aria-label="Location map">
      <div className="map-container" ref={containerRef} />
      {!result ? (
        <div className="map-panel__loading" aria-hidden="true">
          <span /> Establishing map coordinates
        </div>
      ) : null}
    </section>
  );
}
