import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupAddress } from "./api";
import App from "./App";

vi.mock("./api", () => ({ lookupAddress: vi.fn() }));
vi.mock("./MapPanel", () => ({
  MapPanel: () => <div data-testid="map-panel" />,
}));

const ownAddress = {
  ip: "203.0.113.1",
  location: {
    city: "Portland",
    region: "Oregon",
    country: "US",
    postalCode: "97201",
    timezone: "-07:00",
    lat: 45.52,
    lng: -122.68,
  },
  isp: "Example Fiber",
};

describe("App", () => {
  beforeEach(() => {
    vi.mocked(lookupAddress).mockReset();
    vi.mocked(lookupAddress).mockResolvedValue(ownAddress);
  });

  it("keeps the newest result when an aborted lookup resolves late", async () => {
    let resolveFirst!: (result: typeof ownAddress) => void;
    const firstLookup = new Promise<typeof ownAddress>((resolve) => {
      resolveFirst = resolve;
    });
    const newestResult = { ...ownAddress, ip: "198.51.100.9" };
    vi.mocked(lookupAddress)
      .mockResolvedValueOnce(ownAddress)
      .mockReturnValueOnce(firstLookup)
      .mockResolvedValueOnce(newestResult);
    render(<App />);
    await screen.findByText(ownAddress.ip);
    const input = screen.getByLabelText("IP address or domain");
    const form = screen
      .getByRole("button", { name: "Trace address" })
      .closest("form")!;
    fireEvent.change(input, { target: { value: "first.example.com" } });
    fireEvent.submit(form);
    const firstSignal = vi.mocked(lookupAddress).mock.calls[1]?.[1];
    fireEvent.change(input, { target: { value: "latest.example.com" } });
    fireEvent.submit(form);
    await screen.findByText(newestResult.ip);

    expect(firstSignal?.aborted).toBe(true);
    await act(async () => {
      resolveFirst({ ...ownAddress, ip: "198.51.100.8" });
      await firstLookup;
    });
    expect(screen.getByText(newestResult.ip)).toBeInTheDocument();
    expect(screen.queryByText("198.51.100.8")).not.toBeInTheDocument();
  });

  it("loads and renders the visitor address on startup", async () => {
    render(<App />);

    expect(await screen.findByText("203.0.113.1")).toBeInTheDocument();
    expect(screen.getByText("Example Fiber")).toBeInTheDocument();
    expect(screen.getByText("UTC -07:00")).toBeInTheDocument();
    expect(lookupAddress).toHaveBeenCalledWith("", expect.any(AbortSignal));
  });

  it("submits a domain lookup and updates the result", async () => {
    const domainResult = {
      ...ownAddress,
      ip: "198.51.100.7",
      isp: "Domain Network",
    };
    vi.mocked(lookupAddress)
      .mockResolvedValueOnce(ownAddress)
      .mockResolvedValueOnce(domainResult);
    render(<App />);
    await screen.findByText("203.0.113.1");

    fireEvent.change(screen.getByLabelText("IP address or domain"), {
      target: { value: "example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Trace address" }));

    await waitFor(() =>
      expect(lookupAddress).toHaveBeenLastCalledWith(
        "example.com",
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText("198.51.100.7")).toBeInTheDocument();
  });

  it("rejects an empty manual search without calling the API", async () => {
    render(<App />);
    await screen.findByText("203.0.113.1");

    fireEvent.submit(screen.getByRole("button", { name: "Trace address" }));

    expect(
      screen.getByText("Enter an IP address or domain to begin a search."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter an IP address or domain to begin a search.",
    );
    expect(lookupAddress).toHaveBeenCalledTimes(1);
  });
});
