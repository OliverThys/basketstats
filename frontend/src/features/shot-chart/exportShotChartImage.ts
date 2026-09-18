export const SHOT_CHART_EXPORT_WIDTH = 1400;
export const SHOT_CHART_EXPORT_HEIGHT = 1500;

/** Clone an in-document court SVG into a standalone document suitable for
 * rasterization (explicit xmlns + size; presentation attributes already live
 * on the nodes so no stylesheet is required). */
export function prepareShotChartSvgForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(SHOT_CHART_EXPORT_WIDTH));
  clone.setAttribute("height", String(SHOT_CHART_EXPORT_HEIGHT));
  return clone;
}

/** Rasterizes an SVG element to a PNG and triggers a browser download. Kept
 * outside the component since it's a DOM/canvas side effect, not something
 * that benefits from a render test. */
export async function exportShotChartImage(svg: SVGSVGElement, filename: string): Promise<void> {
  const clone = prepareShotChartSvgForExport(svg);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to rasterize shot chart"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = SHOT_CHART_EXPORT_WIDTH;
    canvas.height = SHOT_CHART_EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(image, 0, 0, SHOT_CHART_EXPORT_WIDTH, SHOT_CHART_EXPORT_HEIGHT);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
