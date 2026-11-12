import React, { useEffect, useMemo, useState } from "react";
import { Clock3, DoorOpen, GripVertical, Microscope, Package, Server, Wrench } from "lucide-react";

import { useLocale } from "../../../providers/LocaleProvider";
import { resourceImageProps } from "../../../utils/resourceImage";
import { StatusPill } from "./ResourceStatusPill";

export interface BoardResource {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  subtype?: string | null;
  laboratory?: { code?: string; name?: string } | null;
  location?: string | null;
  operationalStatus: string;
  availability?: { state?: string } | null;
  media?: { kind: string; url: string; altText?: string | null; title?: string | null }[];
}

export interface BoardBooking {
  resourceId: string;
  endAt: string;
}

export interface ResourceOperationsBoardProps {
  resources: BoardResource[];
  bookings: BoardBooking[];
  statuses: string[];
  columnLabels: Record<string, string>;
  canManage: (resource: BoardResource) => boolean;
  onOpen: (resource: BoardResource) => void;
  onRequestStatus: (resource: BoardResource, targetStatus?: string) => void;
}

const categoryIcon: Record<string, typeof Server> = {
  ROOM: DoorOpen,
  EQUIPMENT: Microscope,
  MACHINE: Wrench,
  EXPERIMENT_KIT: Package,
  MATERIAL: Package
};

/**
 * Operational board for physical resources: one column per OperationalStatus.
 * A resource occupies exactly one column (its authoritative operationalStatus);
 * the scheduling availability stays a separate signal on each card.
 */
export function ResourceOperationsBoard(props: ResourceOperationsBoardProps) {
  const { tr } = useLocale();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const occupancyByResource = useMemo(() => {
    const ends = new Map<string, number>();
    for (const booking of props.bookings) {
      const end = Date.parse(booking.endAt);
      if (!Number.isFinite(end)) continue;
      ends.set(booking.resourceId, Math.max(end, ends.get(booking.resourceId) ?? end));
    }
    return ends;
  }, [props.bookings]);

  const columns = useMemo(() => props.statuses.map((status) => ({
    status,
    items: props.resources.filter((resource) => resource.operationalStatus === status)
  })), [props.resources, props.statuses]);

  const availableCount = props.resources.filter((resource) => resource.availability?.state === "AVAILABLE").length;

  function allowDrop(status: string) {
    const resource = props.resources.find((row) => row.id === dragId);
    if (!resource) return false;
    if (resource.operationalStatus === status) return false;
    if (!props.canManage(resource)) return false;
    if (status === "RETIRED") return false;
    return true;
  }

  function handleDrop(status: string) {
    const resource = props.resources.find((row) => row.id === dragId);
    setDragId(null);
    setDropTarget(null);
    if (!resource || !allowDrop(status)) return;
    props.onRequestStatus(resource, status);
  }

  return (
    <section className="resource-operations-board" aria-label={tr("ui.resourceBoard.title")}>
      <header className="resource-board-head">
        <div>
          <h2>{tr("ui.resourceBoard.title")}</h2>
          <p>{tr("ui.resourceBoard.hint")}</p>
        </div>
        <dl className="resource-board-stats">
          <div>
            <dt>{tr("ui.resourceBoard.availableNow")}</dt>
            <dd>{availableCount}</dd>
          </div>
          <div>
            <dt>{tr("ui.resourceBoard.total")}</dt>
            <dd>{props.resources.length}</dd>
          </div>
        </dl>
      </header>

      <div className="resource-board-columns" role="region" aria-label={tr("ui.physical_state_c30af32d")} tabIndex={0}>
        {columns.map((column) => (
          <section
            key={column.status}
            className={"resource-board-column" + (dropTarget === column.status ? " is-drop-target" : "")}
            data-status={column.status}
            aria-label={tr(props.columnLabels[column.status] || column.status)}
            onDragOver={(event) => { if (allowDrop(column.status)) { event.preventDefault(); setDropTarget(column.status); } }}
            onDragLeave={() => setDropTarget((current) => (current === column.status ? null : current))}
            onDrop={(event) => { event.preventDefault(); handleDrop(column.status); }}
          >
            <header className="resource-board-column-head">
              <span className="resource-board-dot" aria-hidden="true" />
              <h3>{tr(props.columnLabels[column.status] || column.status)}</h3>
              <span className="resource-board-count">{column.items.length}</span>
            </header>
            <ul className="resource-board-cards">
              {column.items.length === 0 && <li className="resource-board-empty">{tr("ui.resourceBoard.empty")}</li>}
              {column.items.map((resource) => {
                const Icon = categoryIcon[resource.category || ""] || Server;
                const endAt = resource.operationalStatus === "IN_USE" ? occupancyByResource.get(resource.id) : undefined;
                const remaining = endAt === undefined ? undefined : Math.ceil((endAt - now) / 60000);
                const cover = resource.media?.find((item) => item.kind === "IMAGE");
                const manageable = props.canManage(resource);
                return (
                  <li key={resource.id} className="resource-board-card">
                    <button
                      type="button"
                      className="resource-board-card-main"
                      onClick={() => props.onOpen(resource)}
                      aria-label={`${tr("ui.view_details_f6f88b0f")} ${resource.code}`}
                    >
                      <span className="resource-board-card-icon" aria-hidden="true">
                        <Icon size={28} strokeWidth={1.5} />
                        {cover && <img key={cover.url} {...resourceImageProps(cover.url)} alt="" onError={event => { event.currentTarget.hidden = true; }} />}
                      </span>
                      <span className="resource-board-card-body">
                        <strong>{resource.name}</strong>
                        <span className="resource-board-card-code">{resource.code}</span>
                        <span className="resource-board-card-lab">
                          {resource.laboratory?.code || resource.laboratory?.name || resource.location || tr("ui.not_assigned_ebe3cb5d")}
                        </span>
                      </span>
                    </button>
                    <div className="resource-board-card-status">
                      <span>{tr("ui.current_availability_f57c5e36")}</span>
                      <StatusPill value={resource.availability?.state || "UNAVAILABLE"} />
                    </div>
                    {remaining !== undefined && (
                      <p className="resource-board-card-occupancy">
                        <Clock3 size={13} aria-hidden="true" />
                        <strong>{remaining > 0
                          ? tr("ui.resourceBoard.minutesLeft", { minutes: remaining })
                          : tr("ui.board_overdue_1e4d9c6a")}</strong>
                      </p>
                    )}
                    {manageable && resource.operationalStatus !== "RETIRED" && (
                      <button
                        type="button"
                        className="resource-board-card-drag"
                        draggable
                        aria-label={`${tr("ui.update_physical_status_a7b4b46e")} ${resource.code}`}
                        title={tr("ui.update_physical_status_a7b4b46e")}
                        onClick={() => props.onRequestStatus(resource)}
                        onDragStart={(event) => {
                          setDragId(resource.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", resource.id);
                        }}
                        onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                      >
                        <GripVertical size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
