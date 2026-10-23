const organizationId = '00000000-0000-4000-8000-000000000001';
const northSiteId = '72000000-0000-4000-8000-000000000001';
const southSiteId = '72000000-0000-4000-8000-000000000002';
const nowIso = new Date().toISOString();
const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const costRows = [
  row('labour_provisional', '73000000-0000-4000-8000-000000000001', '2026-08-20', northSiteId, 'NORTH-001', null, 0, 'provisional_unrecognized', 'attendance_evidence', ['LABOUR_RATE_UNIT_UNDEFINED', 'LABOUR_SOURCE_UNSTRUCTURED']),
  row('ppe', '73000000-0000-4000-8000-000000000002', '2026-08-20', northSiteId, 'NORTH-001', 200, 200, 'recognized', 'collected'),
  row('fuel', '73000000-0000-4000-8000-000000000003', '2026-08-21', southSiteId, 'SOUTH-002', 300, 300, 'recognized', 'recorded'),
  row('asset_work_order', '73000000-0000-4000-8000-000000000004', '2026-08-21', southSiteId, 'SOUTH-002', 400, 400, 'recognized', 'completed'),
  row('vendor_invoice', '73000000-0000-4000-8000-000000000005', '2026-08-22', northSiteId, 'NORTH-001', 600, 600, 'recognized', 'approved'),
  row('vendor_invoice', '73000000-0000-4000-8000-000000000006', '2026-08-22', null, null, 500, 0, 'not_recognized', 'pending_director', ['SITE_UNATTRIBUTED', 'VENDOR_NOT_APPROVED']),
  row('vendor_invoice', '73000000-0000-4000-8000-000000000007', '2026-08-22', null, null, 700, 0, 'not_recognized', 'rejected', ['SITE_UNATTRIBUTED', 'VENDOR_REJECTED']),
];

function row(sourceType, sourceId, costDate, siteId, jobNumber, sourceAmount, recognizedAmount, recognitionStatus, sourceStatus, qualityReasons = []) {
  return {
    source_type: sourceType,
    source_id: sourceId,
    cost_date: costDate,
    site_id: siteId,
    job_number: jobNumber,
    currency_code: 'ZAR',
    source_amount: sourceAmount,
    recognized_amount: recognizedAmount,
    recognition_status: recognitionStatus,
    source_status: sourceStatus,
    allocation_metadata: {},
    quality_reasons: qualityReasons,
    policy_version: 'cost-attribution-v1.0.0',
    evaluated_at: '2026-08-23T10:00:00.000Z',
  };
}

function stubSupabase(role) {
  const userId = role === 'office'
    ? '71000000-0000-4000-8000-000000000001'
    : '71000000-0000-4000-8000-000000000002';
  const email = `${role}.cost.visual@example.test`;
  const accessToken = `${btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: expiresAt }))}.test-signature`;

  cy.intercept('GET', '**/assets/runtime-config.json', {
    statusCode: 200,
    body: {
      api: {
        mode: 'supabase',
        baseUrl: '',
        supabaseUrl: 'https://slice3-visual.supabase.co',
        supabaseAnonKey: accessToken,
      },
    },
  });
  cy.intercept('GET', '**/rest/v1/**', { statusCode: 200, body: [] });
  cy.intercept('POST', '**/rest/v1/**', { statusCode: 201, body: [] });
  cy.intercept('PATCH', '**/rest/v1/**', { statusCode: 200, body: [] });
  cy.intercept('POST', '**/auth/v1/token*', {
    statusCode: 200,
    body: {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'slice3-visual-refresh-token',
      user: { id: userId, email, created_at: nowIso, last_sign_in_at: nowIso, app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
    },
  }).as(`${role}Login`);
  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: { id: userId, email, created_at: nowIso, last_sign_in_at: nowIso, app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
  });
  cy.intercept('GET', '**/rest/v1/profiles*', {
    statusCode: 200,
    body: [{ id: userId, username: email, display_name: role === 'office' ? 'Cost Office Admin' : 'Cost Director', role, is_active: true, organization_id: organizationId, created_at: '2026-08-01T08:00:00.000Z' }],
  });
  cy.intercept('GET', '**/rest/v1/profile_site_access*', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/rest/v1/sites*', {
    statusCode: 200,
    body: [
      { id: northSiteId, organization_id: organizationId, name: 'North Works', location: 'Free State', job_number: 'NORTH-001', team_name: 'North Team', estimated_duration: '12 months', compliance_checklist: ['Safety file'], is_active: true },
      { id: southSiteId, organization_id: organizationId, name: 'South Works', location: 'Free State', job_number: 'SOUTH-002', team_name: 'South Team', estimated_duration: '8 months', compliance_checklist: ['Safety file'], is_active: true },
    ],
  });
  cy.intercept('GET', '**/rest/v1/vendor_accounts*', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/rest/v1/vendor_invoice_records*', { statusCode: 200, body: [] });
  cy.intercept('POST', '**/rest/v1/rpc/reconcile_site_job_costs', { statusCode: 200, body: costRows }).as(`${role}Costs`);

  return { userId, email };
}

function login(role, width, height) {
  const account = stubSupabase(role);
  cy.viewport(width, height);
  cy.visit(`/login/${role}?redirect=/${role === 'office' ? 'office-admin' : 'director'}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem('senatla_ops_onboarding_v1', JSON.stringify([`${account.userId}:${role}`]));
    },
  });
  cy.get('input[name="username"]').type(account.email);
  cy.get('input[name="password"]').type('visual-test-password');
  cy.contains('button', 'Continue').click();
  cy.wait(`@${role}Login`);
}

function expectNoPageOverflow() {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth + 1);
  });
}

describe('Slice 3 site and job cost-attribution visual contract', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile-390x844', width: 390, height: 844 },
  ]) {
    it(`reconciles the Office Admin cost workbench at ${viewport.name}`, () => {
      login('office', viewport.width, viewport.height);
      cy.get('app-ui-tab-nav', { timeout: 30000 }).should('exist').within(() => {
        cy.contains('button', 'Cost Attribution').scrollIntoView().click({ force: true });
      });
      cy.wait('@officeCosts');
      cy.get('[data-testid="cost-source-total"]').should('contain.text', '2,700');
      cy.get('[data-testid="cost-recognized-total"]').should('contain.text', '1,500');
      cy.get('[data-testid="cost-unattributed-total"]').should('contain.text', '1,200');
      cy.get('[data-testid="cost-reconciliation"]').should('contain.text', '2,700');
      cy.contains('NORTH-001').should('be.visible');
      cy.contains('SOUTH-002').should('be.visible');
      cy.contains('pending director').should('be.visible');
      cy.contains('rejected').should('be.visible');
      cy.get('[data-testid="unattributed-cost-queue"]').scrollIntoView().should('be.visible');
      expectNoPageOverflow();
      cy.screenshot(`slice3-cost-attribution-office-${viewport.name}`, { capture: 'viewport' });
    });

    it(`reconciles the Director expense and site cards at ${viewport.name}`, () => {
      login('director', viewport.width, viewport.height);
      cy.wait('@directorCosts');
      cy.get('[data-testid="director-operating-expense"]').should('contain.text', '1,500');
      cy.get('[data-testid="director-vendor-cost"]').should('contain.text', '600');
      cy.get('[data-testid="director-unattributed-cost"]').should('contain.text', '1,200');
      cy.get('[data-testid="director-site-costs"]').within(() => {
        cy.contains('NORTH-001').should('be.visible');
        cy.contains('SOUTH-002').should('be.visible');
      });
      cy.get('[data-testid="director-vendor-cost"]').should('not.contain.text', '1,800');
      expectNoPageOverflow();
      cy.screenshot(`slice3-cost-attribution-director-${viewport.name}`, { capture: 'viewport' });
    });
  }
});
