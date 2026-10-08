-- Campus Care v2 — 0007 public directory + states support
-- The clinic doctor directory is public information (name/specialty/room only).
-- active_doctors() exposes exactly those four columns, so anonymous access is safe.

revoke all on function public.active_doctors() from public;
grant execute on function public.active_doctors() to anon, authenticated;
