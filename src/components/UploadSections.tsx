import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, ArrowUpFromLine, ArrowDownToLine, FileUp, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  NONE_COLUMN,
  buildPropertyKey,
  detectCol,
  gv,
  isPhoneCol,
  mapImportRow,
  normalizePhone,
  normalizeState,
  parseCSV,
  toTitleCase,
} from "@/lib/propertyUtils";

const NONE = NONE_COLUMN;

// ─── shared ColSelect ────────────────────────────────────────────────────────

function ColSelect({ label, value, onChange, opts }: {
  label: string; value: string; onChange: (v: string) => void; opts: string[];
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs bg-muted/30 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {opts.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Wrong Number Dialog ──────────────────────────────────────────────────────

const WrongNumberDialog = () => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [wnText, setWnText] = useState("wrong num");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFile = async (f: File | null) => {
    setFile(f); setResult(null);
    if (!f) return;
    const { headers: h, rows: r } = parseCSV(await f.text());
    setHeaders(h); setRows(r);
    const pCols = h.filter(isPhoneCol);
    const sCols = h.filter((c) => ["status","wrong","disposition","result","outcome","log","type"].some((k) => c.toLowerCase().includes(k)));
    setPairs(pCols.map((p, i) => [p, sCols[i] ?? NONE]));
  };

  const process = async () => {
    setLoading(true); setResult(null);
    try {
      const usedPairs = pairs.filter(([p, s]) => p !== NONE && s !== NONE);
      if (!usedPairs.length) { setResult("⚠️ Map at least one Phone ↔ Status pair."); return; }

      // Fetch all phone data (parallel paginated)
      const { count: phoneCount } = await supabase.from("properties").select("*", { count: "exact", head: true });
      const phoneTotalPages = Math.ceil((phoneCount ?? 0) / 1000);
      const allProps: any[] = [];
      for (let batch = 0; batch < phoneTotalPages; batch += 10) {
        const results = await Promise.all(
          Array.from({ length: Math.min(10, phoneTotalPages - batch) }, (_, i) => {
            const from = (batch + i) * 1000;
            return supabase.from("properties").select("id, phone_1, phone_2, phone_3").range(from, from + 999);
          })
        );
        for (const { data, error } of results) {
          if (error) throw error;
          allProps.push(...(data ?? []));
        }
      }

      // Build phone → [{id, slot}] lookup
      type Slot = "wrong_1" | "wrong_2" | "wrong_3";
      const lookup = new Map<string, { id: number; slot: Slot }[]>();
      for (const prop of allProps ?? []) {
        const entries: [string | null, Slot][] = [
          [prop.phone_1, "wrong_1"], [prop.phone_2, "wrong_2"], [prop.phone_3, "wrong_3"],
        ];
        for (const [phone, slot] of entries) {
          if (phone) {
            if (!lookup.has(phone)) lookup.set(phone, []);
            lookup.get(phone)!.push({ id: prop.id, slot });
          }
        }
      }

      // Process CSV rows → collect updates
      const updates = new Map<number, Partial<Record<Slot, boolean>>>();
      let flagged = 0, skipped = 0;
      for (const row of rows) {
        for (const [phoneCol, statusCol] of usedPairs) {
          if (!gv(row, statusCol).toLowerCase().includes(wnText.toLowerCase())) continue;
          const phone = normalizePhone(gv(row, phoneCol));
          if (!phone) { skipped++; continue; }
          const matches = lookup.get(phone);
          if (!matches?.length) { skipped++; continue; }
          for (const { id, slot } of matches) {
            if (!updates.has(id)) updates.set(id, {});
            updates.get(id)![slot] = true;
          }
          flagged++;
        }
      }

      // Apply all updates
      await Promise.all(
        Array.from(updates.entries()).map(([id, fields]) =>
          supabase.from("properties").update(fields).eq("id", id)
        )
      );

      setResult(`✅ ${flagged} number${flagged !== 1 ? "s" : ""} flagged | ${skipped} no match`);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const opts = [NONE, ...headers];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:!text-primary hover:!bg-primary/5 gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Wrong Numbers
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <ShieldAlert className="w-4 h-4 text-primary" /> Upload Wrong Numbers
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-4 pt-2">
            {/* File picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Choose CSV File</label>
              <Input type="file" accept=".csv"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                className="bg-muted/30 border-border text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:text-xs file:font-medium file:mr-3 file:cursor-pointer h-9"
              />
            </div>

            {file && headers.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                  <FileUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">{file.name}</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">{rows.length.toLocaleString()} rows</span>
                </div>

                {/* WN indicator text */}
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                    Wrong number indicator text (case-insensitive)
                  </label>
                  <Input value={wnText} onChange={(e) => setWnText(e.target.value)}
                    className="h-8 text-xs bg-muted/30 border-border" placeholder="e.g. wrong num" />
                </div>

                {/* Phone ↔ Status pairs */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Phone ↔ Status column pairs
                  </p>
                  {pairs.length === 0 && (
                    <p className="text-[11px] text-amber-500">⚠️ No phone columns detected. Check your file headers.</p>
                  )}
                  {pairs.map(([p, s], i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <ColSelect label={`Phone #${i + 1}`} value={p} opts={opts}
                        onChange={(v) => { const n = [...pairs]; n[i] = [v, s]; setPairs(n); }} />
                      <ColSelect label={`Status #${i + 1}`} value={s} opts={opts}
                        onChange={(v) => { const n = [...pairs]; n[i] = [p, v]; setPairs(n); }} />
                    </div>
                  ))}
                </div>

                {result && (
                  <div className={`px-3 py-2 rounded-lg border text-xs ${result.startsWith("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {result}
                  </div>
                )}

                <Button onClick={process} disabled={loading || pairs.filter(([p,s]) => p!==NONE&&s!==NONE).length===0}
                  size="sm" className="h-8 text-xs gap-1.5 w-full">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {loading ? "Processing…" : "Process File"}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// ─── Data Import Dialog ───────────────────────────────────────────────────────

const DataImportDialog = () => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);

  // Column mappings
  const [mFirst, setMFirst] = useState(NONE);
  const [mLast, setMLast] = useState(NONE);
  const [mAddr, setMAddr] = useState(NONE);
  const [mCity, setMCity] = useState(NONE);
  const [mState, setMState] = useState(NONE);
  const [mZip, setMZip] = useState(NONE);
  const [mClient, setMClient] = useState(NONE);
  const [mMAddr, setMMAddr] = useState(NONE);
  const [mMCity, setMMCity] = useState(NONE);
  const [mMState, setMMState] = useState(NONE);
  const [mMZip, setMMZip] = useState(NONE);
  const [mPhone1, setMPhone1] = useState(NONE);
  const [mPhone2, setMPhone2] = useState(NONE);
  const [mPhone3, setMPhone3] = useState(NONE);
  const [mEmail1, setMEmail1] = useState(NONE);
  const [mEmail2, setMEmail2] = useState(NONE);
  const [mEmail3, setMEmail3] = useState(NONE);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFile = async (f: File | null) => {
    setFile(f); setResult(null);
    if (!f) return;
    const { headers: h, rows: r } = parseCSV(await f.text());
    setHeaders(h); setRows(r);

    setMFirst(detectCol(h, ["first name", "first"]));
    setMLast(detectCol(h, ["last name", "second name", "surname", "last"]));
    setMAddr(detectCol(h, ["property address", "address"]));
    setMCity(detectCol(h, ["property city", "city"]));
    setMState(detectCol(h, ["property state", "state"]));
    setMZip(detectCol(h, ["property zip", "zip code", "zip"]));
    setMClient(detectCol(h, ["client"]));
    setMMAddr(detectCol(h, ["mailing address"]));
    setMMCity(detectCol(h, ["mailing city"]));
    setMMState(detectCol(h, ["mailing state"]));
    setMMZip(detectCol(h, ["mailing zip"]));

    const pCols = h.filter(isPhoneCol);
    const eCols = h.filter((c) => ["email","e-mail"].some((k) => c.toLowerCase().includes(k)));
    setMPhone1(pCols[0] ?? NONE);
    setMPhone2(pCols[1] ?? NONE);
    setMPhone3(pCols[2] ?? NONE);
    setMEmail1(eCols[0] ?? NONE);
    setMEmail2(eCols[1] ?? NONE);
    setMEmail3(eCols[2] ?? NONE);
  };

  const buildRow = (row: Record<string, string>) =>
    mapImportRow(
      row,
      {
        first: mFirst,
        last: mLast,
        address: mAddr,
        city: mCity,
        state: mState,
        zip: mZip,
        client: mClient,
        mailingAddress: mMAddr,
        mailingCity: mMCity,
        mailingState: mMState,
        mailingZip: mMZip,
        phone1: mPhone1,
        phone2: mPhone2,
        phone3: mPhone3,
        email1: mEmail1,
        email2: mEmail2,
        email3: mEmail3,
      },
      new Date().toISOString().slice(0, 10)
    );

  const insertToDB = async () => {
    setLoading(true); setResult(null);
    try {
      // 1. Map + basic validity filter
      const allMapped = rows.map(buildRow).filter((r) => r.address && r.city && r.state && r.zipcode);
      if (!allMapped.length) { setResult("⚠️ No valid rows — check address/city/state/zip mapping."); return; }

      // 2. Deduplicate within the CSV itself (handles re-uploading same file rows)
      // Key matches the DB unique constraint: address+city+state+zipcode (no client_name)
      const csvSeen = new Set<string>();
      const candidates = allMapped.filter((r) => {
        const key = buildPropertyKey(r.address, r.city, r.state, r.zipcode);
        if (csvSeen.has(key)) return false;
        csvSeen.add(key);
        return true;
      });
      const csvDups = allMapped.length - candidates.length;

      // 3. Fetch all existing (address, city, state, zipcode) from DB
      //    Uses the same parallel pagination pattern — no DB constraint required.
      const { count: existingCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true });
      const totalPages = Math.ceil((existingCount ?? 0) / 1000);
      const existingKeys = new Set<string>();
      for (let batch = 0; batch < totalPages; batch += 10) {
        const results = await Promise.all(
          Array.from({ length: Math.min(10, totalPages - batch) }, (_, i) => {
            const from = (batch + i) * 1000;
            return supabase
              .from("properties")
              .select("address,city,state,zipcode")
              .range(from, from + 999);
          })
        );
        for (const { data, error } of results) {
          if (error) throw error;
          for (const p of data ?? []) {
            existingKeys.add(buildPropertyKey(p.address, p.city, p.state, p.zipcode));
          }
        }
      }

      // 4. Keep only genuinely new rows
      const newRows = candidates.filter((r) =>
        !existingKeys.has(buildPropertyKey(r.address, r.city, r.state, r.zipcode))
      );
      const dbDups = candidates.length - newRows.length;

      if (!newRows.length) {
        let msg = "ℹ️ All rows already exist in the database — nothing inserted.";
        if (csvDups > 0) msg += ` (${csvDups.toLocaleString()} in-CSV duplicates also skipped)`;
        setResult(msg);
        return;
      }

      // 5. Plain insert — no upsert, no constraint dependency
      let inserted = 0;
      const CHUNK = 500;
      for (let i = 0; i < newRows.length; i += CHUNK) {
        const { data, error } = await supabase
          .from("properties")
            .insert(newRows.slice(i, i + CHUNK) as unknown as Database["public"]["Tables"]["properties"]["Insert"][])
          .select("id");
        if (error) throw error;
        inserted += data?.length ?? 0;
      }

      let msg = `✅ ${inserted.toLocaleString()} inserted`;
      if (dbDups > 0) msg += `, ${dbDups.toLocaleString()} already in DB (skipped)`;
      if (csvDups > 0) msg += `, ${csvDups.toLocaleString()} duplicate rows in CSV (skipped)`;
      setResult(msg);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const enrichAndDownload = async () => {
    if (mAddr === NONE || mCity === NONE || mState === NONE) {
      setResult("⚠️ Address, City and State columns are required for enrichment.");
      return;
    }
    setLoading(true); setResult(null);
    try {
      // Fetch all DB properties (parallel paginated)
      const { count: propCount } = await supabase.from("properties").select("*", { count: "exact", head: true });
      const propTotalPages = Math.ceil((propCount ?? 0) / 1000);
      const dbProps: any[] = [];
      for (let batch = 0; batch < propTotalPages; batch += 10) {
        const results = await Promise.all(
          Array.from({ length: Math.min(10, propTotalPages - batch) }, (_, i) => {
            const from = (batch + i) * 1000;
            return supabase.from("properties").select("*").range(from, from + 999);
          })
        );
        for (const { data, error } of results) {
          if (error) throw error;
          dbProps.push(...(data ?? []));
        }
      }

      // Build lookup by normalized address key
      const dbMap = new Map<string, typeof dbProps[0]>();
      for (const p of dbProps ?? []) {
        dbMap.set(buildPropertyKey(p.address, p.city, p.state, p.zipcode), p);
      }

      let matched = 0;
      const enriched = rows.map((row) => {
        const addr = toTitleCase(gv(row, mAddr));
        const city = toTitleCase(gv(row, mCity));
        const state = normalizeState(gv(row, mState));
        const zip = gv(row, mZip).split(".")[0];
        const db = dbMap.get(buildPropertyKey(addr, city, state, zip));
        if (!db) return row;
        matched++;
        return {
          ...row,
          Client_Name: db.client_name ?? "",
          First_Name: db.first_name ?? "",
          Last_Name: db.last_name ?? "",
          Mailing_address: db.mailing_address ?? "",
          Mailing_city: db.mailing_city ?? "",
          Mailing_state: db.mailing_state ?? "",
          Mailing_zip: db.mailing_zip ?? "",
          Phone_1: db.phone_1 ?? "",
          Wrong_1: String(db.wrong_1 ?? false),
          Wrong1_LastSeen: db.last_seen_1,
          Phone_2: db.phone_2 ?? "",
          Wrong2_LastSeen: db.last_seen_2,
          Wrong_2: String(db.wrong_2 ?? false),
          Phone_3: db.phone_3 ?? "",
          Wrong3_LastSeen: db.last_seen_3,
          Wrong_3: String(db.wrong_3 ?? false),
          Email_1: db.email_1 ?? "",
          Email_2: db.email_2 ?? "",
          Email_3: db.email_3 ?? "",
        };
      });

      // Build and download CSV
      const allKeys = Array.from(new Set(enriched.flatMap(Object.keys)));
      const csvLines = [
        allKeys.join(","),
        ...enriched.map((r) =>
          allKeys.map((k) => `"${String((r as any)[k] ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ];
      const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `enriched_${file!.name}`;
      a.click();
      URL.revokeObjectURL(objectUrl);

      setResult(`✅ ${matched.toLocaleString()} / ${rows.length.toLocaleString()} rows matched`);
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const opts = [NONE, ...headers];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:!text-primary hover:!bg-primary/5 gap-1.5">
          <ArrowUpFromLine className="w-3.5 h-3.5" /> Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <ArrowUpFromLine className="w-4 h-4 text-primary" /> Import Data
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-2">
          <div className="space-y-4 pt-2">
            {/* File picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Choose CSV File</label>
              <Input type="file" accept=".csv"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                className="bg-muted/30 border-border text-foreground file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:text-xs file:font-medium file:mr-3 file:cursor-pointer h-9"
              />
            </div>

            {file && headers.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                  <FileUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">{file.name}</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">{rows.length.toLocaleString()} rows · {headers.length} cols</span>
                </div>

                {/* Column mapping */}
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Column Mapping</p>

                  <div className="grid grid-cols-3 gap-2">
                    <ColSelect label="First Name" value={mFirst} opts={opts} onChange={setMFirst} />
                    <ColSelect label="Last Name" value={mLast} opts={opts} onChange={setMLast} />
                    <ColSelect label="Client Name" value={mClient} opts={opts} onChange={setMClient} />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <ColSelect label="Address *" value={mAddr} opts={opts} onChange={setMAddr} />
                    <ColSelect label="City *" value={mCity} opts={opts} onChange={setMCity} />
                    <ColSelect label="State *" value={mState} opts={opts} onChange={setMState} />
                    <ColSelect label="Zip" value={mZip} opts={opts} onChange={setMZip} />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <ColSelect label="Mailing Address" value={mMAddr} opts={opts} onChange={setMMAddr} />
                    <ColSelect label="Mailing City" value={mMCity} opts={opts} onChange={setMMCity} />
                    <ColSelect label="Mailing State" value={mMState} opts={opts} onChange={setMMState} />
                    <ColSelect label="Mailing Zip" value={mMZip} opts={opts} onChange={setMMZip} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ColSelect label="Phone 1" value={mPhone1} opts={opts} onChange={setMPhone1} />
                    <ColSelect label="Phone 2" value={mPhone2} opts={opts} onChange={setMPhone2} />
                    <ColSelect label="Phone 3" value={mPhone3} opts={opts} onChange={setMPhone3} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ColSelect label="Email 1" value={mEmail1} opts={opts} onChange={setMEmail1} />
                    <ColSelect label="Email 2" value={mEmail2} opts={opts} onChange={setMEmail2} />
                    <ColSelect label="Email 3" value={mEmail3} opts={opts} onChange={setMEmail3} />
                  </div>
                </div>

                {result && (
                  <div className={`px-3 py-2 rounded-lg border text-xs ${result.startsWith("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {result}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={insertToDB} disabled={loading || mAddr === NONE || mCity === NONE || mState === NONE}
                    size="sm" className="h-8 text-xs gap-1.5 flex-1">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                    {loading ? "Inserting…" : "Insert to DB"}
                  </Button>
                  <Button onClick={enrichAndDownload} disabled={loading || mAddr === NONE || mCity === NONE || mState === NONE}
                    variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-1 border-border text-muted-foreground">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                    {loading ? "Working…" : "Enrich & Download"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────

const UploadSections = () => (
  <div className="flex items-center gap-2">
    <WrongNumberDialog />
    <DataImportDialog />
  </div>
);

export default UploadSections;
