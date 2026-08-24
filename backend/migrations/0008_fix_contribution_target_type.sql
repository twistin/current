-- Migration 0008: normaliza contribution.target_type a contribution_target
-- Necesario en entornos donde la columna quedó creada como contribution_target_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contribution'
      AND column_name = 'target_type'
      AND udt_name = 'contribution_target_type'
  ) THEN
    ALTER TABLE contribution
      ALTER COLUMN target_type TYPE contribution_target
      USING target_type::text::contribution_target;
  END IF;
END $$;
