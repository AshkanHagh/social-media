# Social Media API

![Social Media](/src/image/image.png)

## [Version 1.0](https://threads-app-jg3g.onrender.com) & [Version 2.0](https://social-media-mqqn.onrender.com)

## Introduction

This is a comprehensive Social Media API built with modern technologies including [Bun](https://bun.sh/), [Express](https://expressjs.com/), [PostgreSQL](https://www.postgresql.org/), [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm), [Redis](https://redis.io/), and [TypeScript](https://www.typescriptlang.org/). It offers a full-featured backend infrastructure for managing various aspects of a social media platform.

## Features

- **Runtime**: Utilizes [Bun](https://bun.sh/) for fast execution and efficient performance.
- **Authentication**: Provides email verification and JWT-based authentication to secure user sessions.
- **Data Validation**: Uses [joi](https://joi.dev/) to ensure the integrity and security of user-submitted data.
- **User Management**: Allows for updating profile and account information, following/unfollowing users, and retrieving follower/following counts.
- **Post Management**: Enables CRUD operations for posts, fetching posts from followers, and liking posts.
- **Comment Management**: Supports CRUD operations for comments and comment replies.
- **Search Functionality**: Allows searching for users by username.
- **Caching and Session Management**: Uses Redis extensively for caching and managing sessions to enhance performance and scalability. Redis is also used as a secondary database.
- **Database Management**: Employs Drizzle ORM for type-safe and efficient interactions with PostgreSQL.

## Description

This Social Media API is designed to be scalable and feature-rich. It leverages TypeScript for type safety and expressiveness, PostgreSQL for reliable and robust data storage, and Redis for caching, session management, and as a secondary database. Drizzle ORM simplifies database interactions, making the system easier to maintain and extend.

## Installation

### Install Dependencies

```shell
npm install -g bun
bun install # install project dependencies
## Installation

### Install Dependencies

```shell
npm install -g bun
bun install # install project dependencies
```

### Setup .env file
Create a .env file in the root directory of your project and add the following environment variables:
``` shell
PORT
DATABASE_URL
REDIS_URL
NODE_ENV
ACTIVATION_TOKEN
ACTIVATION_EMAIL_TOKEN
ACCESS_TOKEN
REFRESH_TOKEN
ACCESS_TOKEN_EXPIRE
REFRESH_TOKEN_EXPIRE
SMTP_HOST
SMTP_PORT
SMTP_SERVICE
SMTP_MAIL
SMTP_PASSWORD
ORIGIN
```

### Start the app
```shell
bun run dev # Run in development mode with --watch
bun run db:generate # Generate database schema with Drizzle
bun run db:migrate # Apply database migrations with Drizzle
bun run db:studio # Open Drizzle Studio for database management
```

<i>Written by Ashkan.</i>