describe("TMDB Movie Flow - The Godfather", () => {
  it("Loads highest rated movies, opens The Godfather, and verifies details", () => {

    cy.visit("http://localhost:3000/");

    cy.contains("Highest Rated Movies with TMDB API")
      .should("be.visible")
      .click();

    cy.url().should("include", "/highestRatedMovies");

    cy.get('[data-cy="movies-page-title"]')
      .should("be.visible")
      .and("contain", "Highest Rated Movies with TMDB API");

    cy.get('[data-cy="movies-current-page"]').should("contain", "Page 1");

    cy.get('[data-cy="movie-card"]').should("have.length.greaterThan", 0);

    cy.get('[data-cy="movie-card"]')
      .contains("The Godfather")
      .click();

    cy.url().should("include", "/movie/");

    cy.get('[data-cy="movie-detail-page"]', { timeout: 6000 })
      .should("exist");

    cy.get('[data-cy="movie-detail-title"]')
      .should("contain", "The Godfather");

    cy.get('[data-cy="movie-detail-tagline"]')
      .should("contain", "An offer you can't refuse");

    cy.get('[data-cy="movie-detail-release-date"]')
      .should("contain", "1972-03-14");

    cy.get('[data-cy="movie-detail-rating"]')
      .invoke("text")
      .then((text) => {
        const match = text.match(/(\d+(\.\d+)?)/);

        expect(match, "rating number should exist in text").to.not.be.null;

        const rating = parseFloat(match[0]);

        expect(rating).to.be.greaterThan(8);
        expect(rating).to.be.lessThan(10);
      });

    cy.get('[data-cy="movie-detail-runtime"]')
      .should("contain", "175");

    cy.get('[data-cy="movie-detail-language"]')
      .should("contain", "EN");

    cy.get('[data-cy="movie-detail-genres"]')
      .should("contain", "Drama")
      .and("contain", "Crime");

    cy.get('[data-cy="movie-detail-cast-section"]').should("exist");

    ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"].forEach(
      (actor) => {
        cy.get('[data-cy="movie-detail-cast-member"]')
          .contains(actor)
          .should("exist");
      }
    );

    cy.get('[data-cy="movie-detail-trailer-btn"]')
      .should("be.visible")
      .and("contain", "Watch Trailer");
  });
});
