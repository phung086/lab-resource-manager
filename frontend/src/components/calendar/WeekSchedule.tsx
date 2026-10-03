import { translate } from "../../i18n.js";
import { useLocale } from '../../providers/LocaleProvider';
import React from "react";
import { CheckCircle2, Lock, Wrench, Plus, Clock } from "lucide-react";

export interface WeekScheduleProps {
  slotsData: any;
  selectedResourceName?: string;
  onSelectSlot: (dateStr: string, timeStr: string) => void;
  onSelectBooking?: (booking: any) => void;
}

export const WeekSchedule: React.FC<WeekScheduleProps> = ({
  slotsData,
  selectedResourceName,
  onSelectSlot,
  onSelectBooking
}) => {
  const { tr } = useLocale();
  if (!slotsData || !slotsData.daysHeader || !slotsData.grid) {
    return (
      <div
        aria-live="polite"
        className="calendar-week-loading"
      >
        {tr("ui.loading_week_calendar_0fddc03e")}</div>
    );
  }

  const daysHeader = slotsData.daysHeader || [];
  const grid = slotsData.grid || [];

  return (
    <div className="calendar-week-frame">
      <div className="calendar-week-scroll">
        <div
          className="calendar-week-slots-grid"
        >
          {/* Top Left corner: Time Header */}
          <div className="calendar-week-axis p-2.5 flex items-center justify-center font-medium text-xs">
            <Clock size={13} className="mr-1" />
            <span>{tr("ui.time_8056fb1f")}</span>
          </div>

          {/* Days Header */}
          {daysHeader.map((d: any) => (
            <div
              key={d.dateStr}
              className={`calendar-week-day p-2.5 text-center flex flex-col items-center justify-center ${d.isToday ? "is-today" : ""}`}
            >
              <span className="text-xs uppercase tracking-wider">{tr(d.nameKey || `enum.weekday.${d.key}`)}</span>
              <span
                className="calendar-week-date text-xs mt-0.5"
              >
                {d.dateStr}
              </span>
            </div>
          ))}

          {/* Time Rows */}
          {grid.map((row: any) => (
            <React.Fragment key={row.hour}>
              {/* Hour Column */}
              <div className="calendar-week-axis p-2 flex items-start justify-center font-mono text-xs">
                {row.time}
              </div>

              {/* Day Cells */}
              {row.days.map((slot: any, idx: number) => {
                const dayHeader = daysHeader[idx];

                if (slot.status === "booked") {
                  return (
                    <button
                      type="button"
                      key={`${row.hour}-${idx}`}
                      onClick={() => onSelectBooking && onSelectBooking(slot)}
                      className={`calendar-week-cell ${slot.isMine ? "is-mine" : "is-booked"} w-full text-left p-2 flex flex-col justify-between transition-colors select-none`}
                      title={(slot.titleKey ? tr(slot.titleKey) : slot.title) || tr("ui.reserved_f20b6ee2")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold flex items-center gap-1 ${
                            slot.isMine ? "calendar-booking-mine" : "calendar-booking-other"
                          }`}
                        >
                          {slot.isMine ? <CheckCircle2 size={10} /> : <Lock size={10} />}
                          <span>{tr(slot.labelKey || slot.label)}</span>
                        </span>
                      </div>
                      <div className="calendar-booking-title text-xs font-medium truncate my-0.5">
                        {(slot.titleKey ? tr(slot.titleKey) : slot.title) || tr("ui.reserved_f20b6ee2")}
                      </div>
                    </button>
                  );
                }

                if (slot.status === "maintenance") {
                  return (
                    <div
                      key={`${row.hour}-${idx}`}
                      className="calendar-week-cell is-maintenance p-2 select-none"
                      title={(slot.detailsKey ? tr(slot.detailsKey) : slot.details) || tr("ui.scheduled_maintenance_11ae8495")}
                    >
                      <span className="text-[10px] font-semibold flex items-center gap-1">
                        <Wrench size={10} /> {tr(slot.labelKey || slot.label)}
                      </span>
                      <span className="text-[10px] truncate block">
                        {slot.detailsKey ? tr(slot.detailsKey) : slot.details}
                      </span>
                    </div>
                  );
                }

                if (slot.status === "offline") {
                  return (
                    <div
                      key={`${row.hour}-${idx}`}
                      className="calendar-week-cell is-offline p-2 select-none"
                      title={(slot.detailsKey ? tr(slot.detailsKey) : slot.details) || tr("ui.resource_unavailable_cf6673b5")}
                    >
                      <span className="text-[10px] font-semibold block">{tr(slot.labelKey || slot.label)}</span>
                      <span className="text-[10px] truncate block">
                        {slot.detailsKey ? tr(slot.detailsKey) : slot.details}
                      </span>
                    </div>
                  );
                }

                // Available slot (visually quiet by default, revealed on hover/focus)
                return (
                  <button
                    type="button"
                    key={`${row.hour}-${idx}`}
                    onClick={() => onSelectSlot(dayHeader?.fullDate, row.time)}
                    className="calendar-week-cell is-available w-full text-left p-1.5 group cursor-pointer transition-colors flex flex-col justify-between"
                    aria-label={
                      selectedResourceName
                        ? translate("ui.book_at_on_a37b206a", { value0: selectedResourceName, value1: row.time, value2: dayHeader?.dateStr || "" })
                        : translate("ui.book_the_slot_on_983948ae", { value0: row.time, value1: dayHeader?.dateStr || "" })
                    }
                    title={
                      selectedResourceName
                        ? translate("ui.book_at_on_5c687b5f", { value0: selectedResourceName, value1: row.time, value2: dayHeader?.nameKey ? tr(dayHeader.nameKey) : dayHeader?.name || "", value3: dayHeader?.dateStr || "" })
                        : translate("ui.book_the_slot_on_41910521", { value0: row.time, value1: dayHeader?.nameKey ? tr(dayHeader.nameKey) : dayHeader?.name || "", value2: dayHeader?.dateStr || "" })
                    }
                  >
                    <div className="w-full flex items-center justify-end">
                      <Plus size={11} className="calendar-slot-hover-icon opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-blue-600 transition-opacity" aria-hidden="true" />
                    </div>
                    <div className="calendar-slot-action text-[10px] font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-blue-600 transition-opacity">
                      {tr("ui.book_f0937e77")}{row.time}
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
