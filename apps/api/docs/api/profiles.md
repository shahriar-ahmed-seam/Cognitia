# Profiles API

Every route needs `Authorization: Bearer <token>`. The code is in `src/modules/profiles/`. Profiles never include emails or password hashes, except your own email on `/api/profile`.

## Your profile: `/api/profile`

| Route | Notes |
|---|---|
| `GET /api/profile` | `{ user }`: your fields, including `email`, `bio`, `links`, `skills`, `coverUrl`, `graduationYear`, `joinedAt`. |
| `PATCH /api/profile` | Any of `name` (2 to 80), `username`, `headline` (≤ 120), `bio` (≤ 1,200, Markdown), `institution`, `major`, `grade`, `graduationYear` (1990 to 2040), `location`, `website`, `links` (`github, linkedin, website, facebook, codeforces`, full http(s) URLs), `skills` (≤ 15, ≤ 32 characters each), `coverId` (a `COVER` upload from `POST /api/community/media`, or null). Empty strings clear optional fields. Returns `{ user }`. A taken username answers `409 USERNAME_TAKEN`. |
| `GET /api/profile/username-available?u=` | `{ username, available }`. Usernames are 3 to 24 lowercase letters, numbers or underscores; a few (`admin`, `me`, `edit`, ...) are reserved. |
| `POST /api/profile/avatar` | Multipart `file`, an image ≤ 2 MB (the web app shrinks it first). Returns `{ avatarUrl }`. |
| `DELETE /api/profile/avatar` | Returns `{ avatarUrl: null }`. |
| `PUT /api/profile/password` | `{ currentPassword, newPassword (8 to 128) }`. A wrong current password answers `WRONG_PASSWORD`. |

Every account has a username: existing accounts got one from their email when the community shipped, and new accounts get one at sign-up.

## Other people: `/api/users`

| Route | Notes |
|---|---|
| `GET /api/users/:handle` | By username or id. `{ profile }` with the public fields, `stats` (reputation, posts, questions, answers, accepted, followers, following, eventsHosted), `contestRating`, `badges`, `expertise` (top tags by answer score), `spaces` (visible to you), `isMe`, `isFollowing`, `followsYou`. |
| `PUT` / `DELETE /api/users/:id/follow` | `{ following, followers }`. Following someone notifies them and puts their posts in your Following feed. |
| `GET /api/users/:id/followers` / `following?page=&limit=` | `{ people: [UserMini & { isFollowing, isMe }], hasMore }` |

Avatars are served at `/api/public/avatars/:userId?v=<version>` so `<img>` tags work without a token; the version changes when the photo does.
