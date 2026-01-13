import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export function parseCSVSync(text: string) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export function buildCSV(rows: any[], columns: string[]) {
  return stringify(rows, { header: true, columns });
}
