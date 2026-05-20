DELETE FROM `knowledgeChunk`
WHERE `sourceId` IN (
  SELECT stale.`id`
  FROM `knowledgeSource` AS stale
  INNER JOIN `knowledgeSource` AS keep
    ON keep.`resourceId` = stale.`resourceId`
   AND (
     keep.`updatedAt` > stale.`updatedAt`
     OR (keep.`updatedAt` = stale.`updatedAt` AND keep.`createdAt` > stale.`createdAt`)
     OR (keep.`updatedAt` = stale.`updatedAt` AND keep.`createdAt` = stale.`createdAt` AND keep.`id` > stale.`id`)
   )
);
--> statement-breakpoint
DELETE FROM `knowledgeSource`
WHERE `id` IN (
  SELECT stale.`id`
  FROM `knowledgeSource` AS stale
  INNER JOIN `knowledgeSource` AS keep
    ON keep.`resourceId` = stale.`resourceId`
   AND (
     keep.`updatedAt` > stale.`updatedAt`
     OR (keep.`updatedAt` = stale.`updatedAt` AND keep.`createdAt` > stale.`createdAt`)
     OR (keep.`updatedAt` = stale.`updatedAt` AND keep.`createdAt` = stale.`createdAt` AND keep.`id` > stale.`id`)
   )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledgeSources_resourceId_unique` ON `knowledgeSource` (`resourceId`);
