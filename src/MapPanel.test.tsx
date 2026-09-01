import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapPanel } from "./MapPanel";

const { mapConstructor } = vi.hoisted(() => ({
  mapConstructor: vi.fn(),
}));

vi.mock("maplibre-gl", () => ({
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
