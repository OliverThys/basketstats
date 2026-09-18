"""CSV / PDF renderers for box score and season stats."""

from __future__ import annotations

import csv
from io import BytesIO, StringIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.domain.box_score import GameBoxScore
from app.domain.season import SeasonReport
from app.domain.shot_zones import ShotZoneReport


def box_score_csv(box: GameBoxScore, names: dict[str, str]) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Player",
            "FGM-A",
            "2PM-A",
            "3PM-A",
            "FTM-A",
            "OFF",
            "DEF",
            "TOT",
            "AST",
            "ST",
            "TO",
            "BS",
            "PF",
            "FPF",
            "EFF",
            "PTS",
            "MIN",
            "+/-",
            "eFG%",
            "TS%",
        ]
    )
    for row in box.players.values():
        writer.writerow(
            [
                names.get(row.player_id, row.player_id),
                f"{row.fgm}-{row.fga}",
                f"{row.fg2m}-{row.fg2a}",
                f"{row.fg3m}-{row.fg3a}",
                f"{row.ftm}-{row.fta}",
                row.reb_off,
                row.reb_def,
                row.reb_tot,
                row.ast,
                row.stl,
                row.tov,
                row.blk,
                row.pf,
                row.fpf,
                row.eff,
                row.pts,
                round(row.minutes, 1),
                row.plus_minus,
                round(row.efg_pct * 100, 1),
                round(row.ts_pct * 100, 1),
            ]
        )
    totals = box.totals
    writer.writerow(
        [
            "Totals",
            f"{totals.fgm}-{totals.fga}",
            f"{totals.fg2m}-{totals.fg2a}",
            f"{totals.fg3m}-{totals.fg3a}",
            f"{totals.ftm}-{totals.fta}",
            totals.reb_off,
            totals.reb_def,
            totals.reb_tot,
            totals.ast,
            totals.stl,
            totals.tov,
            totals.blk,
            totals.pf,
            totals.fpf,
            totals.eff,
            totals.pts,
            "",
            "",
            round(totals.efg_pct * 100, 1),
            round(totals.ts_pct * 100, 1),
        ]
    )
    writer.writerow(
        [
            "%",
            f"{totals.fg_pct * 100:.1f}",
            f"{totals.fg2_pct * 100:.1f}",
            f"{totals.fg3_pct * 100:.1f}",
            f"{totals.ft_pct * 100:.1f}",
        ]
    )
    return buffer.getvalue()


def season_stats_csv(report: SeasonReport, names: dict[str, str]) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Player",
            "GP",
            "PTS",
            "PTS/G",
            "REB",
            "AST",
            "MIN",
            "+/-",
            "eFG%",
            "TS%",
            "Opponent split",
        ]
    )
    for stats in report.players.values():
        opp = "; ".join(
            f"{name} {totals.pts}pts/{totals.games_played}gp"
            for name, totals in stats.by_opponent.items()
        )
        writer.writerow(
            [
                names.get(stats.player_id, stats.player_id),
                stats.totals.games_played,
                stats.totals.pts,
                round(stats.totals.average("pts"), 1),
                stats.totals.reb_tot,
                stats.totals.ast,
                round(stats.totals.minutes_s / 60, 1),
                stats.totals.plus_minus,
                round(stats.totals.efg_pct * 100, 1),
                round(stats.totals.ts_pct * 100, 1),
                opp,
            ]
        )
    return buffer.getvalue()


def shot_zones_csv(report: ShotZoneReport) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Zone", "Made", "Attempted", "Percent", "Per Game"])
    for line in report.zones.values():
        writer.writerow(
            [
                line.zone,
                line.made,
                line.attempted,
                round(line.pct * 100, 1),
                round(line.per_game(report.games), 2),
            ]
        )
    return buffer.getvalue()


def _pdf_table(title: str, headers: list[str], rows: list[list[str]]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24,
    )
    styles = getSampleStyleSheet()
    data = [headers, *rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#334155")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ]
        )
    )
    doc.build([Paragraph(title, styles["Title"]), Spacer(1, 12), table])
    return buffer.getvalue()


def box_score_pdf(box: GameBoxScore, names: dict[str, str], title: str) -> bytes:
    headers = [
        "Player",
        "FGM-A",
        "2P",
        "3P",
        "FT",
        "REB",
        "AST",
        "ST",
        "TO",
        "BS",
        "PF",
        "EFF",
        "PTS",
        "MIN",
        "+/-",
    ]
    rows = []
    for row in box.players.values():
        rows.append(
            [
                names.get(row.player_id, row.player_id),
                f"{row.fgm}-{row.fga}",
                f"{row.fg2m}-{row.fg2a}",
                f"{row.fg3m}-{row.fg3a}",
                f"{row.ftm}-{row.fta}",
                str(row.reb_tot),
                str(row.ast),
                str(row.stl),
                str(row.tov),
                str(row.blk),
                str(row.pf),
                str(row.eff),
                str(row.pts),
                f"{row.minutes:.1f}",
                str(row.plus_minus),
            ]
        )
    totals = box.totals
    rows.append(
        [
            "Totals",
            f"{totals.fgm}-{totals.fga}",
            f"{totals.fg2m}-{totals.fg2a}",
            f"{totals.fg3m}-{totals.fg3a}",
            f"{totals.ftm}-{totals.fta}",
            str(totals.reb_tot),
            str(totals.ast),
            str(totals.stl),
            str(totals.tov),
            str(totals.blk),
            str(totals.pf),
            str(totals.eff),
            str(totals.pts),
            "",
            "",
        ]
    )
    rows.append(
        [
            "%",
            f"{totals.fg_pct * 100:.1f}",
            f"{totals.fg2_pct * 100:.1f}",
            f"{totals.fg3_pct * 100:.1f}",
            f"{totals.ft_pct * 100:.1f}",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ]
    )
    return _pdf_table(title, headers, rows)


def season_stats_pdf(report: SeasonReport, names: dict[str, str], title: str) -> bytes:
    headers = ["Player", "GP", "PTS", "PTS/G", "REB", "AST", "eFG%", "TS%"]
    rows = []
    for stats in report.players.values():
        rows.append(
            [
                names.get(stats.player_id, stats.player_id),
                str(stats.totals.games_played),
                str(stats.totals.pts),
                f"{stats.totals.average('pts'):.1f}",
                str(stats.totals.reb_tot),
                str(stats.totals.ast),
                f"{stats.totals.efg_pct * 100:.1f}",
                f"{stats.totals.ts_pct * 100:.1f}",
            ]
        )
    return _pdf_table(title, headers, rows)
