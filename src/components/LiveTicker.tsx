import type { AuctionEvent } from "@/lib/auction";

export function LiveTicker({ events }: { events: AuctionEvent[] }) {
  const items = events.length
    ? events
    : ([{ id: "idle", message: "Waiting for the auction to begin", event_type: "IDLE" }] as Pick<
        AuctionEvent,
        "id" | "message" | "event_type"
      >[]);

  const line = [...items, ...items];

  return (
    <div className="flex h-11 items-center overflow-hidden border-y border-line bg-panel">
      <span className="label-cond shrink-0 bg-alert px-3 py-1.5 text-[11px] text-white">
        Live Feed
      </span>
      <div className="marquee whitespace-nowrap font-mono text-[12px] text-mut">
        {line.map((event, index) => (
          <span
            key={`${event.id}-${index}`}
            className={
              event.event_type === "PLAYER_SOLD"
                ? "mx-6 text-sold"
                : event.event_type === "PLAYER_UNSOLD"
                  ? "mx-6 text-alert"
                  : event.event_type === "BID_PLACED"
                    ? "mx-6 text-gold"
                    : "mx-6"
            }
          >
            {event.message}
          </span>
        ))}
      </div>
    </div>
  );
}
