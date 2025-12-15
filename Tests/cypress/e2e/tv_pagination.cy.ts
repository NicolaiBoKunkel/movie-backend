describe("TV Pagination Flow - Stranger Things to Shameless", () => {
  it("Navigates from Page 1 to Page 2 and opens Shameless from the list", () => {

    cy.visit("http://localhost:3000/");

    cy.get('[data-cy="go-to-tv-btn"]')
      .should("be.visible")
      .click();


    cy.url().should("include", "/tvshows");
    cy.get('[data-cy="tvshows-page-title"]')
      .should("contain", "TV Shows with PostgreSQL");

    cy.get('[data-cy="tvshows-current-page"]')
      .should("contain", "Page 1");

    cy.get('[data-cy="tvshow-card"]')
      .should("have.length.greaterThan", 0);

    cy.get('[data-cy="tvshow-card-title"]')
      .first()
      .should("contain", "Stranger Things");


    cy.get('[data-cy="tvshows-next-btn"]').click();

    cy.get('[data-cy="tvshows-current-page"]')
      .should("contain", "Page 2");

    cy.get('[data-cy="tvshow-card"]')
      .should("have.length.greaterThan", 0);

    cy.get('[data-cy="tvshow-card-title"]')
      .first()
      .should("contain", "Shameless");

    cy.get('[data-cy="tvshow-card-title"]')
      .first()
      .click();

    cy.get('[data-cy="tv-detail-page"]').should("exist");
    cy.get('[data-cy="tv-detail-title"]').should("contain", "Shameless");
  });
});
