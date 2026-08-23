-- Enable btree_gist for multi-column EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Ensure constraint is dropped if existing to avoid conflicts
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_active_overlap;

-- Add GiST exclusion constraint to strictly prevent overlapping active bookings at database level
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_active_overlap
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status IN ('pending', 'approved', 'checked_out'));
