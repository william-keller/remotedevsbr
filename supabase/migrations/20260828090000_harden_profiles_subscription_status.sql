-- Harden profiles: forbid clients from setting subscription_status themselves
-- Prevent self-service privilege escalation by revoking column-level write
-- access from the authenticated role. Server-side writes via the service role
-- (stripe-webhook, check-subscription) are unaffected.
REVOKE UPDATE (subscription_status) ON TABLE public.profiles FROM authenticated;
REVOKE INSERT (subscription_status) ON TABLE public.profiles FROM authenticated;