import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MapPanel } from "./MapPanel";

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
    <div
      data-testid="tile-layer"
      data-attribution={attribution}
      data-url={url}
    />
  ),
  useMap: () => ({
    flyTo: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    scrollWheelZoom: {
      disable: vi.fn(),
      enable: vi.fn(),
    },
  }),
}));

describe("MapPanel", () => {
  it("uses the keyless OpenStreetMap tile service with attribution", () => {
    render(<MapPanel result={null} />);

    const tileLayer = screen.getByTestId("tile-layer");
    expect(tileLayer).toHaveAttribute(
      "data-url",
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(tileLayer).toHaveAttribute(
      "data-attribution",
      expect.stringContaining("OpenStreetMap"),
    );
    expect(tileLayer.getAttribute("data-attribution")).not.toContain("CARTO");
  });
});
