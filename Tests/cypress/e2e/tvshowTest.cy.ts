describe("SQL TV Shows Flow - Stranger Things", () => {
  it("Loads TV shows, opens Stranger Things, and verifies details", () => {

    cy.visit("http://localhost:3000/");

    cy.get('[data-cy="go-to-tv-btn"]')
      .should("be.visible")
      .click();

    cy.url().should("include", "/tvshows");
    cy.get('[data-cy="tvshows-page-title"]')
      .should("contain", "TV Shows with PostgreSQL");

    cy.get('[data-cy="tvshows-current-page"]')
      .should("contain", "Page 1");

    cy.get('[data-cy="tvshow-card"]').should("have.length.greaterThan", 0);

    cy.get('[data-cy="tvshow-card-title"]')
      .contains("Stranger Things")
      .click();

    cy.get('[data-cy="tv-detail-page"]').should("exist");

    cy.get('[data-cy="tv-detail-title"]')
      .should("contain", "Stranger Things");

    cy.get('[data-cy="tv-detail-overview"]').should(
      "contain",
      "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl."
    );

    cy.get('[data-cy="tv-detail-showtype"]')
      .should("contain", "Scripted");

    cy.get('[data-cy="tv-detail-status"]')
      .should("contain", "Returning Series");

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
      .should("contain", "8.6")
      .and("contain", "19355");

    cy.get('[data-cy="tv-detail-language"]')
      .should("contain", "EN");

    cy.get('[data-cy="tv-detail-genres"]')
      .should("contain", "Mystery")
      .and("contain", "Action & Adventure")
      .and("contain", "Sci-Fi & Fantasy");

    cy.get('[data-cy="tv-detail-homepage"]')
      .should("be.visible")
      .and("contain", "Official Site")
      .and("have.attr", "href");

    cy.get('[data-cy="tv-detail-companies-section"]').within(() => {
      cy.contains("21 Laps Entertainment").should("exist");
      cy.contains("Netflix").should("exist");
    });

    cy.get('[data-cy="tv-detail-seasons-section"]').should("exist");

    cy.get('[data-cy="tv-detail-cast-section"]').within(() => {
      [
        "Winona Ryder",
        "David Harbour",
        "Millie Bobby Brown",
        "Finn Wolfhard",
      ].forEach((actor) => {
        cy.contains(actor).should("exist");
      });
    });

    cy.get('[data-cy="tv-detail-crew-section"]').should("exist");
  });
});
