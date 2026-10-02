-- Policy-source monitoring schedules a database job in the next migration.
-- pg_cron creates its own cron schema; enable it before cron.schedule is referenced.
create extension if not exists pg_cron;
