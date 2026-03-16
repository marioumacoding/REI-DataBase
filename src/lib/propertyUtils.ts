import type { Property } from "@/lib/types";

export const NONE_COLUMN = "-- None --";

const STATE_MAP: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR",
  California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS",
  Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY", Bama: "AL", Cali: "CA",
};

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

interface ParsedCsvMatrix {
  rows: string[][];
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits[0] === "1") return digits.slice(1);
  return null;
}

export function normalizeState(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const titled = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return STATE_MAP[trimmed] || STATE_MAP[titled] || trimmed.toUpperCase();
}

export function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function dedupeHeaders(rawHeaders: string[]): string[] {
  const seen: Record<string, number> = {};
  return rawHeaders.map((header) => {
    const key = header.toLowerCase().trim();
    seen[key] = (seen[key] ?? 0) + 1;
    return seen[key] > 1 ? `${header} (${seen[key]})` : header;
  });
}

export function detectCol(headers: string[], keywords: string[]): string {
  for (const keyword of keywords) {
    const found = headers.find((header) => header.toLowerCase().includes(keyword));
    if (found) return found;
  }
  return NONE_COLUMN;
}

function parseCsvMatrix(text: string): ParsedCsvMatrix {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      const hasAnyValue = row.some((cell) => cell.trim() !== "");
      if (hasAnyValue) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  return { rows };
}

export function parseCSV(text: string): CsvParseResult {
  const matrix = parseCsvMatrix(text);
  if (!matrix.rows.length) return { headers: [], rows: [] };

  const headers = dedupeHeaders(matrix.rows[0].map((header) => header.trim()));
  const rows = matrix.rows.slice(1).map((values) => {
    const rowObject: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObject[header] = values[index] ?? "";
    });
    return rowObject;
  });

  return { headers, rows };
}

export function gv(row: Record<string, string>, col: string): string {
  return col !== NONE_COLUMN ? (row[col] ?? "").trim() : "";
}

export function isPhoneCol(header: string): boolean {
  const lower = header.toLowerCase().trim();
  if (lower.endsWith("_type")) return false;
  return (
    lower.includes("phone") ||
    lower.includes("mobile") ||
    lower.includes("cell") ||
    /\btel\b/.test(lower) ||
    /^remote([\s_-]?\d*)?$/.test(lower)
  );
}

export interface ImportColumnMap {
  first: string;
  last: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  client: string;
  mailingAddress: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  phone1: string;
  phone2: string;
  phone3: string;
  email1: string;
  email2: string;
  email3: string;
}

function cleanZip(value: string): string {
  return value.split(".")[0].trim();
}

export function mapImportRow(row: Record<string, string>, map: ImportColumnMap, todayIsoDate: string): Record<string, string | null> {
  const mailingAddress = gv(row, map.mailingAddress) || gv(row, map.address);
  const mailingCity = gv(row, map.mailingCity) || gv(row, map.city);
  const mailingState = gv(row, map.mailingState) || gv(row, map.state);
  const mailingZip = gv(row, map.mailingZip) || gv(row, map.zip);

  const phone1 = normalizePhone(gv(row, map.phone1));
  const phone2 = normalizePhone(gv(row, map.phone2));
  const phone3 = normalizePhone(gv(row, map.phone3));

  return {
    first_name: toTitleCase(gv(row, map.first)) || "Unknown",
    last_name: toTitleCase(gv(row, map.last)) || "Unknown",
    address: toTitleCase(gv(row, map.address)),
    city: toTitleCase(gv(row, map.city)),
    state: normalizeState(gv(row, map.state)),
    zipcode: cleanZip(gv(row, map.zip)),
    client_name: gv(row, map.client) || "Not Provided",
    mailing_address: toTitleCase(mailingAddress) || null,
    mailing_city: toTitleCase(mailingCity) || null,
    mailing_state: normalizeState(mailingState) || null,
    mailing_zip: cleanZip(mailingZip) || null,
    phone_1: phone1,
    phone_2: phone2,
    phone_3: phone3,
    email_1: gv(row, map.email1).toLowerCase() || null,
    email_2: gv(row, map.email2).toLowerCase() || null,
    email_3: gv(row, map.email3).toLowerCase() || null,
    last_seen_1: phone1 ? todayIsoDate : null,
    last_seen_2: phone2 ? todayIsoDate : null,
    last_seen_3: phone3 ? todayIsoDate : null,
  };
}

export function buildPropertyKey(address: string, city: string, state: string, zipcode: string): string {
  return [address, city, state, zipcode]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");
}

export function hasWrongNumber(property: Pick<Property, "wrong_1" | "wrong_2" | "wrong_3">): boolean {
  return property.wrong_1 === true || property.wrong_2 === true || property.wrong_3 === true;
}

export function hasNoWrongNumbers(property: Pick<Property, "wrong_1" | "wrong_2" | "wrong_3">): boolean {
  return !hasWrongNumber(property);
}
