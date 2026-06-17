import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'

/**
 * Shared calendar UI component.
 * Accepts events[] and delegates all data fetching / business logic to the parent.
 *
 * Props:
 *   events       — FullCalendar event objects
 *   onEventClick — called with the FullCalendar event info object
 *   initialView  — 'dayGridMonth' (default) | 'listMonth'
 */
export default function CalendarView({ events = [], onEventClick, initialView = 'dayGridMonth' }) {
  const calendarRef = useRef(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listMonth',
        }}
        firstDay={1}
        events={events}
        eventClick={onEventClick}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        dayCellClassNames={arg => arg.date.getDay() === 0 ? ['fc-day-sunday'] : []}
        dayHeaderClassNames={arg => arg.dow === 0 ? ['fc-day-sunday'] : []}
      />
    </div>
  )
}