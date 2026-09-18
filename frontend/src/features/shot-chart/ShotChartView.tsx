import { useMemo, useRef, useState } from "react";

import { computeShotZones } from "../../domain/shotZones";
import type { CachedPlayer, LocalGameEvent } from "../../offline/db";
import { Modal } from "../live-entry/Modal";
import { ShotZonesTable } from "../stats/ShotZonesTable";
import { exportShotChartImage } from "./exportShotChartImage";
import { FibaCourtSvg } from "./FibaCourtSvg";
import { extractShotEntries, filterShotEntries } from "./shotFilters";

const PERIOD_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 1, label: "Q1" },
  { value: 2, label: "Q2" },
  { value: 3, label: "Q3" },
  { value: 4, label: "Q4" },
  { value: 5, label: "OT" },
  { value: "all", label: "All" },
];

interface ShotChartViewProps {
  events: LocalGameEvent[];
  players: CachedPlayer[];
  onClose: () => void;
}

export function ShotChartView({ events, players, onClose }: ShotChartViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    () => new Set(players.map((player) => player.id)),
  );
  const [period, setPeriod] = useState<number | "all">("all");

  const entries = useMemo(() => extractShotEntries(events), [events]);
  const filtered = useMemo(
    () => filterShotEntries(entries, { selectedPlayerIds, period }),
    [entries, selectedPlayerIds, period],
  );
  const zoneReport = useMemo(
    () =>
      computeShotZones(
        events.filter((event) => {
          if (event.voided) return false;
          if (event.playerId && !selectedPlayerIds.has(event.playerId)) return false;
          if (period !== "all" && event.period !== period) return false;
          return true;
        }),
        1,
      ),
    [events, selectedPlayerIds, period],
  );

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleExport() {
    if (!svgRef.current) return;
    await exportShotChartImage(svgRef.current, "shot-chart.png");
  }

  return (
    <Modal title="Shot Chart" onClose={onClose}>
      <div className="shot-chart-view">
        <div className="shot-chart-court">
          <FibaCourtSvg
            ref={svgRef}
            markers={filtered.map((entry) => ({ id: entry.id, x: entry.x, y: entry.y, made: entry.made }))}
          />
        </div>
        <div className="shot-chart-sidebar">
          <div className="shot-chart-player-list">
            {players.map((player) => (
              <label key={player.id} className="shot-chart-player-row">
                <input
                  type="checkbox"
                  checked={selectedPlayerIds.has(player.id)}
                  onChange={() => togglePlayer(player.id)}
                />
                {player.jerseyNumber} {player.firstName} {player.lastName}
              </label>
            ))}
          </div>
          <div className="shot-chart-select-actions">
            <button onClick={() => setSelectedPlayerIds(new Set(players.map((p) => p.id)))}>Select All</button>
            <button onClick={() => setSelectedPlayerIds(new Set())}>Deselect All</button>
          </div>
          <div className="shot-chart-periods">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={String(option.value)}
                className={period === option.value ? "period-tab active" : "period-tab"}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="shot-chart-export" onClick={() => void handleExport()}>
            Export image
          </button>
          <section className="shot-zones-section">
            <h4>Zones</h4>
            <ShotZonesTable report={zoneReport} />
          </section>
        </div>
      </div>
    </Modal>
  );
}
