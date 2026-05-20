DELETE FROM `knowledgeChunk`
WHERE `id` IN (
  SELECT stale.`id`
  FROM `knowledgeChunk` AS stale
  INNER JOIN `knowledgeChunk` AS keep
    ON keep.`sourceId` = stale.`sourceId`
   AND keep.`chunkIndex` = stale.`chunkIndex`
   AND (
     keep.`createdAt` > stale.`createdAt`
     OR (keep.`createdAt` = stale.`createdAt` AND keep.`id` > stale.`id`)
   )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledgeChunks_source_chunk_unique` ON `knowledgeChunk` (`sourceId`,`chunkIndex`);
