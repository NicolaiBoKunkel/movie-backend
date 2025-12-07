describe("SQL TV Shows Flow – Dudley the Dragon", () => {

  it("Loads TV shows, opens Stranger Things, and verifies details", () => {

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


    // 4. Find and click “Stranger Things”

    cy.get('[data-cy="tvshow-card-title"]')
      .contains("Stranger Things")
      .click();


    // 5. Verify detail page elements

    cy.get('[data-cy="tv-detail-page"]').should("exist");


    // 6. Core details

    cy.get('[data-cy="tv-detail-title"]')
      .should("contain", "Stranger Things");

    cy.get('[data-cy="tv-detail-overview"]').should(
      "contain",
      "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl."
    );

    cy.get('[data-cy="tv-detail-showtype"]')
      .should("contain", "Scripted");

    cy.get('[data-cy="tv-detail-inproduction"]')
      .should("contain", "Yes");

    cy.get('[data-cy="tv-detail-first-air"]')
      .should("contain", "2016-07-15");

    cy.get('[data-cy="tv-detail-last-air"]')
      .should("contain", "2025-11-26");

    cy.get('[data-cy="tv-detail-seasons"]')
      .should("contain", "5");

    cy.get('[data-cy="tv-detail-episodes"]')
      .should("contain", "42");

    cy.get('[data-cy="tv-detail-rating"]')
      .should("contain", "8.6");

    cy.get('[data-cy="tv-detail-language"]')
      .should("contain", "EN");


    // 7. Page should not crash on missing genres, cast, or companies

    cy.get('[data-cy="tv-detail-genres"]')
      .should("exist")
      .should("contain", "Mystery, Action & Adventure, Sci-Fi & Fantasy");

  });

});
