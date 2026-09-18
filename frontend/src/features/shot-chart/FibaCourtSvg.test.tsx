import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BASKET_X_M, BASKET_Y_M, COURT_LENGTH_M, COURT_WIDTH_M, toCourtPoint } from "../../domain/court";
import { FibaCourtSvg } from "./FibaCourtSvg";

describe("FibaCourtSvg", () => {
  it("places markers using official half-court meters from normalized coordinates", () => {
    const hoop = toCourtPoint(BASKET_X_M / COURT_LENGTH_M, 0.5);
    render(
      <FibaCourtSvg
        markers={[
          { id: "hoop", x: BASKET_X_M / COURT_LENGTH_M, y: 0.5, made: true },
          { id: "corner", x: 1, y: 0, made: false },
        ]}
      />,
    );

    const made = document.querySelector(".shot-marker-made");
    expect(made).not.toBeNull();
    expect(Number(made?.getAttribute("cx"))).toBeCloseTo(hoop.x, 5);
    expect(Number(made?.getAttribute("cy"))).toBeCloseTo(BASKET_Y_M, 5);

    const miss = document.querySelector(".shot-marker-missed line");
    expect(miss).not.toBeNull();
    expect(Number(miss?.getAttribute("x1"))).toBeCloseTo(COURT_LENGTH_M - 0.25, 5);
    expect(Number(miss?.getAttribute("y1"))).toBeCloseTo(-0.25, 5);
  });

  it("renders a self-contained FIBA court (3pt line, key, backboard, rim)", () => {
    const { container } = render(<FibaCourtSvg markers={[]} />);
    const svg = container.querySelector("svg.fiba-court");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe(`0 0 ${COURT_LENGTH_M} ${COURT_WIDTH_M}`);
    expect(svg?.querySelectorAll("path").length).toBeGreaterThanOrEqual(4);
    expect(svg?.querySelector("rect.court-surface")).not.toBeNull();
    expect(svg?.querySelector("circle.court-rim")).not.toBeNull();
  });
});
