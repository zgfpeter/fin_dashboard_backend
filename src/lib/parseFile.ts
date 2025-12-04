import { parse } from "csv-parse/sync";

export default function ParseFile(buffer: Buffer | undefined) {
  if (!buffer) return []; // nothing to parse, maybe return an error?

  const text = buffer.toString("utf-8"); // convert bytes to string
  const records = parse(text, {
    columns: true, // first row as column names
    skip_empty_lines: true, // skip blank lines
  });

  return records; // array of objects, just like in my database
}

// after running this, should give me [{date:"2025-01-02",description:"Netflix",amount:"5"}]
