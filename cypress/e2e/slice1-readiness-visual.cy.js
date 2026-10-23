const userId = '61000000-0000-4000-8000-000000000003';
const siteId = '62000000-0000-4000-8000-000000000001';
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const accessToken = `${btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: expiresAt }))}.test-signature`;

describe('Slice 1 live-readiness visual contract', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        refresh_token: 'visual-test-refresh-token',
        user: { id: userId, email: 'site.visual@example.test', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
      },
    }).as('login');
    cy.intercept('GET', '**/auth/v1/user', {
      statusCode: 200,
      body: { id: userId, email: 'site.visual@example.test', created_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
    });
    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [{ id: userId, username: 'site.visual@example.test', display_name: 'Visual Site Manager', role: 'site', is_active: true, organization_id: '00000000-0000-4000-8000-000000000001' }],
    });
    cy.intercept('GET', '**/rest/v1/profile_site_access*', { statusCode: 200, body: [{ site_id: siteId }] });
    cy.intercept('POST', '**/rest/v1/auth_activity_events*', { statusCode: 201, body: [] });
    cy.intercept('GET', '**/rest/v1/app_state_snapshots*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/admin_audit_events*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/attendance_audit_events*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/sites*', {
      statusCode: 200,
      body: [{ id: siteId, name: 'Harmony Saaiplaas 3', location: 'Free State', job_number: 'HSP3-001', team_name: 'Operations A' }],
    });
    cy.intercept('POST', '**/rest/v1/rpc/evaluate_site_readiness', {
      statusCode: 200,
      body: [
        { entity_type: 'site', entity_id: siteId, entity_label: 'Harmony Saaiplaas 3', outcome: 'ready', reason_codes: [], corrective_actions: [], policy_version: 'senatla-readiness-v1.0.0', evaluated_at: new Date().toISOString() },
        { entity_type: 'employee', entity_id: '63000000-0000-4000-8000-000000000001', entity_label: 'Operator A', outcome: 'warning', reason_codes: ['EMPLOYEE_AUTHORIZATION_DUE'], corrective_actions: ['Ask Office Admin to schedule renewal of the work authorization.'], policy_version: 'senatla-readiness-v1.0.0', evaluated_at: new Date().toISOString() },
        { entity_type: 'asset', entity_id: '65000000-0000-4000-8000-000000000001', entity_label: 'FS 12 ABC', outcome: 'ready', reason_codes: [], corrective_actions: [], policy_version: 'senatla-readiness-v1.0.0', evaluated_at: new Date().toISOString() },
      ],
    }).as('readiness');
    cy.intercept('POST', '**/rest/v1/rpc/confirm_site_readiness', { statusCode: 200, body: 'warning' });
  });

  it('renders the existing start-of-shift flow at desktop and mobile widths', () => {
    cy.viewport(1440, 1000);
    cy.visit('/login/site?redirect=/site-manager', {
      onBeforeLoad(win) {
        win.localStorage.setItem('senatla_ops_onboarding_v1', JSON.stringify([`${userId}:site`]));
      },
    });
    cy.get('input[name="username"]').type('site.visual@example.test');
    cy.get('input[name="password"]').type('visual-test-password');
    cy.contains('button', 'Continue').click();
    cy.wait('@login');
    cy.wait('@readiness');
    cy.contains('h3', 'Live site readiness').scrollIntoView().should('be.visible');
    cy.contains('Operator A').should('be.visible');
    cy.contains('Ask Office Admin to schedule renewal').should('be.visible');
    cy.contains('medical_status').should('not.exist');
    cy.screenshot('slice1-readiness-desktop', { capture: 'viewport' });

    cy.viewport(390, 844);
    cy.contains('h3', 'Live site readiness').scrollIntoView().should('be.visible');
    cy.contains('button', 'Confirm and continue to safety').scrollIntoView().should('be.visible');
    cy.screenshot('slice1-readiness-mobile-390x844', { capture: 'viewport' });
  });
});
