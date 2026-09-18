import { zonePct, zonePerGame, type ShotZoneReport } from "../../domain/shotZones";

const ZONE_LABELS: Record<string, string> = {
  at_rim: "Sous le cercle",
  paint: "Raquette",
  mid_range: "Mi-distance",
  corner_three: "3pts Corner",
  above_break_three: "3pts Face",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface ShotZonesTableProps {
  report: ShotZoneReport;
}

export function ShotZonesTable({ report }: ShotZonesTableProps) {
  return (
    <table className="box-score-table">
      <thead>
        <tr>
          <th>Zone</th>
          <th>Marqués</th>
          <th>Tentés</th>
          <th>%</th>
          <th>/M</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(report.zones).map((line) => (
          <tr key={line.zone}>
            <td>{ZONE_LABELS[line.zone] ?? line.zone}</td>
            <td>{line.made}</td>
            <td>{line.attempted}</td>
            <td>{pct(zonePct(line))}</td>
            <td>{zonePerGame(line, report.games).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
