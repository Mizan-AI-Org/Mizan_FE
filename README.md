This is the frontend for the Mizan Restaurant Operations Platform.

## Installation

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Run `npm run dev` to start the development server

## Usage

1. Run `npm run dev` to start the development server
2. Open the browser and go to `http://localhost:8080`
3. Login with the username and password you created in the database

## Shift Reviews Admin

- Admins/Managers can view shift feedback, see total likes, and basic analytics.
- Page: `ShiftReviewsAdminPage.tsx` under `src/pages/`.
- Features:
  - Analytics summary card (total reviews, total likes, counts by rating, top tags)
  - Reviews table with rating, tags, comments, hours
  - Inline like button per review showing current `likes_count`
- API integration (`src/lib/api.ts`):
  - `submitShiftReview(payload)` — POST `/attendance/shift-reviews/`
  - `getShiftReviews(params)` — GET `/attendance/shift-reviews/`
  - `likeShiftReview(reviewId)` — POST `/attendance/shift-reviews/<id>/like/`
  - `getShiftReviewStats(params)` — GET `/attendance/shift-reviews/stats/`

Notes
- Ensure the backend is running at `http://localhost:8000` and tokens are valid.
- Frontend uses `VITE_REACT_APP_API_URL` if set; otherwise defaults to `http://localhost:8000/api`.
