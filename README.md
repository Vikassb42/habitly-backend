# Habit Tracker Backend (Node.js + Express + MongoDB Atlas + JWT)

REST API powering the HabitFlow frontend. Extended from the original backend:
auth (register/login/JWT), habits CRUD, and completion are preserved; the
status system (done/skip/fail/undo), habit fields, history, profile updates,
and Asia/Kolkata daily dates were added to fully match the frontend.

## Local setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run dev
```

The API is served at `http://localhost:5000/api`.

## Connecting the frontend

The frontend auto-switches from mock data to this API the moment a
`VITE_API_URL` env var is present (e.g. `http://localhost:5000/api`).
No other frontend change is needed.

## Deploying (Render example)

1. Push this repo (or just the `backend/` folder) to GitHub.
2. Render → New → Web Service → select the repo (Root Directory: `backend` if the repo has a frontend too).
3. Build command: `npm install` — Start command: `npm start` (Render injects `PORT`).
4. Add environment variables: `MONGO_URI`, `JWT_SECRET` (and optionally `CLIENT_ORIGIN`).
5. Update the frontend's `VITE_API_URL` to `https://<your-service>.onrender.com/api`.

## Security notes

- **Never commit `.env`.** Rotate any credentials that have been shared or committed before.
- JWTs expire after 7 days; passwords are hashed with bcryptjs.
- Every habit query is scoped to the authenticated user (`req.userId`), so one
  user can never read or modify another user's habits.
- Without `CLIENT_ORIGIN`, CORS allows all origins. Set it to your frontend URL in production.

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | – | Login `{email, password}` → `{token, user}` |
| POST | `/api/auth/google` | – | **Demo** Google sign-in `{email, name?}` → `{token, user, demo: true}` |
| PUT | `/api/users/me` | JWT | Update profile `{name?, email?}` |
| GET | `/api/habits` | JWT | List the user's habits (completions as a `{date: status}` map) |
| POST | `/api/habits` | JWT | Create habit `{name, description?, category?, icon?, color?, timeOfDay?, targetDays?}` |
| PUT | `/api/habits/:id` | JWT | Update habit (partial) |
| PUT | `/api/habits/:id/complete` | JWT | Mark today (Asia/Kolkata) as done (original endpoint, kept) |
| POST | `/api/habits/:id/complete` | JWT | Set/clear a day's status `{date?, status?}` — `done`/`skip`/`fail`, `null`/`"none"` = undo, omitted = toggle |
| GET | `/api/habits/:id/history` | JWT | Completion history map `{date: status}` |
| DELETE | `/api/habits/:id` | JWT | Delete habit |