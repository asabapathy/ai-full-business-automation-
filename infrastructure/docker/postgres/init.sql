-- Enable required extensions
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- Make extensions available without schema prefix
SET search_path TO public, extensions;

-- Grant usage
GRANT USAGE ON SCHEMA extensions TO kanavu;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO kanavu;
