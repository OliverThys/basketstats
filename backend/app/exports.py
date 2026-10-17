"""CSV / PDF renderers for box score and season stats."""

from __future__ import annotations

import csv
from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.domain.box_score import GameBoxScore
from app.domain.season import SeasonReport
from app.domain.shot_zones import ShotZoneReport

# Brand palette shared with the frontend (see frontend/src/index.css).
_NAVY = colors.HexColor("#04281f")
_PANEL = colors.HexColor("#00573e")
_ORANGE = colors.HexColor("#facb09")
_SLATE = colors.HexColor("#1f6b52")
_MUTED = colors.HexColor("#64748b")
_ROW_ALT = colors.HexColor("#eef6f1")
_WHITE = colors.white

_LOGO_PATH = Path(__file__).parent / "assets" / "logo.png"

# Excel (Windows) only auto-detects UTF-8 CSVs when a BOM is present;
# without it accented characters (é, à, …) render as mojibake.
_CSV_BOM = "﻿"


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
    return _CSV_BOM + buffer.getvalue()


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
    return _CSV_BOM + buffer.getvalue()


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
    return _CSV_BOM + buffer.getvalue()


def _pdf_header_footer(title: str, subtitle: str | None):
    generated_at = datetime.now().strftime("%d/%m/%Y %H:%M")

    def _draw(canvas, doc):
        canvas.saveState()
        page_w, page_h = doc.pagesize

        # Brand header bar, echoing the app's dark navy / orange palette.
        canvas.setFillColor(_NAVY)
        canvas.rect(0, page_h - 44, page_w, 44, stroke=0, fill=1)
        canvas.setFillColor(_ORANGE)
        canvas.rect(0, page_h - 47, page_w, 3, stroke=0, fill=1)
        canvas.setFillColor(_WHITE)
        canvas.setFont("Helvetica-Bold", 14)
        text_x = 24
        if _LOGO_PATH.exists():
            canvas.drawImage(
                str(_LOGO_PATH),
                20,
                page_h - 42,
                width=38,
                height=38,
                mask="auto",
                preserveAspectRatio=True,
            )
            text_x = 66
        canvas.drawString(text_x, page_h - 29, "BasketStats")
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#cfe5da"))
        canvas.drawRightString(page_w - 24, page_h - 29, title)

        # Footer: generation timestamp + page number.
        canvas.setStrokeColor(_SLATE)
        canvas.setLineWidth(0.5)
        canvas.line(24, 28, page_w - 24, 28)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(_MUTED)
        footer_left = f"Généré le {generated_at}" + (f" · {subtitle}" if subtitle else "")
        canvas.drawString(24, 16, footer_left)
        canvas.drawRightString(page_w - 24, 16, f"Page {doc.page}")
        canvas.restoreState()

    return _draw


def _with_legend_aside(table, legend, table_width, page_width, styles):
    """Places a vertical abbreviation legend to the right of the main table."""
    gap = 14
    legend_width = page_width - table_width - gap
    abbr_style = ParagraphStyle(
        "LegendAbbr", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9
    )
    text_style = ParagraphStyle(
        "LegendText", parent=styles["Normal"], textColor=_SLATE, fontSize=7.5, leading=9
    )
    rows = [[Paragraph("Légende", abbr_style), ""]]
    rows += [
        [Paragraph(abbr, abbr_style), Paragraph(meaning, text_style)] for abbr, meaning in legend
    ]
    legend_table = Table(rows, colWidths=[44, legend_width - 44])
    legend_table.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (-1, 0)),
                ("BACKGROUND", (0, 0), (-1, 0), _ROW_ALT),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, _ORANGE),
                ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#cfe5da")),
                ("LINEBELOW", (0, 1), (-1, -2), 0.25, colors.HexColor("#cfe5da")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    outer = Table([[table, legend_table]], colWidths=[table_width + gap, legend_width])
    outer.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), gap),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return outer


def _pdf_table(
    title: str,
    headers: list[str],
    rows: list[list[str]],
    *,
    subtitle: str | None = None,
    highlight_rows: tuple[int, ...] = (),
    legend: list[tuple[str, str]] | None = None,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=24,
        rightMargin=24,
        topMargin=58,
        bottomMargin=40,
        title=title,
        author="BasketStats",
    )
    styles = getSampleStyleSheet()
    subtitle_style = ParagraphStyle(
        "ExportSubtitle",
        parent=styles["Normal"],
        textColor=_MUTED,
        fontSize=9,
        spaceAfter=10,
        alignment=TA_LEFT,
    )
    heading_style = ParagraphStyle(
        "ExportHeading",
        parent=styles["Heading1"],
        textColor=_NAVY,
        fontSize=16,
        spaceAfter=2,
    )

    name_col = headers.index("Player")
    data = [headers, *rows]
    col_widths = None
    if legend:
        col_widths = [28 if h == "N°" else 118 if h == "Player" else 34 for h in headers]
    table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")

    style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), _PANEL),
        ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cfe5da")),
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, _ORANGE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _ROW_ALT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (name_col, 0), (name_col, -1), "LEFT"),
    ]
    for row_index in highlight_rows:
        style_commands.extend(
            [
                ("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#fef3c7")),
                ("FONTNAME", (0, row_index), (-1, row_index), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, row_index), (-1, row_index), _NAVY),
            ]
        )
    table.setStyle(TableStyle(style_commands))

    story: list = [Paragraph(title, heading_style)]
    if subtitle:
        story.append(Paragraph(subtitle, subtitle_style))
    else:
        story.append(Spacer(1, 12))
    if legend:
        story.append(_with_legend_aside(table, legend, sum(col_widths), doc.width, styles))
    else:
        story.append(table)

    draw = _pdf_header_footer(title, subtitle)
    doc.build(story, onFirstPage=draw, onLaterPages=draw)
    return buffer.getvalue()


_BOX_SCORE_LEGEND = [
    ("N°", "numéro de maillot"),
    ("FGM-A", "tirs réussis-tentés"),
    ("2P / 3P", "tirs à 2 / 3 points réussis-tentés"),
    ("FT", "lancers francs réussis-tentés"),
    ("REB", "rebonds"),
    ("AST", "passes décisives"),
    ("ST", "interceptions"),
    ("TO", "balles perdues"),
    ("BS", "contres"),
    ("PF", "fautes commises"),
    ("FPF", "fautes provoquées"),
    ("PTS", "points"),
    ("%", "pourcentage de réussite (tirs, 2P, 3P, FT)"),
]


def box_score_pdf(
    box: GameBoxScore,
    names: dict[str, str],
    title: str,
    numbers: dict[str, int] | None = None,
) -> bytes:
    numbers = numbers or {}
    headers = [
        "N°",
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
        "FPF",
        "PTS",
    ]
    rows = []
    by_jersey = sorted(
        box.players.values(), key=lambda row: numbers.get(row.player_id, float("inf"))
    )
    for row in by_jersey:
        number = numbers.get(row.player_id)
        rows.append(
            [
                "" if number is None else str(number),
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
                str(row.fpf),
                str(row.pts),
            ]
        )
    totals = box.totals
    rows.append(
        [
            "",
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
            str(totals.fpf),
            str(totals.pts),
        ]
    )
    rows.append(
        [
            "",
            "%",
            f"{totals.fg_pct * 100:.1f}",
            f"{totals.fg2_pct * 100:.1f}",
            f"{totals.fg3_pct * 100:.1f}",
            f"{totals.ft_pct * 100:.1f}",
            *[""] * 8,
        ]
    )
    return _pdf_table(
        title,
        headers,
        rows,
        highlight_rows=(len(rows) - 1, len(rows)),
        legend=_BOX_SCORE_LEGEND,
    )


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
    plural = "s" if report.games != 1 else ""
    subtitle = f"{report.games} match{plural} joué{plural}"
    return _pdf_table(title, headers, rows, subtitle=subtitle)
