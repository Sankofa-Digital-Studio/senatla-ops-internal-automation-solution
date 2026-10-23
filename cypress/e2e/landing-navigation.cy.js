describe('public landing navigation', () => {
  it('shows the cornerstone welcome gate and routes both public navigation links to real sections', () => {
    cy.visit('/landing');

    cy.get('.cornerstone-loader')
      .should('be.visible')
      .and('contain.text', 'Senatla means a rock');
    cy.get('.cornerstone-loader').should('not.exist');

    cy.get('a[href="#capabilities"]').first().click();
    cy.get('#capabilities').should('be.visible');
    cy.get('a[href="#assurance"]').first().click();
    cy.get('#assurance').should('be.visible');
  });
});