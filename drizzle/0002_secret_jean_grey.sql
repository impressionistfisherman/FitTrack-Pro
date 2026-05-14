CREATE TABLE `body_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weightKg` float NOT NULL,
	`bodyFatPct` float,
	`muscleMassPct` float,
	`notes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `body_weights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercise_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exerciseId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercise_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exercises` ADD `secondaryImages` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `weightKg` float;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `setDetails` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `user_goals` ADD `heightCm` float;--> statement-breakpoint
ALTER TABLE `user_goals` ADD `gender` enum('male','female');--> statement-breakpoint
ALTER TABLE `user_goals` ADD `birthYear` int;--> statement-breakpoint
ALTER TABLE `workout_logs` ADD `rpe` int;--> statement-breakpoint
ALTER TABLE `workout_logs` ADD `memo` text;