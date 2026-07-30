import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'

/**
 * Shared calendar UI component.
 * Accepts events[] and delegates all data fetching / business logic to the parent.
 *
 * Props:
 *   events        — FullCalendar event objects
 *   onEventClick  — called with the FullCalendar event info object
 *   onSelect      — called when the user selects a day / time range (needs selectable)
 *   selectable    — allow click/drag selection to create events (default false)
 *   initialView   — 'dayGridMonth' (default) | 'timeGridWeek' | 'listMonth'
 *   headerToolbar — override the toolbar; defaults to Month + List (no interaction)
 */
export default function CalendarView({
  events = [],
  onEventClick,
  onSelect,
  selectable = false,
  initialView = 'dayGridMonth',
  headerToolbar = { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
}) {
  const calendarRef = useRef(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={headerToolbar}
        firstDay={1}
        events={events}
        eventClick={onEventClick}
        selectable={selectable}
        select={onSelect}
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={true}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        dayCellClassNames={arg => arg.date.getDay() === 0 ? ['fc-day-sunday'] : []}
        dayHeaderClassNames={arg => arg.dow === 0 ? ['fc-day-sunday'] : []}
      />
    </div>
  )
}
