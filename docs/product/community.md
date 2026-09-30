# Community: Design

The community (the `/community` pages) replaces the old Q&A. It's where engineering students ask for help, discuss courses, share notes and resources, and find seminars, workshops and deadlines. It mixes three familiar ideas:

- **Spaces** like subreddits or Discord servers: one per course, department, batch or section, club, topic, or private study group.
- **Questions** that work like Stack Overflow: answers are voted, the asker accepts one, and good answers earn reputation.
- **A personal feed** like Facebook or X: posts from your spaces and the people you follow, ranked for you, with a reason on each card.

Profiles are part of it: every name links to a profile with the person's answers, questions, spaces, badges and expertise. The API is documented in [apps/api/docs/api/community.md](../../apps/api/docs/api/community.md) and [profiles.md](../../apps/api/docs/api/profiles.md).

## What was wrong before

- **Accepting an answer never worked**, and lists ran one query per question.
- **Password hashes and avatar bytes leaked** through question and profile responses.
- **Profiles were mock data**, so nobody could look anyone up.
- **Everything was one flat list** with a subject filter: no courses, clubs, events or privacy.

The old questions, answers and votes were moved into posts, replies and votes with the same ids (old `/question/:id` links redirect), and each old subject became a tag.

## Spaces

| Kind | For | Who can create it |
|---|---|---|
| Course | One space per course (CSE 313), with questions, notes and CT prep | Organizers and admins |
| Department | Notices and events | Organizers and admins |
| Batch | A batch or section | Organizers and admins |
| Club | Student clubs and societies | 50 reputation, organizers, admins |
| Topic | Interests across universities (competitive programming, higher studies) | 50 reputation, organizers, admins |
| Group | Private study, thesis and project groups | Any verified student, up to 10 |

- **Visibility**: public (anyone on Cognitia), university only (students of the space's university), or private (members only, hidden from search).
- **Joining**: open (one click), ask to join (a moderator approves), or invite only. Private spaces are never open.
- **Roles**: owner, moderator, member. Moderators approve requests, pin and lock posts, remove posts and replies, handle reports, invite and ban. Owners also change the name, visibility, join policy and posting rules, and can archive the space.
- **Posting rules** per post type: members, moderators only, or nobody. By default announcements are for moderators and everything else is for members. A space can also turn off images, video, documents or anonymous posts.
- **Official** spaces (a badge set by admins) are the department's and course teachers' own.

## Posts

| Type | What it adds |
|---|---|
| Question | Answers are voted and sorted; the asker accepts one. Similar questions show while you type the title. An AI draft answer can be requested. |
| Discussion | Replies in threads (one level deep) |
| Event | Date and time, place, link and host. RSVP (going or interested), friends going, reminders a day and an hour before, "Add to my plan", Google Calendar and .ics |
| Resource | Documents (PDF, Word, PowerPoint, Excel, ZIP) with an in-app PDF preview |
| Poll | 2 to 8 options, single or multiple choice, optional closing time |
| Announcement | Spaces only, moderators by default, highlighted in the feed |

Any post can have Markdown with code and math, photos (up to 10), one video, documents, tags and a card for a contest, practice paper or note. Questions and discussions can be anonymous in spaces that allow it: other students see "Anonymous student", moderators still see who posted, and anonymous posts earn no reputation. Posts without a space go on the author's profile and to their followers.

### "Add to my plan"

The event example that drove the design: a club shares a seminar with its time, and a student adds it to their plan in one click. That creates a study plan task due at the start (tagged `event`), marks them as going, and sends reminders. The AI scheduler leaves event tasks alone. Moving the event moves the task.

## The feed

Tabs: **For you** (ranked), **Following** (people and spaces, newest first), **Latest** and **Top** (this week), with a type filter.

"For you" ranks recent posts the student can see:

- **Affinity**: joined spaces, people followed, and interests learned from what they read, vote on, reply to and save. Interests fade with a 30-day half-life.
- **Study signals**: posts on topics they've done badly on in practice papers get a lift ("A topic to revise: #paging"), and so do unanswered questions in tags where they've answered well ("Unanswered in #os, a topic you know").
- **Quality**: votes, replies, an accepted answer and the author's reputation, with a penalty for heavily downvoted posts.
- **Freshness**, plus a lift for events coming up soon.
- **Seen**: posts already opened drop down.
- **Diversity**: a re-rank so one space or one author doesn't fill a page.

Each card says why it was picked (for example "From CSE 313: Operating Systems", "From someone you follow", "Event coming up", "Popular at your university"). The ranking is computed on the server and cached for 10 minutes, so scrolling is cheap.

## AI

All AI is Cognitia's DeepSeek platform key, with a daily allowance per student (`AI_COMMUNITY_DAILY`, default 20).

- **Draft answers** for questions, written in the background and shown above the human answers, clearly labelled, with helpful and not helpful buttons. Anyone who can read the question may ask; the draft is shared. Photos attached to the question are included.
- **Thread summaries** for threads with four or more replies ("Catch me up").
- **Event details from a notice**: paste a Facebook or email notice into the composer and the AI fills in the title, kind, time (as Bangladesh time), place, link and tags.
- **Similar questions** use Postgres full-text search, not AI, so they're instant and free.

The AI never posts as a person and never accepts answers.

## Reputation and privileges

Upvotes earn the author 5 (question), 10 (answer) or 2 (anything else); a downvote costs 2; an accepted answer earns 15 and the asker 2. Reputation unlocks downvoting (15), video uploads (20) and public spaces (50). Organizers and admins have these from the start. Badges (first answer, problem solver, trusted, event host, top helper in a space and more) show on profiles.

## Moderation and safety

- Anyone can report a post or reply (spam, harassment, wrong or misleading, off topic, other). Reports are grouped per target in the space's moderation queue.
- Moderators remove with a reason the author sees, and can restore. Locked posts take no new replies.
- Rate limits on posting, replying, uploading, reporting and creating spaces.
- Uploads are checked by content, not file name, and have size limits (images 8 MB, video 60 MB, documents 25 MB). Private media links are signed and expire; covers and space images are public.
- Mentions only notify people who can see the post.

## Built for lab PCs

- Feeds load 15 posts at a time and fetch more near the bottom of the page.
- Long posts show a preview in feeds; images are resized before upload and load lazily; videos show a poster frame and only load when played.
- Animations (the stage heroes, aurora, particle canvas, live rings and staggered entrances) only animate transform and opacity, and stop when the system asks for reduced motion.

## Not built yet

- Direct messages and group chat
- Link previews for pasted URLs
- Video transcoding (videos play as uploaded)
- Authenticated WebSocket connections for live notifications (the socket currently trusts the `userId` it's given)
