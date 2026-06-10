import { useState } from "react";

// ── Palette ──────────────────────────────────────────────
const C = {
  bg:       "#020817",
  surface:  "#0f172a",
  border:   "#1e293b",
  border2:  "#263348",
  textPri:  "#f1f5f9",
  textSec:  "#94a3b8",
  textMut:  "#475569",
  today:    "#1d3461",
  todayBdr: "#3b82f6",
};

const SITE_COLORS = {
  "Ritz-Carlton":  { bg: "#0f3460", border: "#2563eb", text: "#93c5fd", dot: "#3b82f6" },
  "The Cascadia":  { bg: "#1a2e1a", border: "#16a34a", text: "#86efac", dot: "#22c55e" },
  "GoodWood":      { bg: "#2d1a0f", border: "#c2410c", text: "#fdba74", dot: "#f97316" },
  "Forestville":   { bg: "#2a1a3e", border: "#7c3aed", text: "#c4b5fd", dot: "#a78bfa" },
  "Leave":         { bg: "#1e1e2e", border: "#4c1d95", text: "#a78bfa", dot: "#7c3aed" },
  "Off":           { bg: "#111827", border: "#1f2937", text: "#374151", dot: "#374151" },
  "Standby":       { bg: "#172033", border: "#1e3a5f", text: "#60a5fa", dot: "#3b82f6" },
};

// ── Data ─────────────────────────────────────────────────
// week: 0=Mon … 6=Sun
const TEAMS = [
  {
    supervisor: { id: 1, name: "Rajan Kumar", initials: "RK" },
    members: [
      { id: 2, name: "Hafiz B. Ismail",  initials: "HI", role: "Tech"   },
      { id: 3, name: "Dinesh Raj",        initials: "DR", role: "Tech"   },
      { id: 4, name: "Wei Liang",         initials: "WL", role: "Helper" },
    ],
  },
  {
    supervisor: { id: 5, name: "Ahmad Fauzi", initials: "AF" },
    members: [
      { id: 6, name: "Budi Santoso",  initials: "BS", role: "Tech"   },
      { id: 7, name: "Mohan S.",      initials: "MS", role: "Helper" },
    ],
  },
  {
    supervisor: { id: 8, name: "Kevin Tan", initials: "KT" },
    members: [
      { id: 9,  name: "Zulkifli M.", initials: "ZM", role: "Tech"   },
      { id: 10, name: "Praveen A.",  initials: "PA", role: "Tech"   },
      { id: 11, name: "Chen Wei",    initials: "CW", role: "Helper" },
    ],
  },
  {
    supervisor: { id: 12, name: "Suresh Nair", initials: "SN" },
    members: [
      { id: 13, name: "Farid Hamzah", initials: "FH", role: "Tech"   },
      { id: 14, name: "Muthu K.",     initials: "MK", role: "Helper" },
    ],
  },
];

const UNASSIGNED = [
  { id: 15, name: "Syafiq B. Azman", initials: "SA", role: "Tech"   },
  { id: 16, name: "Lim Ah Kow",      initials: "LK", role: "Helper" },
  { id: 17, name: "Imran Razali",    initials: "IR", role: "Tech"   },
  { id: 18, name: "Selvam P.",       initials: "SP", role: "Helper" },
];

// assignments: personId → array of { days: [0..6], site, job, span }
// span = number of days (for multi-day bars)
const ASSIGNMENTS = {
  // Rajan's team
  1:  [{ days:[0,1,2,3,4], site:"Ritz-Carlton", job:"STL08 – Rail Alignment" }],
  2:  [{ days:[0,1,2,3,4], site:"Ritz-Carlton", job:"STL08 – Rail Alignment" }],
  3:  [{ days:[0,1,2],     site:"Ritz-Carlton", job:"STL08 – Rail Alignment" }, { days:[3,4], site:"Forestville", job:"CCTV Tender Survey" }],
  4:  [{ days:[0,1],       site:"Ritz-Carlton", job:"STL08 – Rail Alignment" }, { days:[2,3,4], site:"Standby", job:"Standby" }],
  // Ahmad's team
  5:  [{ days:[0,1,2,3,4], site:"The Cascadia", job:"Barrier Gate – Sensor" }],
  6:  [{ days:[0,1,2,3,4], site:"The Cascadia", job:"Barrier Gate – Sensor" }],
  7:  [{ days:[0,1,2],     site:"The Cascadia", job:"Barrier Gate – Sensor" }, { days:[3,4], site:"Leave", job:"Annual Leave" }],
  // Kevin's team
  8:  [{ days:[0,1,2,3,4], site:"GoodWood",     job:"CCTV – Cable Routing"  }],
  9:  [{ days:[0,1,2,3,4], site:"GoodWood",     job:"CCTV – Cable Routing"  }],
  10: [{ days:[0,1,2,3,4], site:"GoodWood",     job:"CCTV – Cable Routing"  }],
  11: [{ days:[0,1],       site:"GoodWood",     job:"CCTV – Cable Routing"  }, { days:[2,3,4], site:"Ritz-Carlton", job:"SL15 – Assist" }],
  // Suresh's team
  12: [{ days:[0,1,2,3,4], site:"Standby",      job:"Standby" }],
  13: [{ days:[0,1,2,3,4], site:"Standby",      job:"Standby" }],
  14: [{ days:[0,1,2,3,4], site:"Leave",        job:"Annual Leave" }],
  // Unassigned
  15: [{ days:[0,1,2,3,4], site:"Ritz-Carlton", job:"SL15 – Assist" }],
  16: [{ days:[2,3],       site:"The Cascadia", job:"Barrier Gate – Assist" }],
  17: [{ days:[0,1,2,3,4], site:"Standby",      job:"Standby" }],
  18: [{ days:[0,1,2,3,4], site:"Off",          job:"Off" }],
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Build Mon of current week
function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offset * 7);
  mon.setHours(0,0,0,0);
  return mon;
}

function getDayDates(weekStart) {
  return DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function isToday(date) {
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}

// Convert assignments to per-day lookup: personId → [siteKey per day index]
function getDayAssignment(personId, dayIdx) {
  const list = ASSIGNMENTS[personId] || [];
  for (const a of list) {
    if (a.days.includes(dayIdx)) return a;
  }
  return null;
}

// Build contiguous spans for a person's week (for rendering merged bars)
function getSpans(personId) {
  const spans = [];
  let i = 0;
  while (i < 7) {
    const a = getDayAssignment(personId, i);
    if (!a) { spans.push({ start: i, len: 1, assignment: null }); i++; continue; }
    // find how many consecutive days share the same assignment object
    let len = 1;
    while (i + len < 7 && getDayAssignment(personId, i + len) === a) len++;
    spans.push({ start: i, len, assignment: a });
    i += len;
  }
  return spans;
}

// Is person on-site today?
function isOnSiteToday(personId) {
  const now = new Date();
  const day = now.getDay();
  const todayIdx = day === 0 ? 6 : day - 1; // 0=Mon
  const a = getDayAssignment(personId, todayIdx);
  return a && a.site !== "Off" && a.site !== "Leave" && a.site !== "Standby";
}

// ── Sub-components ────────────────────────────────────────

function ColHeaders({ dates }) {
  return (
    <div style={{ display: "contents" }}>
      {dates.map((date, i) => {
        const today = isToday(date);
        return (
          <div key={i} style={{
            padding: "8px 4px",
            textAlign: "center",
            borderBottom: `1px solid ${C.border}`,
            borderLeft: `1px solid ${C.border}`,
            background: today ? C.today : C.surface,
            borderTop: today ? `2px solid ${C.todayBdr}` : "2px solid transparent",
          }}>
            <div style={{ color: today ? "#93c5fd" : C.textMut, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {DAYS[i]}
            </div>
            <div style={{ color: today ? C.textPri : C.textSec, fontSize: 13, fontWeight: today ? 700 : 500, marginTop: 2 }}>
              {date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonRow({ person, isSupervisor, dates, isLast }) {
  const onSite = isOnSiteToday(person.id);
  const spans = getSpans(person.id);
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  return (
    <div style={{ display: "contents" }}>
      {/* Name cell */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px",
        background: C.surface,
        borderBottom: isLast ? `1px solid ${C.border2}` : `1px solid ${C.border}`,
        borderRight: `1px solid ${C.border2}`,
        minHeight: 44,
        position: "sticky", left: 0, zIndex: 2,
        boxShadow: "2px 0 8px rgba(0,0,0,0.4)",
      }}>
        {/* Live glow strip */}
        {onSite && (
          <div style={{
            position: "absolute", left: 0, top: "20%", bottom: "20%",
            width: 3, borderRadius: "0 2px 2px 0",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
          }} />
        )}
        <div style={{
          width: isSupervisor ? 30 : 26,
          height: isSupervisor ? 30 : 26,
          borderRadius: "50%",
          background: isSupervisor ? "#1d3461" : "#1e293b",
          border: isSupervisor ? "1.5px solid #3b82f6" : "1.5px solid #334155",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isSupervisor ? 10 : 9, fontWeight: 700,
          color: isSupervisor ? "#93c5fd" : C.textSec,
          flexShrink: 0,
        }}>
          {person.initials}
        </div>
        <div>
          <div style={{
            color: isSupervisor ? C.textPri : C.textSec,
            fontSize: isSupervisor ? 12 : 11,
            fontWeight: isSupervisor ? 600 : 400,
            whiteSpace: "nowrap",
          }}>
            {person.name}
          </div>
          {!isSupervisor && (
            <div style={{ color: C.textMut, fontSize: 10 }}>{person.role}</div>
          )}
        </div>
      </div>

      {/* Day cells — rendered as a single spanning row using absolute positioned bars */}
      <div style={{
        gridColumn: "2 / 9",
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: isLast ? `1px solid ${C.border2}` : `1px solid ${C.border}`,
        position: "relative",
        minHeight: 44,
        background: C.bg,
      }}>
        {/* Day column backgrounds */}
        {dates.map((date, i) => (
          <div key={i} style={{
            borderLeft: `1px solid ${C.border}`,
            background: isToday(date) ? "rgba(29,52,97,0.3)" : "transparent",
          }} />
        ))}

        {/* Assignment bars */}
        {spans.map((span, si) => {
          if (!span.assignment) return null;
          const sc = SITE_COLORS[span.assignment.site] || SITE_COLORS["Standby"];
          const pct = (span.start / 7) * 100;
          const widthPct = (span.len / 7) * 100;
          return (
            <div key={si} title={`${span.assignment.job} · ${span.assignment.site}`} style={{
              position: "absolute",
              top: "50%", transform: "translateY(-50%)",
              left: `calc(${pct}% + 3px)`,
              width: `calc(${widthPct}% - 6px)`,
              height: 26,
              background: sc.bg,
              border: `1px solid ${sc.border}`,
              borderRadius: 5,
              display: "flex", alignItems: "center",
              padding: "0 7px",
              gap: 5,
              overflow: "hidden",
              cursor: "default",
              zIndex: 1,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: sc.dot, flexShrink: 0,
              }} />
              <span style={{
                color: sc.text,
                fontSize: 10, fontWeight: 500,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {span.len >= 2 ? span.assignment.site : (span.assignment.site === "Leave" ? "Leave" : span.assignment.site === "Off" ? "Off" : span.assignment.site)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamSection({ team, dates }) {
  const allPeople = [{ ...team.supervisor, role: "Supervisor", isSup: true }, ...team.members.map(m => ({ ...m, isSup: false }))];
  return (
    <>
      {allPeople.map((person, i) => (
        <PersonRow
          key={person.id}
          person={person}
          isSupervisor={person.isSup}
          dates={dates}
          isLast={i === allPeople.length - 1}
        />
      ))}
      {/* Team spacer */}
      <div style={{ gridColumn: "1 / 9", height: 8, background: C.bg, borderBottom: `1px solid ${C.border2}` }} />
    </>
  );
}

// ── Legend ────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      {Object.entries(SITE_COLORS).map(([site, sc]) => (
        <div key={site} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: sc.bg, border: `1px solid ${sc.border}`, display: "inline-block" }} />
          <span style={{ color: C.textMut, fontSize: 11 }}>{site}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: "#22c55e", display: "inline-block", boxShadow: "0 0 4px #22c55e" }} />
        <span style={{ color: C.textMut, fontSize: 11 }}>On site today</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function ManpowerCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);
  const dates = getDayDates(weekStart);
  const monthLabel = weekStart.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
  const weekRange = `${dates[0].getDate()} – ${dates[6].getDate()} ${monthLabel}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: C.textPri,
      padding: "20px 16px",
    }}>
      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { height: 4px; width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.textMut, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Astronic Services · Manpower
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Weekly Deployment
          </h1>
          {/* Week nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{
              width: 28, height: 28, borderRadius: 6,
              background: C.surface, border: `1px solid ${C.border2}`,
              color: C.textSec, cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>‹</button>
            <span style={{ color: C.textSec, fontSize: 13, minWidth: 160, textAlign: "center" }}>{weekRange}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{
              width: 28, height: 28, borderRadius: 6,
              background: C.surface, border: `1px solid ${C.border2}`,
              color: C.textSec, cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>›</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11,
                background: C.surface, border: `1px solid ${C.border2}`,
                color: "#3b82f6", cursor: "pointer",
              }}>Today</button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Legend />
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "180px repeat(7, 1fr)",
          minWidth: 680,
          border: `1px solid ${C.border2}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {/* Corner */}
          <div style={{
            background: C.surface,
            borderBottom: `1px solid ${C.border2}`,
            borderRight: `1px solid ${C.border2}`,
            padding: "8px 12px",
            display: "flex", alignItems: "flex-end",
            position: "sticky", left: 0, zIndex: 3,
          }}>
            <span style={{ color: C.textMut, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Staff</span>
          </div>

          {/* Day headers */}
          <ColHeaders dates={dates} />

          {/* Teams */}
          {TEAMS.map((team, i) => (
            <TeamSection key={team.supervisor.id} team={team} dates={dates} />
          ))}

          {/* Unassigned */}
          <div style={{
            gridColumn: "1 / 9",
            padding: "6px 12px 4px",
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ color: C.textMut, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Unassigned</span>
          </div>
          {UNASSIGNED.map((person, i) => (
            <PersonRow
              key={person.id}
              person={person}
              isSupervisor={false}
              dates={dates}
              isLast={i === UNASSIGNED.length - 1}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, color: C.border2, fontSize: 11, textAlign: "center" }}>
        1OS · Manpower Module · Astronic Services & Trading Pte Ltd
      </div>
    </div>
  );
}
