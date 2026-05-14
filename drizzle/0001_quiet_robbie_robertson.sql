CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`nameKo` varchar(200) NOT NULL,
	`bodyPart` enum('chest','back','shoulders','arms','legs','abs','glutes','cardio','stretching','full_body') NOT NULL,
	`equipment` enum('barbell','dumbbell','machine','cable','bodyweight','kettlebell','resistance_band','none') NOT NULL,
	`category` enum('strength','hypertrophy','endurance','flexibility','cardio') NOT NULL,
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL,
	`description` text,
	`descriptionKo` text,
	`primaryMuscles` json NOT NULL,
	`secondaryMuscles` json NOT NULL,
	`gifUrl` text,
	`instructions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routineId` int NOT NULL,
	`exerciseId` int NOT NULL,
	`order` int NOT NULL,
	`sets` int DEFAULT 3,
	`reps` int DEFAULT 10,
	`restSeconds` int DEFAULT 90,
	`notes` text,
	CONSTRAINT `routine_exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`goal` enum('hypertrophy','fat_loss','strength','endurance','flexibility','general') NOT NULL,
	`daysPerWeek` int DEFAULT 3,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goal` enum('hypertrophy','fat_loss','strength','endurance','flexibility','general') NOT NULL,
	`targetWeight` float,
	`weeklyWorkouts` int DEFAULT 3,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`exerciseId` int NOT NULL,
	`setNumber` int NOT NULL,
	`reps` int,
	`weightKg` float,
	`durationSeconds` int,
	`distanceM` float,
	`isWarmup` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`routineId` int,
	`name` varchar(200),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`durationMinutes` int,
	`notes` text,
	`totalVolume` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_sessions_id` PRIMARY KEY(`id`)
);
