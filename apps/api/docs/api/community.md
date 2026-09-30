# Community API

Base path: `/api/community`. Every route needs `Authorization: Bearer <token>`. The code is in `src/modules/community/`; the design is in [docs/product/community.md](../../../../docs/product/community.md). Profiles and follows are in [profiles.md](profiles.md).

Times are ISO 8601 in UTC. Errors are `{ "error", "code"?, "details"? }`; validation errors have `code: "VALIDATION"` and `details: [{ path, message }]`. Lists use a `cursor` from the previous page's `nextCursor` (null on the last page). This replaces the old `/api/qa` routes: questions, answers and votes moved into posts, replies and post votes with the same ids.

## Shapes

- **Post**: `id, type, status, title, body, preview, tags, space, author, anonymous, isAuthor, createdAt, editedAt, lastActivityAt, score, upvotes, downvotes, myVote, saved, saveCount, replyCount, answerCount, viewCount, acceptedReplyId, pinned, locked, removed, media[], embed, event, poll, ai, summary, reason, link, permissions`. In feeds, long posts carry `preview` (plain text) and `body: null`; the post page always has the full Markdown `body`. `author` is null for anonymous posts unless you wrote it or moderate the space. `reason` says why the feed picked it (`{ kind, label }`). `permissions`: `canEdit, canDelete, canModerate, canReply, canAccept`.
- **Types**: `QUESTION`, `DISCUSSION`, `ANNOUNCEMENT` (spaces only), `EVENT`, `RESOURCE`, `POLL`.
- **event**: `kind, startsAt, endsAt, location, url, host, goingCount, interestedCount, myRsvp, planTaskId, friendsGoing[], friendsGoingCount, past, googleCalendarUrl`.
- **poll**: `options[{ id, text, voteCount }], multiple, closesAt, closed, voterCount, myVotes[]`.
- **ai** (questions): `status` (`NONE`, `QUEUED`, `RUNNING`, `READY`, `FAILED`), `answer, model, at, error, helpful, unhelpful, myFeedback`.
- **Reply**: `id, parentId, body, isAnswer, author, isAsker, anonymous, isAuthor, createdAt, editedAt, score, myVote, accepted, childCount, media[], removed, permissions, children[]`. Threads are one level deep: replying to a reply joins its parent's thread.
- **PostDetail**: `{ post, replies, serverNow }`. Every write to a post or its replies returns a fresh PostDetail.
- **UserMini**: `id, name, username, avatarUrl, headline, reputation, role, institution, major, grade`. No emails.
- **Media**: `id, kind (IMAGE | VIDEO | DOCUMENT), mimeType, size, fileName, width, height, durationSec, url, posterUrl`.

## Feed and discovery

| Route | Notes |
|---|---|
| `GET /feed?tab=&type=&cursor=&limit=` | `tab`: `for_you` (default, ranked), `following` (people and spaces you follow, newest first), `latest`, `top` (this week). `limit` ≤ 30. |
| `GET /sidebar` | `{ upcomingEvents, trendingTags, suggestedSpaces, suggestedPeople, mySpaces }` |
| `GET /search?q=&type=posts\|spaces\|people&postType=&spaceId=&page=` | Posts use Postgres full-text search over title, body and tags (prefix matching, `#tag` works). People results include `isFollowing` and `isMe`. 20 per page. |
| `GET /similar?q=` | Questions like the one being typed (at least 8 characters), for "maybe it's already answered". |
| `GET /tags/trending` | Top tags of the last 14 days in public spaces. |
| `GET /events?scope=upcoming\|mine\|past&spaceId=` | `mine`: events you RSVP'd to. |
| `GET /saved` | Your saved posts, newest save first. |
| `GET /users/:userId/posts?type=` / `GET /users/:userId/answers` | Profile tabs. Other people's anonymous posts are left out. Answers come with the question they answer. |

"For you" scores each candidate by your affinity to its space, author and tags, its quality (votes, replies, accepted answer, author reputation) and freshness, with a penalty for posts you've already seen, then re-ranks so one space or author doesn't fill the page. The ranked list is cached for 10 minutes; the cursor is `token:offset`.

## Posts

### `POST /posts` (201)

| Field | Notes |
|---|---|
| `type` | Required. |
| `spaceId` | Null or omitted posts to your profile. Announcements and anonymous posts need a space. Posting in an open space you haven't joined joins you. |
| `title` | Questions ≥ 10 characters; events, polls, resources and announcements ≥ 3; discussions optional. |
| `body` | Markdown with code and KaTeX, ≤ 20,000 characters. `@username` mentions notify people who can see the post. |
| `tags` | ≤ 8 kept, normalised to slugs (`c++` stays readable). |
| `mediaIds` | From `POST /media`. Per post: 10 images, 1 video, 5 documents (not on polls). The space must allow the kind. |
| `embed` | `{ kind: CONTEST \| PAPER \| NOTE, id }`. Shown as a card; checked against what the author can see. |
| `isAnonymous` | Questions and discussions in spaces that allow it. Earns no reputation. |
| `event` | Events: `{ kind, startsAt, endsAt?, location?, url?, host? }`. At most a year ahead, at most two weeks long. |
| `poll` | Polls: `{ options: 2 to 8, multiple, closesAt? (≤ 60 days) }`. |
| `askAi` | Questions: queue an AI draft answer straight away. |

Returns PostDetail. Rate limits per student: 10 posts, 60 replies, 60 uploads and 30 reports an hour, and 5 new spaces a day.

### Reading and editing

- `GET /posts/:id`: PostDetail. Counts a view at most once per student every 6 hours.
- `PATCH /posts/:id`: `title, body, tags, mediaIds, event` (author or admin). Moving an event resets its reminders and moves plan tasks.
- `DELETE /posts/:id`: the author deletes; a moderator removes (`{ reason }`).

### Actions

| Route | Body | Notes |
|---|---|---|
| `POST /posts/:id/vote` | `{ value: 1 \| 0 \| -1 }` | Returns `{ score, upvotes, downvotes, myVote }`. You can't vote on your own post. Downvotes need 15 reputation. |
| `POST /posts/:id/accept` | `{ replyId \| null }` | The asker accepts (or clears) an answer. |
| `PUT` / `DELETE /posts/:id/save` | | `{ saved }` |
| `POST /posts/:id/poll` | `{ optionIds }` | One option unless `multiple`; `[]` removes your vote. |
| `PUT /posts/:id/rsvp` | `{ status: GOING \| INTERESTED \| null }` | |
| `POST` / `DELETE /posts/:id/plan` | | "Add to my plan": makes a study plan task due at the start (tags `event` and the kind, `sourcePostId`) and RSVPs you as going. |
| `GET /posts/:id/event.ics` | | Calendar file for the event. |
| `POST /posts/:id/pin` / `lock` | `{ value }` | Moderators. Locked posts take no new replies. |
| `POST /posts/:id/remove` | `{ reason }` | Moderators; the author is told why. |
| `POST /posts/:id/restore` | | Moderators. |

### Replies

- `POST /posts/:id/replies` (201): `{ body, parentId?, mediaIds? }` (up to 4 images). On a question, a top-level reply is an answer.
- `PATCH /replies/:id`: `{ body }` (author).
- `DELETE /replies/:id`: author or moderator. A reply with a thread under it stays as "removed".
- `POST /replies/:id/vote`: `{ value }`, returns `{ score, upvotes, downvotes, myVote }`.

## AI (DeepSeek)

Each student gets `AI_COMMUNITY_DAILY` requests a day (default 20). `GET /ai/status` returns `{ enabled, limit, left }`.

- `POST /posts/:id/ai/answer`: queue a draft answer for a question. Anyone who can read it may ask; the result is shared on the post and labelled as AI. Returns `{ status }`; poll the post until `ai.status` is `READY` or `FAILED`. Editing the question allows a redraft.
- `POST /posts/:id/ai/feedback`: `{ helpful: boolean }`.
- `POST /posts/:id/ai/summary`: summary of a thread with at least 4 replies, cached until 3 more arrive. Returns `{ summary, at, stale }`.
- `POST /ai/extract-event`: `{ text }` (a pasted notice, 20 to 6,000 characters). Returns `{ title, kind, startsAt, endsAt, location, url, host, description, tags }` for the composer; times are read as Bangladesh time.

## Media

- `POST /media` (201, multipart): `file` plus `purpose` (`POST`, `REPLY`, `POSTER`, `COVER`, `SPACE_ICON`, `SPACE_COVER`) and optional `width`, `height`, `durationSec`, `posterId` (a `POSTER` image for a video). Types are checked by content: JPEG, PNG, WebP, GIF (8 MB); MP4, WebM, MOV (60 MB, needs 20 reputation, a moderator role or organizer/admin); PDF, DOCX, PPTX, XLSX, ZIP (25 MB). Replies, posters, covers and space images take images only.
- `DELETE /media/:id`: your own unattached upload (they're cleaned up after a day anyway).
- Files are stored on disk under `UPLOAD_DIR`. Post and reply media URLs are signed (`/api/media/:id?e=&s=`, valid until the end of the next UTC day, secret `MEDIA_URL_SECRET` or `JWT_SECRET`) and support HTTP ranges for video. Covers and space images are public at `/api/public/media/:id`; avatars at `/api/public/avatars/:userId?v=`.

## Reports and moderation

- `POST /reports` (201): `{ postId | replyId, reason: SPAM | HARASSMENT | MISINFORMATION | OFF_TOPIC | OTHER, details? }`. One report per person per target.
- `GET /reports?status=OPEN&spaceId=`: grouped by target, for the space's moderators (admins see all).
- `POST /reports/:targetKey/resolve`: `{ action: REMOVE | DISMISS, note? }`. `targetKey` is `post:<id>` or `reply:<id>`.

## Spaces

| Route | Notes |
|---|---|
| `GET /spaces?scope=all\|mine\|suggested&kind=&q=&page=&limit=` | Private spaces only show to members. |
| `POST /spaces` (201) | `name, tagline, description, rules, kind, visibility, joinPolicy, courseCode, postPolicy, allowImages, allowVideo, allowDocuments, allowAnonymous, color, isOfficial`. You become the owner. |
| `GET /spaces/:idOrSlug` | `{ space, permissions: { canView, canModerate, canEditSettings, isOwner, canPost, pendingCount, openReports } }` |
| `PATCH /spaces/:idOrSlug` | Settings, plus `iconId` / `coverId` from `POST /media`. Name, visibility, join policy and posting rules are owner-only. |
| `DELETE /spaces/:idOrSlug` | Owner archives the space (read-only). |
| `GET /spaces/:idOrSlug/posts?sort=hot\|new\|top\|unanswered&period=week\|month\|all&type=&tag=` | Pinned posts first on `hot`. |
| `GET /spaces/:idOrSlug/leaders` | Top helpers in the last 30 days: `{ leaders: [UserMini & { score, replies }] }`. |
| `POST /spaces/:idOrSlug/join` / `leave` | Join, ask to join, or accept an invite. The last owner can't leave. |
| `PUT /spaces/:idOrSlug/notify` | `{ notify: ALL \| HIGHLIGHTS \| NONE }` |
| `GET /spaces/:idOrSlug/members?status=&q=&page=` | `PENDING`, `INVITED` and `BANNED` lists are for moderators. |
| `POST /spaces/:idOrSlug/invites` | `{ usernames }` → `{ invited, notFound }` |
| `POST /spaces/:idOrSlug/members/:userId` | `{ action: APPROVE \| DECLINE \| MAKE_MODERATOR \| MAKE_MEMBER \| MAKE_OWNER \| BAN \| UNBAN \| REMOVE, note? }` |

Who can create what:

| Space | Who |
|---|---|
| Private group (`PRIVATE`) | Any verified student, up to 10 owned |
| Public or university-only | 50 reputation, or organizers and admins |
| `COURSE`, `DEPARTMENT`, `BATCH` kinds | Organizers and admins |
| Official badge | Admins |

A private space can't use the open join policy (it becomes "ask to join"). `postPolicy` maps each post type to `MEMBERS`, `MODERATORS` or `NONE`; by default announcements are for moderators and everything else for members.

## Reputation

| Event | Change |
|---|---|
| Upvote on your question | +5 |
| Upvote on your answer | +10 |
| Upvote on anything else | +2 |
| Downvote | -2 |
| Your answer is accepted | +15 (the asker gets +2; nothing for accepting your own) |

Reputation never goes below 0, and anonymous posts earn nothing.

## Background jobs

The server's cron (every minute) sends event reminders a day and an hour before (to people going or interested), writes queued AI answers, and deletes post, reply and poster uploads left unattached for a day.
