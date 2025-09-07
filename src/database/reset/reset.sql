-- Database Reset Script
-- This script drops all tables, functions, triggers, and other database objects
-- to provide a completely clean slate for fresh migrations

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all indexes (they will be dropped with the table, but explicit for clarity)
DROP INDEX IF EXISTS idx_contacts_email;
DROP INDEX IF EXISTS idx_contacts_phone_number;
DROP INDEX IF EXISTS idx_contacts_linked_id;
DROP INDEX IF EXISTS idx_contacts_link_precedence;

-- Drop all tables (CASCADE will handle foreign key constraints)
DROP TABLE IF EXISTS contacts CASCADE;

-- Drop any sequences that might have been created
DROP SEQUENCE IF EXISTS contacts_id_seq CASCADE;

-- You can add more cleanup statements here as your schema grows
-- For example:
-- DROP TABLE IF EXISTS other_table CASCADE;
-- DROP FUNCTION IF EXISTS other_function();
-- DROP TRIGGER IF EXISTS other_trigger ON other_table;

-- Reset any global settings if needed
-- RESET ALL; -- Uncomment if you need to reset session variables
