import { useState, useEffect } from "react";
import api from "../api/axios";
import { shouldShowEmployee } from "../utils/roleFilters";

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

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
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

function getDayAssignment(personId, dayIdx, assignments) {
  const list = assignments[personId] || [];
  for (const a of list) {
    if (a.days.includes(dayIdx)) return a;
  }
  return null;
}

function getSpans(personId, assignments) {
  const spans = [];
  let i = 0;
  while (i < 7) {
    const a = getDayAssignment(personId, i, assignments);
    if (!a) { spans.push({ start: i, len: 1, assignment: null }); i++; continue; }
    let len = 1;
    while (i + len < 7 && getDayAssignment(personId, i + len, assignments) === a) len++;
    spans.push({ start: i, len, assignment: a });
    i += len;
  }
  return spans;
}

function isOnSiteToday(personId, assignments) {
  const now = new Date();
  const day = now.getDay();
  const todayIdx = day === 0 ? 6 : day - 1;
  const a = getDayAssignment(personId, todayIdx, assignments);
  return a && a.site !== "Off" && a.site !== "Leave" && a.site !== "Standby";
}

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

function PersonRow({ person, isSupervisor, dates, isLast, assignments }) {
  const onSite = isOnSiteToday(person.id, assignments);
  const spans = getSpans(person.id, assignments);

  return (
    <div style={{ display: "contents" }}>
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

      <div style={{
        gridColumn: "2 / 9",
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: isLast ? `1px solid ${C.border2}` : `1px solid ${C.border}`,
        position: "relative",
        minHeight: 44,
        background: C.bg,
      }}>
        {dates.map((date, i) => (
          <div key={i} style={{
            borderLeft: `1px solid ${C.border}`,
            background: isToday(date) ? "rgba(29,52,97,0.3)" : "transparent",
          }} />
        ))}

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
                {span.len >= 2 ? span.assignment.site : span.assignment.site}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamSection({ team, dates, assignments }) {
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
          assignments={assignments}
        />
      ))}
      <div style={{ gridColumn: "1 / 9", height: 8, background: C.bg, borderBottom: `1px solid ${C.border2}` }} />
    </>
  );
}

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

/**
 * ManpowerCalendarView - Display weekly deployment schedule
 * DECOUPLED: Accepts settings as props, no internal fetching
 * Uses utility functions for filtering logic
 */
function ManpowerCalendarView({ settings }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, [weekOffset, settings]);

  async function fetchSchedules() {
    try {
      setLoading(true);
      const weekStart = getWeekStart(weekOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const dateFromStr = weekStart.toISOString().split('T')[0];
      const dateToStr = weekEnd.toISOString().split('T')[0];

      const [empRes, schedRes] = await Promise.all([
        api.get('/hr/employees/?limit=999'),
        api.get(`/hr/work-schedules/?date_from=${dateFromStr}&date_to=${dateToStr}`),
      ]);

      const employees = empRes.data.results || empRes.data;
      const schedules = schedRes.data.results || schedRes.data || [];

      // Use utility function to filter employees
      const filteredEmployees = employees.filter(emp => shouldShowEmployee(emp, settings));

      const teamsMap = {};
      const unassignedList = [];
      const assignmentsMap = {};

      filteredEmployees.forEach(emp => {
        const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
        const person = {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          initials,
          role: emp.position_name || 'Staff',
        };

        if (emp.manager) {
          if (!teamsMap[emp.manager]) {
            teamsMap[emp.manager] = { supervisor: null, members: [] };
          }
          teamsMap[emp.manager].members.push(person);
        } else {
          unassignedList.push(person);
        }
      });

      filteredEmployees.forEach(emp => {
        if (teamsMap[emp.id]) {
          const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
          teamsMap[emp.id].supervisor = {
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            initials,
          };
        }
      });

      const filteredEmpIds = new Set(filteredEmployees.map(e => e.id));
      schedules.forEach(schedule => {
        const empId = schedule.employee_id;
        if (!filteredEmpIds.has(empId)) return;

        if (!assignmentsMap[empId]) {
          assignmentsMap[empId] = [];
        }

        let schedDate;
        const dateStr = schedule.date;
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-');
          schedDate = parts[0].length === 4
            ? new Date(dateStr)
            : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          schedDate = new Date(dateStr);
        }

        const dayIdx = schedDate.getDay() === 0 ? 6 : schedDate.getDay() - 1;

        let existing = assignmentsMap[empId].find(a => a.site === schedule.location_name);
        if (!existing) {
          existing = { days: [dayIdx], site: schedule.location_name, job: 'Assigned' };
          assignmentsMap[empId].push(existing);
        } else if (!existing.days.includes(dayIdx)) {
          existing.days.push(dayIdx);
        }
      });

      let teamsList = Object.values(teamsMap).filter(t => t.supervisor);
      if (!settings?.show_teams) {
        teamsList = [];
      }
      const unassignedToShow = settings?.show_unassigned ? unassignedList : [];

      setTeams(teamsList);
      setUnassigned(unassignedToShow);
      setAssignments(assignmentsMap);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  const weekStart = getWeekStart(weekOffset);
  const dates = getDayDates(weekStart);
  const monthLabel = weekStart.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
  const weekRange = `${dates[0].getDate()} – ${dates[6].getDate()} ${monthLabel}`;

  if (loading) {
    return <div style={{ padding: 20, color: C.textMut }}>Loading schedules...</div>;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: C.textPri,
      padding: "20px 16px",
    }}>
      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { height: 4px; width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }`}</style>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.textMut, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Manpower
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Weekly Deployment
          </h1>
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

      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "180px repeat(7, 1fr)",
          minWidth: 680,
          border: `1px solid ${C.border2}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
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

          <ColHeaders dates={dates} />

          {teams.map((team, i) => (
            <TeamSection key={team.supervisor.id} team={team} dates={dates} assignments={assignments} />
          ))}

          {unassigned.length > 0 && (
            <>
              <div style={{
                gridColumn: "1 / 9",
                padding: "6px 12px 4px",
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ color: C.textMut, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Unassigned</span>
              </div>
              {unassigned.map((person, i) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  isSupervisor={false}
                  dates={dates}
                  isLast={i === unassigned.length - 1}
                  assignments={assignments}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, color: C.border2, fontSize: 11, textAlign: "center" }}>
        1OS · Manpower Module
      </div>
    </div>
  );
}

export default ManpowerCalendarView;
