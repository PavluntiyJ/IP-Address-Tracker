import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapPanel } from "./MapPanel";

const { mapConstructor, setWorkerUrl } = vi.hoisted(() => ({
  mapConstructor: vi.fn(),
  setWorkerUrl: vi.fn(),
}));

vi.mock("maplibre-gl", () => ({
  setWorkerUrl,
  AttributionControl: class AttributionControl {},
  Map: class Map {
    constructor(options: unknown) {
      mapConstructor(options);
    }

    addControl() {}
    flyTo() {}
    remove() {}
  },
  Marker: class Marker {
    addTo() {
      return this;
    }

    setLngLat() {
      return this;
    }

    setPopup() {
      return this;
    }
  },
  NavigationControl: class NavigationControl {},
  Popup: class Popup {
    setDOMContent() {
      return this;
    }
  },
}));

describe("MapPanel", () => {
  it("configures an emitted worker asset before creating the map", () => {
    render(<MapPanel result={null} />);

    expect(setWorkerUrl).toHaveBeenCalledWith(
      expect.stringContaining("maplibre-gl-worker.mjs"),
    );
    expect(setWorkerUrl.mock.invocationCallOrder[0]).toBeLessThan(
      mapConstructor.mock.invocationCallOrder[0]!,
    );
  });

  it("uses the neutral keyless map style with wheel zoom enabled", () => {
    render(<MapPanel result={null} />);

    expect(mapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "https://tiles.openfreemap.org/styles/positron",
        scrollZoom: true,
      }),
    );
  });
});
