// /js/shared/config.js
export const SUPABASE_URL = 'https://onxkbrjtkparnldcjuqf.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueGticmp0a3Bhcm5sZGNqdXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2ODE2ODIsImV4cCI6MjA3MjI1NzY4Mn0.I5JHRN-8rk7oOuWMP5eOWB5PPCz69lgbS-2yvicT3xg';

export const APP = {
  currency: 'USD',
  locale: 'en-US',
  debug: true,
  basePath: '/',       // ← if you deploy under a subpath on GitHub Pages, set it like '/your-repo/'
};

export const FUNCTIONS = {
  // Member-facing
  startContribution:        `${SUPABASE_URL}/functions/v1/start-contribution`,
  contributionStatus:       `${SUPABASE_URL}/functions/v1/get-contribution-status`,
  listInvoices:             `${SUPABASE_URL}/functions/v1/list-invoices`,
  adminInvite:              `${SUPABASE_URL}/functions/v1/admin-invite`,

  // Admin-only
  adminListMembers:         `${SUPABASE_URL}/functions/v1/admin-list-members`,
  adminOpenPortal:          `${SUPABASE_URL}/functions/v1/admin-open-portal`,
  adminCancelSubscription:  `${SUPABASE_URL}/functions/v1/admin-cancel-sub`,        // ← note the name
  adminResendInvoice:       `${SUPABASE_URL}/functions/v1/admin-resend-invoice`,
  adminGetMember: `${SUPABASE_URL}/functions/v1/admin-get-member`,

};
