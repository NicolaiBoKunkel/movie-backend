describe("TMDB Movie Flow – The Godfather", () => {
  it("Loads highest rated movies, opens The Godfather, and verifies details", () => {

    // 1. Visit homepage

    cy.visit("http://localhost:3000/");

    // Click the button leading to highest rated movies
    cy.contains("Highest Rated Movies with TMDB API")
      .should("be.visible")
      .click();


    // 2. Verify page title + page 1

    cy.url().should("include", "/highestRatedMovies");

    cy.get('[data-cy="movies-page-title"]')
      .should("be.visible")
      .and("contain", "Highest Rated Movies with TMDB API");

    cy.get('[data-cy="movies-current-page"]').should("contain", "Page 1");


    // 3. Verify movie cards are loaded

    cy.get('[data-cy="movie-card"]').should("have.length.greaterThan", 0);


    // 4. Click The Godfather

    cy.get('[data-cy="movie-card"]')
      .contains("The Godfather")
      .click();


    // 5. Verify detail page

    cy.get('[data-cy="movie-detail-page"]').should("exist");

    cy.get('[data-cy="movie-detail-title"]')
      .should("contain", "The Godfather");

    cy.get('[data-cy="movie-detail-tagline"]')
      .should("contain", "An offer you can't refuse");

    cy.get('[data-cy="movie-detail-release-date"]')
      .should("contain", "1972-03-14");

    cy.get('[data-cy="movie-detail-rating"]')
      .should("contain", "8.7");

    cy.get('[data-cy="movie-detail-runtime"]')
      .should("contain", "175");

    cy.get('[data-cy="movie-detail-language"]')
      .should("contain", "EN");

    cy.get('[data-cy="movie-detail-genres"]')
      .should("contain", "Drama")
      .and("contain", "Crime");


    // 7. Verify cast

    cy.get('[data-cy="movie-detail-cast-section"]').should("exist");

    ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"].forEach(
      (actor) => {
        cy.get('[data-cy="movie-detail-cast-member"]')
          .contains(actor)
          .should("exist");
      }
    );


    // 8. Trailer button

    cy.get('[data-cy="movie-detail-trailer-btn"]')
      .should("be.visible")
      .and("contain", "Watch Trailer");
  });
});
