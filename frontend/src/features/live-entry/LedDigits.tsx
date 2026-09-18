// Classic 5x7 LED dot-matrix digit bitmaps, so scores render as lit/unlit
// dots (like a real scoreboard) instead of a regular digital font.
const DIGIT_BITMAPS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

function LedDigit({ digit }: { digit: string }) {
  const bitmap = DIGIT_BITMAPS[digit] ?? DIGIT_BITMAPS["0"];
  return (
    <span className="led-digit">
      {bitmap.map((row, rowIndex) => (
        <span key={rowIndex} className="led-digit-row">
          {row.split("").map((bit, colIndex) => (
            <span key={colIndex} className={bit === "1" ? "led-dot lit" : "led-dot"} />
          ))}
        </span>
      ))}
    </span>
  );
}

interface LedNumberProps {
  value: number;
  digits?: number;
}

/** Renders `value` as a row of dot-matrix LED digits, left-padded with
 * zeros to `digits` places (default 2, as on a real scoreboard). */
export function LedNumber({ value, digits = 2 }: LedNumberProps) {
  const text = String(Math.max(0, value)).padStart(digits, "0");
  return (
    <span className="led-number">
      {text.split("").map((digit, index) => (
        <LedDigit key={index} digit={digit} />
      ))}
    </span>
  );
}
