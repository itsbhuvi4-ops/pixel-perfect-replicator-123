-- BidX Auction: harden Admin account deletion against legacy foreign keys.
-- Supabase reports "Database error deleting user" when an auth.users row is
-- still referenced by a restrictive public FK. Keep the intended relationships
-- explicit so future account deletes do not depend on migration order.

DO $$
DECLARE
  r record;
  child_table text;
  child_column text;
  parent_column text;
BEGIN
  FOR r IN
    SELECT
      c.oid,
      c.conname,
      c.conrelid::regclass AS child_table,
      a.attname AS child_column,
      pa.attname AS parent_column
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa
      ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND array_length(c.conkey, 1) = 1
      AND c.conrelid IN (
        'public.profiles'::regclass,
        'public.user_roles'::regclass,
        'public.players'::regclass,
        'public.ambassadors'::regclass,
        'public.casters'::regclass
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      r.child_table,
      r.conname
    );

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users (%I) ON DELETE CASCADE',
      r.child_table,
      r.conname,
      r.child_column,
      r.parent_column
    );
  END LOOP;
END $$;

-- Auction history should not prevent deletion of a role account.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      c.conrelid::regclass AS child_table,
      a.attname AS child_column,
      pa.attname AS parent_column
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa
      ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid IN ('public.players'::regclass, 'public.ambassadors'::regclass)
      AND array_length(c.conkey, 1) = 1
      AND c.conrelid IN (
        'public.auction_results'::regclass,
        'public.retain_records'::regclass,
        'public.bids'::regclass,
        'public.auction_events'::regclass
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      r.child_table,
      r.conname
    );

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s (%I) ON DELETE CASCADE',
      r.child_table,
      r.conname,
      r.child_column,
      CASE
        WHEN r.parent_column IS NOT NULL THEN
          CASE
            WHEN r.child_table IS NOT NULL AND r.conname IS NOT NULL THEN
              (SELECT c2.confrelid::regclass::text
               FROM pg_constraint c2
               WHERE c2.conname = r.conname
               LIMIT 1)
            ELSE 'public.players'
          END
        ELSE 'public.players'
      END,
      r.parent_column
    );
  END LOOP;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Preserve player accounts if an Ambassador/team is deleted.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.players'::regclass
      AND c.confrelid = 'public.ambassadors'::regclass
      AND a.attname = 'ambassador_id'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.players DROP CONSTRAINT %I', r.conname);
    EXECUTE format(
      'ALTER TABLE public.players ADD CONSTRAINT %I FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL',
      r.conname
    );
  END LOOP;
END $$;

-- Current auction references are transient and must never block role deletion.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, a.attname AS child_column, pa.attname AS parent_column
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa
      ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.auction_state'::regclass
      AND c.confrelid IN ('public.players'::regclass, 'public.ambassadors'::regclass)
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.auction_state DROP CONSTRAINT %I', r.conname);
    EXECUTE format(
      'ALTER TABLE public.auction_state ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s (%I) ON DELETE SET NULL',
      r.conname,
      r.child_column,
      CASE WHEN r.parent_column = 'id' THEN
        CASE
          WHEN r.child_column = 'current_player_id' THEN 'public.players'
          ELSE 'public.ambassadors'
        END
      ELSE 'public.players' END,
      r.parent_column
    );
  END LOOP;
END $$;
