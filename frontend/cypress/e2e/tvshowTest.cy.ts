describe("SQL TV Shows Flow – Dudley the Dragon", () => {

  it("Loads TV shows, opens Dudley the Dragon, and verifies details", () => {

    // 1. Visit homepage

    cy.visit("http://localhost:3000/");

    // Click the TV shows button
    cy.get('[data-cy="go-to-tv-btn"]')
      .should("be.visible")
      .click();


    // 2. Verify we are on the TV shows page + page 1

    cy.url().should("include", "/tvshows");
    cy.get('[data-cy="tvshows-page-title"]')
      .should("contain", "TV Shows with PostgreSQL");

    cy.get('[data-cy="tvshows-current-page"]')
      .should("contain", "Page 1");


    // 3. TV Show cards should load

    cy.get('[data-cy="tvshow-card"]').should("have.length.greaterThan", 0);


    // 4. Find and click “The Adventures of Dudley the Dragon”

    cy.get('[data-cy="tvshow-card-title"]')
      .contains("The Adventures of Dudley the Dragon")
      .click();


    // 5. Verify detail page elements

    cy.get('[data-cy="tv-detail-page"]').should("exist");


    // 6. Core details

    cy.get('[data-cy="tv-detail-title"]')
      .should("contain", "The Adventures of Dudley the Dragon");

    cy.get('[data-cy="tv-detail-overview"]').should(
      "contain",
      "The story follows Dudley, a dragon"
    );

    cy.get('[data-cy="tv-detail-showtype"]')
      .should("contain", "Scripted");

    cy.get('[data-cy="tv-detail-inproduction"]')
      .should("contain", "No");

    cy.get('[data-cy="tv-detail-first-air"]')
      .should("contain", "1993-10-07");

    cy.get('[data-cy="tv-detail-last-air"]')
      .should("contain", "1993-10-07");

    cy.get('[data-cy="tv-detail-seasons"]')
      .should("contain", "5");

    cy.get('[data-cy="tv-detail-episodes"]')
      .should("contain", "65");

    cy.get('[data-cy="tv-detail-rating"]')
      .should("contain", "10");

    cy.get('[data-cy="tv-detail-language"]')
      .should("contain", "EN");


    // 7. Page should not crash on missing genres, cast, or companies

    cy.get('[data-cy="tv-detail-genres"]')
      .should("exist")
      .should("contain", "N/A");

  });

});
