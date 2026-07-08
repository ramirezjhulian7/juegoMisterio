import type { TimelineEvent } from "../types";

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length)
    return <p style={{ color: "var(--muted)" }}>Este caso no tiene línea de tiempo.</p>;

  return (
    <div className="timeline">
      {events.map((e) => (
        <div key={e.id} className="tl-item">
          <div className="tl-dot" />
          <div className="tl-time">{e.time_label}</div>
          <div className="tl-body">
            <div className="tl-title">{e.title}</div>
            {e.description && <div className="tl-desc">{e.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
