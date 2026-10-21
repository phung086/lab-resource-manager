-- Keep booking/maintenance cross-writer protection aligned with released scheduling holds.
CREATE OR REPLACE FUNCTION public.enforce_resource_schedule_integrity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING
      ERRCODE = '25000',
      MESSAGE = 'Scheduling writes require READ COMMITTED resource-lock semantics';
  END IF;

  IF NEW."startAt" >= NEW."endAt" THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'bookings' THEN
    IF NEW.status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED') AND NEW."schedulingReleasedAt" IS NULL THEN
      PERFORM 1 FROM public.resources WHERE id = NEW."resourceId" FOR UPDATE;
      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.maintenance_windows m
        WHERE m."resourceId" = NEW."resourceId"
          AND m.status IN ('scheduled','in_progress')
          AND tsrange(m."startAt", m."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'bookings_conflict_with_maintenance',
          MESSAGE = 'Booking overlaps an active maintenance window';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'maintenance_windows' THEN
    IF NEW.status IN ('scheduled','in_progress') THEN
      PERFORM 1 FROM public.resources WHERE id = NEW."resourceId" FOR UPDATE;
      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b."resourceId" = NEW."resourceId"
          AND b.status IN ('PENDING_APPROVAL','CONFIRMED','CHECKED_OUT','RETURNED')
          AND b."schedulingReleasedAt" IS NULL
          AND tsrange(b."startAt", b."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'maintenance_conflict_with_booking',
          MESSAGE = 'Maintenance window overlaps an active booking';
      END IF;

      IF FOUND AND EXISTS (
        SELECT 1
        FROM public.maintenance_windows m
        WHERE m.id <> NEW.id
          AND m."resourceId" = NEW."resourceId"
          AND m.status IN ('scheduled','in_progress')
          AND tsrange(m."startAt", m."endAt", '[)')
              && tsrange(NEW."startAt", NEW."endAt", '[)')
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23P01',
          CONSTRAINT = 'maintenance_windows_no_active_overlap',
          MESSAGE = 'Maintenance window overlaps another active maintenance window';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unexpected trigger table: %', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END
$$;
