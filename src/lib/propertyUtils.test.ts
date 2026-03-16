import { describe, expect, it } from "vitest";
import {
  NONE_COLUMN,
  buildPropertyKey,
  hasNoWrongNumbers,
  hasWrongNumber,
  mapImportRow,
  parseCSV,
} from "@/lib/propertyUtils";

describe("propertyUtils.parseCSV", () => {
  it("parses quoted commas, escaped quotes, and multiline cells", () => {
    const csv = [
      "name,address,notes",
      '"John ""Johnny"" Doe","123 Main St, Apt 4","Line one"',
      '"Jane Doe","99 Oak St","First line',
      'Second line"',
    ].join("\n");

    const { headers, rows } = parseCSV(csv);

    expect(headers).toEqual(["name", "address", "notes"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('John "Johnny" Doe');
    expect(rows[0].address).toBe("123 Main St, Apt 4");
    expect(rows[1].notes).toBe("First line\nSecond line");
  });
});

describe("propertyUtils.mapImportRow", () => {
  it("maps import rows with fallbacks and normalization", () => {
    const mapped = mapImportRow(
      {
        "First Name": "jane",
        "Last Name": "DOE",
        Address: "123 main st",
        City: "austin",
        State: "texas",
        Zip: "78701.0",
        Client: "Core Team",
        MailingAddress: "",
        MailingCity: "",
        MailingState: "",
        MailingZip: "",
        Phone1: "(512) 555-0100",
        Phone2: "invalid",
        Phone3: "",
        Email1: "JANE@EXAMPLE.COM",
        Email2: "",
        Email3: "",
      },
      {
        first: "First Name",
        last: "Last Name",
        address: "Address",
        city: "City",
        state: "State",
        zip: "Zip",
        client: "Client",
        mailingAddress: "MailingAddress",
        mailingCity: "MailingCity",
        mailingState: "MailingState",
        mailingZip: "MailingZip",
        phone1: "Phone1",
        phone2: "Phone2",
        phone3: "Phone3",
        email1: "Email1",
        email2: "Email2",
        email3: "Email3",
      },
      "2026-03-16"
    );

    expect(mapped.first_name).toBe("Jane");
    expect(mapped.last_name).toBe("Doe");
    expect(mapped.state).toBe("TX");
    expect(mapped.zipcode).toBe("78701");
    expect(mapped.mailing_address).toBe("123 Main St");
    expect(mapped.phone_1).toBe("5125550100");
    expect(mapped.phone_2).toBeNull();
    expect(mapped.last_seen_1).toBe("2026-03-16");
    expect(mapped.last_seen_2).toBeNull();
    expect(mapped.email_1).toBe("jane@example.com");
  });

  it("supports unmapped columns via NONE_COLUMN", () => {
    const mapped = mapImportRow(
      {
        Address: "1 Main",
        City: "Dallas",
        State: "TX",
        Zip: "75001",
      },
      {
        first: NONE_COLUMN,
        last: NONE_COLUMN,
        address: "Address",
        city: "City",
        state: "State",
        zip: "Zip",
        client: NONE_COLUMN,
        mailingAddress: NONE_COLUMN,
        mailingCity: NONE_COLUMN,
        mailingState: NONE_COLUMN,
        mailingZip: NONE_COLUMN,
        phone1: NONE_COLUMN,
        phone2: NONE_COLUMN,
        phone3: NONE_COLUMN,
        email1: NONE_COLUMN,
        email2: NONE_COLUMN,
        email3: NONE_COLUMN,
      },
      "2026-03-16"
    );

    expect(mapped.first_name).toBe("Unknown");
    expect(mapped.last_name).toBe("Unknown");
    expect(mapped.client_name).toBe("Not Provided");
  });
});

describe("property key and wrong-number helpers", () => {
  it("builds case-insensitive dedupe keys", () => {
    const a = buildPropertyKey("123 MAIN ST", "Austin", "TX", "78701");
    const b = buildPropertyKey(" 123 main st ", "AUSTIN", "tx", "78701");
    expect(a).toBe(b);
  });

  it("detects wrong numbers across all slots", () => {
    expect(hasWrongNumber({ wrong_1: false, wrong_2: true, wrong_3: false })).toBe(true);
    expect(hasNoWrongNumbers({ wrong_1: null, wrong_2: false, wrong_3: false })).toBe(true);
  });
});
