-- Keep the atomic hb_start_case() flow as the single workflow materialization path.
drop trigger if exists hb_case_compile_workflow on public.hb_cases;
drop function if exists public.hb_compile_case_workflow();
