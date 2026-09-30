// Recompute reputation from votes and accepted answers (the same rules as engine.REPUTATION).
// Used by the seed and for repairs; day to day, votes and accepts adjust it incrementally.
import { prisma } from "../../lib/database.js";
import { REPUTATION } from "./engine.js";

export async function recomputeReputation() {
  const r = REPUTATION;
  await prisma.$executeRaw`
    WITH post_rep AS (
      SELECT p."authorId" AS uid,
             sum(CASE WHEN v."value" = 1 THEN (CASE WHEN p."type" = 'QUESTION' THEN ${r.questionUpvote} ELSE ${r.otherUpvote} END) ELSE ${r.downvote} END) AS rep
      FROM "post_votes" v JOIN "posts" p ON p."id" = v."postId"
      WHERE NOT p."isAnonymous"
      GROUP BY p."authorId"
    ), reply_rep AS (
      SELECT rp."authorId" AS uid,
             sum(CASE WHEN v."value" = 1 THEN (CASE WHEN rp."isAnswer" THEN ${r.answerUpvote} ELSE ${r.otherUpvote} END) ELSE ${r.downvote} END) AS rep
      FROM "reply_votes" v JOIN "replies" rp ON rp."id" = v."replyId" JOIN "posts" p ON p."id" = rp."postId"
      WHERE NOT (p."isAnonymous" AND rp."authorId" = p."authorId")
      GROUP BY rp."authorId"
    ), accepted_rep AS (
      SELECT rp."authorId" AS uid, count(*) * ${r.accepted} AS rep
      FROM "posts" p JOIN "replies" rp ON rp."id" = p."acceptedReplyId"
      WHERE rp."authorId" <> p."authorId"
      GROUP BY rp."authorId"
    ), accepter_rep AS (
      SELECT p."authorId" AS uid, count(*) * ${r.accepter} AS rep
      FROM "posts" p JOIN "replies" rp ON rp."id" = p."acceptedReplyId"
      WHERE rp."authorId" <> p."authorId" AND NOT p."isAnonymous"
      GROUP BY p."authorId"
    ), total AS (
      SELECT uid, sum(rep) AS rep FROM (
        SELECT * FROM post_rep UNION ALL SELECT * FROM reply_rep UNION ALL SELECT * FROM accepted_rep UNION ALL SELECT * FROM accepter_rep
      ) x GROUP BY uid
    )
    UPDATE "users" u SET "reputation" = greatest(0, coalesce(t.rep, 0))::int
    FROM "users" u2 LEFT JOIN total t ON t.uid = u2."id"
    WHERE u."id" = u2."id"`;
}
