import { describe, expect, it } from "vitest";

import {
  prepareShotChartSvgForExport,
  SHOT_CHART_EXPORT_HEIGHT,
  SHOT_CHART_EXPORT_WIDTH,
} from "./exportShotChartImage";

describe("prepareShotChartSvgForExport", () => {
  it("clones the court SVG as a standalone document with explicit size", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("fill", "#b45309");
    svg.appendChild(rect);

    const clone = prepareShotChartSvgForExport(svg);

    expect(clone).not.toBe(svg);
    expect(clone.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(clone.getAttribute("width")).toBe(String(SHOT_CHART_EXPORT_WIDTH));
    expect(clone.getAttribute("height")).toBe(String(SHOT_CHART_EXPORT_HEIGHT));
    expect(clone.querySelector("rect")?.getAttribute("fill")).toBe("#b45309");
  });
});
