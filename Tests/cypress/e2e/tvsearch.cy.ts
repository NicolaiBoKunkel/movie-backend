describe("TV Search Flow - Breaking Bad", () => {
  it("Searches for Breaking Bad, loads result, and verifies detail page", () => {
    cy.visit("http://localhost:3000/tvshows");

    cy.get('[data-cy="tv-search-input"]')
      .should("be.visible")
      .clear()
      .type("Breaking Bad");

    cy.get('[data-cy="tv-search-btn"]').click();

    cy.get('[data-cy="tvshow-card"]').should("have.length.greaterThan", 0);

    cy.contains('[data-cy="tvshow-card-title"]', "Breaking Bad")
      .should("be.visible")
      .click();

    cy.get('[data-cy="tv-detail-page"]').should("exist");

    cy.get('[data-cy="tv-detail-title"]').should("contain", "Breaking Bad");

    cy.get('[data-cy="tv-detail-overview"]').should(
      "contain",
      "Walter White, a New Mexico chemistry teacher"
    );

    cy.get('[data-cy="tv-detail-showtype"]').should("contain", "Scripted");

    cy.get('[data-cy="tv-detail-status"]').should("contain", "Ended");

    cy.get('[data-cy="tv-detail-inproduction"]').should("contain", "No");

    cy.get('[data-cy="tv-detail-first-air"]').should("contain", "2008-01-20");

    cy.get('[data-cy="tv-detail-last-air"]').should("contain", "2013-09-29");

    cy.get('[data-cy="tv-detail-seasons"]').should("contain", "5");

    cy.get('[data-cy="tv-detail-episodes"]').should("contain", "62");

    cy.get('[data-cy="tv-detail-rating"]')
      .should("contain", "8.9")
      .and("contain", "16606");

    cy.get('[data-cy="tv-detail-language"]').should("contain", "EN");

    cy.get('[data-cy="tv-detail-genres"]')
      .should("contain", "Crime")
      .and("contain", "Drama");

    cy.get('[data-cy="tv-detail-homepage"]')
      .should("be.visible")
      .and("contain", "Official Site")
      .and("have.attr", "href");

    cy.get('[data-cy="tv-detail-companies-section"]').within(() => {
      cy.contains("Gran Via Productions").should("exist");
      cy.contains("Sony Pictures Television").should("exist");
    });

    cy.get('[data-cy="tv-detail-seasons-section"]').should("exist");

    cy.get('[data-cy="tv-detail-cast-section"]').within(() => {
      [
        "Bryan Cranston",
        "Aaron Paul",
        "Anna Gunn",
        "RJ Mitte",
      ].forEach((actor) => {
        cy.contains(actor).should("exist");
      });
    });

    cy.get('[data-cy="tv-detail-crew-section"]').should("exist");
  });
});

describe("TV Search Flow - No results", () => {
  it("Shows an empty state when no TV shows match the search", () => {
    cy.visit("http://localhost:3000/tvshows");

    cy.get('[data-cy="tv-search-input"]')
      .should("be.visible")
      .clear()
      .type("this-does-not-exist-123456");

    cy.get('[data-cy="tv-search-btn"]').click();

    cy.get('[data-cy="tvshow-card"]').should("have.length", 0);

    cy.get('[data-cy="tvshows-empty"]')
      .should("be.visible")
      .and("contain", "No TV shows found");
  });
});
