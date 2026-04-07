import { useEffect, useMemo, useRef, useState } from "react";

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
  { key: "ma", day: "Maandag", short: "Ma", jsDay: 1 },
  { key: "di", day: "Dinsdag", short: "Di", jsDay: 2 },
  { key: "wo", day: "Woensdag", short: "Wo", jsDay: 3 },
  { key: "do", day: "Donderdag", short: "Do", jsDay: 4 },
  { key: "vr", day: "Vrijdag", short: "Vr", jsDay: 5 },
  { key: "za", day: "Zaterdag", short: "Za", jsDay: 6 },
  { key: "zo", day: "Zondag", short: "Zo", jsDay: 0 },
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
    .split("
")
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

function getDayStatusClasses(status) {
  if (status === "Opletten") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (status === "GESLOTEN") return "bg-zinc-200 text-zinc-700 ring-zinc-300";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function getSectionStatusClasses(status) {
  if (status === "0/1" || status === "1/2") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (status === "GESLOTEN") return "bg-zinc-200 text-zinc-700 ring-zinc-300";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function getStatusDot(status) {
  if (status === "Opletten" || status === "0/1" || status === "1/2") return "bg-rose-500";
  if (status === "GESLOTEN") return "bg-zinc-400";
  return "bg-emerald-500";
}

function PeopleStack({ items, variant = "default" }) {
  const bgClass = variant === "extra" ? "bg-amber-50 text-amber-900 ring-amber-100" : "bg-zinc-100 text-zinc-800 ring-zinc-200";

  return (
    <div className="mt-2 space-y-1.5">
      {items.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          className={`rounded-xl px-2.5 py-2 text-sm font-semibold ring-1 ${bgClass}`}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, bar, zaal, extra, status }) {
  return (
    <section className="rounded-3xl bg-zinc-50 p-3 ring-1 ring-zinc-200 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusDot(status)}`} />
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${getSectionStatusClasses(status)}`}>
          {status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Bar</div>
          <div className="mt-2 rounded-xl bg-zinc-900 px-2.5 py-2 text-sm font-bold text-white shadow-sm">
            {bar}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Zaal</div>
          <PeopleStack items={zaal} />
        </div>

        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Extra</div>
          <PeopleStack items={extra} variant="extra" />
        </div>
      </div>
    </section>
  );
}

function DayCard({ day, isToday, registerRef }) {
  return (
    <article
      ref={registerRef}
      className={`overflow-hidden rounded-[30px] bg-white shadow-sm ring-1 ${
        isToday ? "ring-2 ring-amber-300 shadow-md" : "ring-zinc-200"
      }`}
    >
      <div className="px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black leading-none text-zinc-900">{day.day}</h2>
            {isToday ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900 ring-1 ring-amber-200">
                Vandaag
              </span>
            ) : null}
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${getDayStatusClasses(day.status)}`}>
            {day.status}
          </span>
        </div>

        {day.status === "GESLOTEN" ? (
          <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200">
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
  );
}

export default function SodaZaalApp() {
  const [sheetRows, setSheetRows] = useState(fallbackRows);
  const [isLive, setIsLive] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showWeek, setShowWeek] = useState(false);
  const dayRefs = useRef({});

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
  const todayJsDay = new Date().getDay();
  const todayItem = weekData.find((day) => day.jsDay === todayJsDay) ?? weekData[0] ?? null;

  const scrollToDay = (key) => {
    dayRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-100 to-zinc-200 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-3 pb-28 pt-4">
        <header className="sticky top-0 z-20 mb-3 rounded-[30px] bg-white/95 px-4 py-4 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Brasserie Soda</p>
              <h1 className="mt-1 text-[30px] font-black leading-none tracking-tight">Zaalrooster</h1>
              <p className="mt-2 text-sm font-medium text-zinc-500">Mobiele leesversie voor zaal. Snel, simpel, bruikbaar.</p>
            </div>
            <div className="rounded-2xl bg-zinc-900 px-3 py-2 text-right text-white shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-300">Data</div>
              <div className="mt-1 text-sm font-black">{isLive ? "Live" : "Fallback"}</div>
            </div>
          </div>

          {todayItem ? (
            <div className="mt-4 overflow-hidden rounded-[28px] bg-zinc-900 px-4 py-4 text-white shadow-md ring-1 ring-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Vandaag</div>
                  <div className="mt-1 text-3xl font-black leading-none">{todayItem.day}</div>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${getDayStatusClasses(todayItem.status)}`}>
                  {todayItem.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Lunch</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{todayItem.lunch.bar}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${getSectionStatusClasses(todayItem.lunch.status)}`}>
                      {todayItem.lunch.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Avond</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{todayItem.avond.bar}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${getSectionStatusClasses(todayItem.avond.status)}`}>
                      {todayItem.avond.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {weekData.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => {
                  setShowWeek(true);
                  setTimeout(() => scrollToDay(day.key), 50);
                }}
                className={`rounded-full px-3 py-2 text-xs font-black ring-1 whitespace-nowrap transition ${
                  day.jsDay === todayJsDay
                    ? "bg-amber-100 text-amber-900 ring-amber-200"
                    : "bg-white text-zinc-700 ring-zinc-200"
                }`}
              >
                {day.short}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowWeek(false)}
              className={`rounded-2xl px-3 py-3 text-sm font-black ring-1 transition ${
                !showWeek ? "bg-zinc-900 text-white ring-zinc-900 shadow-sm" : "bg-white text-zinc-700 ring-zinc-200"
              }`}
            >
              Vandaag
            </button>
            <button
              type="button"
              onClick={() => setShowWeek(true)}
              className={`rounded-2xl px-3 py-3 text-sm font-black ring-1 transition ${
                showWeek ? "bg-zinc-900 text-white ring-zinc-900 shadow-sm" : "bg-white text-zinc-700 ring-zinc-200"
              }`}
            >
              Volledige week
            </button>
          </div>

          {loadError ? (
            <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
              Live koppeling niet geladen. Fallback actief.
            </div>
          ) : null}
        </header>

        <main className="space-y-3">
          {!showWeek && todayItem ? (
            <DayCard
              day={todayItem}
              isToday
              registerRef={(node) => {
                dayRefs.current[todayItem.key] = node;
              }}
            />
          ) : null}

          {showWeek
            ? weekData.map((day) => (
                <DayCard
                  key={day.key}
                  day={day}
                  isToday={day.jsDay === todayJsDay}
                  registerRef={(node) => {
                    dayRefs.current[day.key] = node;
                  }}
                />
              ))
            : null}
        </main>
      </div>
    </div>
  );
}
