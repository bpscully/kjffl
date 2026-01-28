# KJ's FFL Scores

## High-Level Overview

KJ's FFL Scores is a web application for tracking fantasy football scores. It allows a user to select a season and a week, search for NFL players, and add them to a personal roster. For each player, the application displays their photo, team, position, and calculated fantasy score for the selected week, along with their game status.

## Technical Foundation

*   **Framework**: Next.js (React)
*   **Hosting**: Vercel
*   **Styling**: Tailwind CSS
*   **UI Components**: Shadcn/ui
*   **Theme**: Light and Dark mode with a theme switcher.
*   **Backend**: Next.js API routes to fetch data from a public-facing ESPN API. Specific API details will be documented in `espn_api_notes.md`.
*   **Data Persistence**: The user's roster will be stored in the browser's `localStorage`.

## Key Features & Requirements

1.  **Player Management**:
    *   Fetches a complete list of active NFL players, including defensive teams (DST).
    *   Caches the player list locally (`players-cache.json`) to improve performance, with periodic refreshes.
    *   Users can search for any player to view their score.
    *   Users can add/remove players to a personal roster that persists across sessions.

2.  **Time Selection**:
    *   Dropdowns to select the year (season) and week.
    *   The available weeks will be dynamically updated based on the selected season.

3.  **Core Requirements**:
    *   There default screen is a search bar + button to add players. The search bar must have look-ahead suggestions after the user types 3 characters. 
    *   Adding a player will create a new player card that contains the player's name, team, and position. 
    *   The player roster will contain cards divided into 2 sections: 1 for "Starting Lineup" and 1 for "Bench".
    *   There should be a button or other way to transition to a "live scoring" view. By default it will go to the current week of the NFL season, but there should be a selectors to change to other NFL seasons (by year) and other weeks. 
    *   There should be some indication of whether a player already played for the week, is playing live, or has not yet played. 
    *   There should be some indicator of injury status in the player card, perhaps with a hover providing more details. 
    *   A backend process will provide the details necessary to calculate the player's fantasy score based on the rules defined in `app/lib/scoring_rules.ts`.
    *   The back end should produce a list of details for each point(s) scored. example (doesn't have to be exactly this format): {"receiving TD 25 yds":3}{"total_rec_yds:114":2} -> The front end can calculate total score is 3 + 2 and display the reasons with the strings provided. 

The main application code is located in the `app/` directory.
    *   The display will include the player's opponent and the game's status (e.g., live, final, upcoming, bye week).

4.  **Design & UX**:
    *   The UI will be clean, modern, minimalist, and responsive, inspired by the ESPN fantasy app.
    *   Verbose details will be available in expandable components to keep the main view uncluttered.

5.  **Robustness**:
    *   The application will use a `fetchWithRetry` utility to handle potential network errors when communicating with the external ESPN API.

6.  **Testing Strategy**:
    *   **Unit Testing**: Use **Vitest** for testing individual components, functions, and utilities.
    *   **End-to-End Testing**: Employ **Playwright** for simulating user interactions and testing complete application flows.

7.  **Development Process**:
    *   Use git for source control. We can use a local git repo for initial development, but I would like the option to move to github in the future. 
    *   Use modern development practices, good abstractions, and concepts like DRY (Don't repeat yourself). 
    *   We will work feature by feature together. I would like to review the code before it is commited. 
    *   After a feature is implemented please suggest thorough unit tests. 
    *   If at any point instructions are unclear please ask. Do not make assumptions. 

