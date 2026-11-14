describe('public landing navigation', () => {
  const waitForLanding = () => {
    cy.visit('/landing');

    cy.get('.cornerstone-loader')
      .should('be.visible')
      .and('contain.text', 'Senatla means a rock');
    cy.get('.cornerstone-loader').should('not.exist');
  };

  it('routes desktop public navigation to the RBAC overview', () => {
    waitForLanding();

    cy.get('a[href="#capabilities"]').first().click();
    cy.get('#capabilities').should('be.visible');
    cy.get('a[href="#access"]').first().click();
    cy.get('#access')
      .should('be.visible')
      .and('contain.text', 'Site Manager')
      .and('contain.text', 'Administrator')
      .and('contain.text', 'Director');
    cy.get('a[href="#assurance"]').first().click();
    cy.get('#assurance').should('be.visible');
  });

  it('presents distinct high-level responsibilities for each public role', () => {
    waitForLanding();

    cy.get('#access').scrollIntoView().should('be.visible');
    cy.get('#access-heading').should('contain.text', 'responsibility');
    cy.get('.role-card').should('have.length', 3);

    cy.get('.role-card--site')
      .should('contain.text', 'Site Manager')
      .and('contain.text', 'Field operations')
      .and('contain.text', 'Expected to')
      .and('contain.text', 'Confirm readiness');
    cy.get('.role-card--admin')
      .should('contain.text', 'Administrator')
      .and('contain.text', 'Business control')
      .and('contain.text', 'Expected to')
      .and('contain.text', 'Keep records current');
    cy.get('.role-card--director')
      .should('contain.text', 'Director')
      .and('contain.text', 'Executive oversight')
      .and('contain.text', 'Expected to')
      .and('contain.text', 'Review verified evidence');

    cy.get('.role-note')
      .should('contain.text', 'Inside the workspace')
      .and('contain.text', 'not a replacement');
  });

  it('opens mobile navigation and routes its RBAC link to the same overview', () => {
    cy.viewport('iphone-6');
    waitForLanding();

    cy.get('.mobile-menu summary')
      .should('have.attr', 'aria-label', 'Open navigation menu')
      .click();
    cy.get('#mobile-navigation').should('be.visible');
    cy.get('#mobile-navigation a[href="#access"]')
      .should('be.visible')
      .click();
    cy.get('#access').should('be.visible');
    cy.get('.role-card').should('have.length', 3);
  });
});
