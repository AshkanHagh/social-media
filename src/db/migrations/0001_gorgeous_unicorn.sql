ALTER TABLE "replies" ADD COLUMN "authorId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replies" ADD CONSTRAINT "replies_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indexCommentId" ON "replies" ("commentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indexAuthorId" ON "replies" ("authorId");