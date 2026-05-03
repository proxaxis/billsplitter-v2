CREATE TABLE `grps` (
  `gid` int PRIMARY KEY AUTO_INCREMENT,
  `public_gid` char(32) UNIQUE NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(1024),
  `icon` varchar(16) NOT NULL,
  `currency` varchar(8) NOT NULL,
  `timezone` varchar(128) NOT NULL DEFAULT 'UTC',
  `start_at` datetime,
  `end_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime
);

CREATE TABLE `members` (
  `gid` int,
  `mmid` int,
  `uid` int,
  `name` varchar(128) NOT NULL,
  `icon` varchar(16) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `left_at` datetime,
  `is_checked` boolean DEFAULT false,
  PRIMARY KEY (`gid`, `mmid`)
);

CREATE TABLE `sub_groups` (
  `gid` int,
  `sgid` int,
  `name` varchar(128) NOT NULL,
  `is_disabled` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`gid`, `sgid`)
);

CREATE TABLE `sub_group_members` (
  `gid` int,
  `sgid` int,
  `mmid` int,
  PRIMARY KEY (`gid`, `sgid`, `mmid`)
);

CREATE TABLE `categories` (
  `gid` int,
  `ctid` int,
  `name` varchar(32),
  `is_disabled` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`gid`, `ctid`)
);

CREATE TABLE `payments` (
  `gid` int,
  `pmid` int,
  `name` varchar(128) NOT NULL,
  `description` varchar(1024),
  `amount` int NOT NULL DEFAULT 0,
  `paid_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime,
  `currency` varchar(8) NOT NULL,
  `exchange_rate` NUMERIC(10,2) NOT NULL DEFAULT 1,
  `type` varchar(16) NOT NULL DEFAULT 'error',
  `is_disabled` boolean NOT NULL DEFAULT false,
  `paid_by` int NOT NULL,
  PRIMARY KEY (`gid`, `pmid`)
);

CREATE TABLE `payees` (
  `gid` int,
  `pmid` int,
  `mmid` int,
  PRIMARY KEY (`gid`, `pmid`, `mmid`)
);

CREATE TABLE `users` (
  `uid` int PRIMARY KEY AUTO_INCREMENT,
  `public_uid` char(32) UNIQUE NOT NULL,
  `nickname` varchar(128) NOT NULL,
  `email` varchar(255) UNIQUE NOT NULL,
  `icon` varchar(16) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `deleted_at` datetime
);

CREATE TABLE `social_accounts` (
  `uid` int,
  `social_id` varchar(256) COMMENT 'Google Sub ID',
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`uid`, `social_id`)
);

CREATE TABLE `user_groups` (
  `gid` int,
  `uid` int,
  PRIMARY KEY (`gid`, `uid`)
);

ALTER TABLE `members` ADD FOREIGN KEY (`gid`) REFERENCES `grps` (`gid`) ON DELETE CASCADE;

ALTER TABLE `members` ADD FOREIGN KEY (`uid`) REFERENCES `users` (`uid`);

ALTER TABLE `sub_groups` ADD FOREIGN KEY (`gid`) REFERENCES `grps` (`gid`) ON DELETE CASCADE;

ALTER TABLE `categories` ADD FOREIGN KEY (`gid`) REFERENCES `grps` (`gid`) ON DELETE CASCADE;

ALTER TABLE `payments` ADD FOREIGN KEY (`gid`) REFERENCES `grps` (`gid`) ON DELETE CASCADE;

ALTER TABLE `payments` ADD FOREIGN KEY (`gid`, `paid_by`) REFERENCES `members` (`gid`, `mmid`) ON DELETE CASCADE;

ALTER TABLE `sub_group_members` ADD FOREIGN KEY (`gid`, `sgid`) REFERENCES `sub_groups` (`gid`, `sgid`) ON DELETE CASCADE;

ALTER TABLE `sub_group_members` ADD FOREIGN KEY (`gid`, `mmid`) REFERENCES `members` (`gid`, `mmid`) ON DELETE CASCADE;

ALTER TABLE `payees` ADD FOREIGN KEY (`gid`, `pmid`) REFERENCES `payments` (`gid`, `pmid`) ON DELETE CASCADE;

ALTER TABLE `payees` ADD FOREIGN KEY (`gid`, `mmid`) REFERENCES `members` (`gid`, `mmid`) ON DELETE CASCADE;

ALTER TABLE `social_accounts` ADD FOREIGN KEY (`uid`) REFERENCES `users` (`uid`);

ALTER TABLE `user_groups` ADD FOREIGN KEY (`gid`) REFERENCES `grps` (`gid`);

ALTER TABLE `user_groups` ADD FOREIGN KEY (`uid`) REFERENCES `users` (`uid`);
