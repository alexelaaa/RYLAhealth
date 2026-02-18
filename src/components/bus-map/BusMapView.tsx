"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BUS_ACTIVE_THRESHOLD_MIN } from "@/lib/constants";

export interface BusLocation {
  bus_id: string;
  bus_label: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  tracked_by: string;
  timestamp: string;
}

const BUS_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#0891b2", // cyan
];

function getBusColor(busId: string): string {
  const num = parseInt(busId.replace(/\D/g, "")) || 1;
  return BUS_COLORS[(num - 1) % BUS_COLORS.length];
}

function getBusNumber(busId: string): string {
  return busId.replace(/\D/g, "") || "?";
}

function isActive(timestamp: string): boolean {
  const diff = Date.now() - new Date(timestamp).getTime();
  return diff < BUS_ACTIVE_THRESHOLD_MIN * 60 * 1000;
}

function createBusIcon(busId: string, active: boolean): L.DivIcon {
  const color = active ? getBusColor(busId) : "#94a3b8";
  const num = getBusNumber(busId);
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
    html: `
      <div style="
        width: 32px; height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        opacity: ${active ? 1 : 0.5};
      ">${num}</div>
    `,
  });
}

function FitBounds({ buses }: { buses: BusLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (buses.length === 0) return;
    const bounds = L.latLngBounds(
      buses.map((b) => [b.latitude, b.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, buses]);

  return null;
}

interface BusMapViewProps {
  buses: BusLocation[];
}

export default function BusMapView({ buses }: BusMapViewProps) {
  // Default center: approximate center of US (will be overridden by FitBounds)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const center: [number, number] =
    buses.length > 0
      ? [buses[0].latitude, buses[0].longitude]
      : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ width: "100%", height: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds buses={buses} />
      {buses.map((bus) => {
        const active = isActive(bus.timestamp);
        return (
          <Marker
            key={bus.bus_id}
            position={[bus.latitude, bus.longitude]}
            icon={createBusIcon(bus.bus_id, active)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{bus.bus_label}</p>
                <p className="text-slate-600">Tracker: {bus.tracked_by}</p>
                <p className="text-slate-600">
                  Last update: {new Date(bus.timestamp).toLocaleTimeString()}
                </p>
                {bus.speed != null && (
                  <p className="text-slate-600">
                    Speed: {Math.round(bus.speed * 3.6)} km/h
                  </p>
                )}
                {bus.accuracy != null && (
                  <p className="text-slate-600">
                    Accuracy: ±{Math.round(bus.accuracy)}m
                  </p>
                )}
                <p className={`font-medium ${active ? "text-green-600" : "text-slate-400"}`}>
                  {active ? "Active" : "Inactive"}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
