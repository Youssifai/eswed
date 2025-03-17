CREATE INDEX IF NOT EXISTS "files_name_idx" ON "files" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_type_idx" ON "files" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_tags_idx" ON "files" USING btree ("tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_project_name_idx" ON "files" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_project_type_idx" ON "files" USING btree ("project_id","type");