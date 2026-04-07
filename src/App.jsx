import { useEffect, useMemo, useState } from "react";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQe-0PiYFN5GbupEqeh1ooMnwnPlIEvzA5ftv9ZxkD7jym5qSug8RbXxuf8JzGejlcziiL37Wx-V12G/pub?gid=216492206&single=true&output=csv";

const fallbackRows = [
  { Rol: "Lunch Bar", ma: "Joany", di: "Joany", wo: "Nancy", do: "Nancy", vr: "Steven", za: "", zo: "Guy" },
  { Rol: "Lunch Zaal 1", ma: "Nancy", di: "", wo: "Joany", do: "Joany", vr: "Joany", za: "", zo: "Christelle" },
  { Rol: "Lunch Zaal 2", ma: "Christelle", di: "", wo: "", do: "", vr: "", za: "", zo: "" },
  { Rol: "Lunch Zaal 3", ma: "Guy", di: "", wo: "", do: "", vr: "", za: "", zo: "" },
  { Rol: "Lunch Extra", ma: "", di: "", wo: "", do: "", vr: "", za: "", zo: "" },
  { Rol: "Avond Bar", ma: "Steven", di: "Steven", wo: "Steven", do: "Niels", vr: "Steven", za: "", zo: "Guy" },
  { Rol: "Avond Zaal 1", ma: "Guy", di: "Christelle", wo: "Christelle", do: "Christelle", vr: "Christelle", za: "", zo: "Christelle" },
  { Rol: "Avond Zaal 2", ma: "Christelle", di: "", wo: "Indy", do: "Guy", vr: "Guy", za: "", zo: "" },
  { Rol: "Avond Extra", ma: "Lana", di: "", wo: "", do: "", vr: "", za: "", zo: "" },
  { Rol: "Avond Extra", ma: "Skye", di: "", wo: "", do: "", vr: "", za: "", zo: "" },
];

const controlRows = {
  ma: { lunchStatus: "OK", avondStatus: "OK", dagstatus: "OK" },
  di: { lunchStatus: "0/1", avondStatus: "1/2", dagstatus: "TEKORT" },
  wo: { lunchStatus: "OK", avondStatus: "OK", dagstatus: "OK" },
  do: { lunchStatus: "OK", avondStatus: "OK", dagstatus: "OK" },
  vr: { lunchStatus: "OK", avondStatus: "OK", dagstatus: "OK" },
  za: { lunchStatus: "GESLOTEN", avondStatus: "GESLOTEN", dagstatus: "GESLOTEN" },
  zo: { lunchStatus: "OK", avondStatus: "1/2", dagstatus: "TEKORT" },
};

const dayMeta = [
  { key: "ma", day: "Maandag" },
  { key: "di", day: "Dinsdag" },
  { key: "wo", day: "Woensdag" },
  { key: "do", day: "Donderdag" },
  { key: "vr", day: "Vrijdag" },
  { key: "za", day: "Zaterdag" },
  { key: "zo", day: "Zondag" },
];

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function fetchSheetData() {
  const res = await fetch(SHEET_URL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  const lines = text
   .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function uniqueFilled(items) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean).filter((item) => item !== "-"))];
}

function buildWeekFromSheet(rows) {
  return dayMeta.map((meta) => {
    const getRows = (prefix) => rows.filter((row) => row.Rol?.startsWith(prefix));
    const getSingle = (role) => rows.find((row) => row.Rol === role)?.[meta.key] || "-";

    const lunchZaal = uniqueFilled(getRows("Lunch Zaal").map((row) => row[meta.key]));
    const lunchExtra = uniqueFilled(getRows("Lunch Extra").map((row) => row[meta.key]));
    const avondZaal = uniqueFilled(getRows("Avond Zaal").map((row) => row[meta.key]));
    const avondExtra = uniqueFilled(getRows("Avond Extra").map((row) => row[meta.key]));

    return {
      ...meta,
      status: controlRows[meta.key].dagstatus === "TEKORT" ? "Opletten" : controlRows[meta.key].dagstatus,
      lunch: {
        bar: getSingle("Lunch Bar"),
        zaal: lunchZaal.length ? lunchZaal : ["-"],
        extra: lunchExtra.length ? lunchExtra : ["-"],
        status: controlRows[meta.key].lunchStatus,
      },
      avond: {
        bar: getSingle("Avond Bar"),
        zaal: avondZaal.length ? avondZaal : ["-"],
        extra: avondExtra.length ? avondExtra : ["-"],
        status: controlRows[meta.key].avondStatus,
      },
    };
  });
}

function PeopleStack({ items }) {
  return (
    <div className="mt-2 space-y-1.5">
      {items.map((item, idx) => (
        <div key={`${item}-${idx}`} className="rounded-xl bg-zinc-100 px-2.5 py-1.5 text-sm font-medium text-zinc-800">
          {item}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, bar, zaal, extra, status }) {
  return (
    <section className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
          {status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Bar</div>
          <div className="mt-2 text-sm font-medium text-zinc-800">{bar}</div>
        </div>

        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Zaal</div>
          <PeopleStack items={zaal} />
        </div>

        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Extra</div>
          <PeopleStack items={extra} />
        </div>
      </div>
    </section>
  );
}

export default function SodaZaalApp() {
  const [sheetRows, setSheetRows] = useState(fallbackRows);
  const [isLive, setIsLive] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchSheetData()
      .then((rows) => {
        if (!isMounted || !rows.length) return;
        setSheetRows(rows);
        setIsLive(true);
        setLoadError("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setIsLive(false);
        setLoadError(error instanceof Error ? error.message : "Live sheet niet bereikbaar");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const weekData = useMemo(() => buildWeekFromSheet(sheetRows), [sheetRows]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-3 pb-24 pt-4">
        <header className="mb-3 rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Brasserie Soda</p>
              <h1 className="mt-1 text-2xl font-semibold leading-none">Zaalrooster</h1>
              <p className="mt-2 text-sm text-zinc-500">Mobiele leesversie voor zaal. Snel, simpel, bruikbaar.</p>
            </div>
            <div className="rounded-2xl bg-zinc-900 px-3 py-2 text-right text-white shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-300">Data</div>
              <div className="mt-1 text-sm font-semibold">{isLive ? "Live sheet" : "Fallback"}</div>
            </div>
          </div>

          {loadError ? (
            <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              Live koppeling niet geladen. Fallback actief.
            </div>
          ) : null}
        </header>

        <main className="space-y-3">
          {weekData.map((day) => (
            <article key={day.day} className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-zinc-200">
              <div className="px-4 pb-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold leading-none">{day.day}</h2>
                  <span className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 bg-zinc-100 text-zinc-700 ring-zinc-200">
                    {day.status}
                  </span>
                </div>

                {day.status === "GESLOTEN" ? (
                  <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-500 ring-1 ring-zinc-200">
                    Geen lunch of avondservice.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <SectionCard
                      title="Lunch"
                      bar={day.lunch.bar}
                      zaal={day.lunch.zaal}
                      extra={day.lunch.extra}
                      status={day.lunch.status}
                    />
                    <SectionCard
                      title="Avond"
                      bar={day.avond.bar}
                      zaal={day.avond.zaal}
                      extra={day.avond.extra}
                      status={day.avond.status}
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </main>
      </div>
    </div>
  );
}
