# PostgreSQL to Prisma Migration Plan

## Overview

This document outlines how to transition the MeetNing Appointment AI backend from direct PostgreSQL queries to using Prisma ORM.

## Steps

### 1. Import Prisma Client

Replace the PostgreSQL Pool import with the Prisma client:

```javascript
// Before
const { Pool } = require("pg");

// After
const prisma = require("./prisma/client");
```

### 2. Replace Database Initialization

Replace the `initDatabase()` function with Prisma migrations or use `prisma.db.executeRaw` for raw SQL if needed.

### 3. Replace Query Examples

#### User Authentication

```javascript
// Before
const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

// After
const user = await prisma.user.findUnique({
  where: {
    email: email
  }
});
```

#### Creating Records

```javascript
// Before
const result = await pool.query(
  "INSERT INTO users (name, email, password, timezone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, timezone",
  [name, email, hashedPassword, timezone || "UTC"]
);

// After
const user = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
    timezone: timezone || "UTC"
  },
  select: {
    id: true,
    name: true,
    email: true,
    timezone: true
  }
});
```

#### Updating Records

```javascript
// Before
const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $1 RETURNING id, name, email, timezone`;
const result = await pool.query(query, queryParams);

// After
const user = await prisma.user.update({
  where: {
    id: req.user.id
  },
  data: {
    // Dynamic fields to update
    ...(name && { name }),
    ...(timezone && { timezone })
  },
  select: {
    id: true,
    name: true,
    email: true,
    timezone: true
  }
});
```

#### Deleting Records

```javascript
// Before
await pool.query("DELETE FROM appointments WHERE id = $1 AND user_id = $2", [appointmentId, req.user.id]);

// After
await prisma.appointment.deleteMany({
  where: {
    id: parseInt(appointmentId),
    userId: req.user.id
  }
});
```

### 4. Transaction Support

For operations that require transactions:

```javascript
// Before
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Multiple queries...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

// After
await prisma.$transaction(async (tx) => {
  // Multiple operations using tx instead of prisma
  await tx.user.create({...});
  await tx.appointment.create({...});
});
```

### 5. Best Practices

- Use the Prisma Client singleton pattern to avoid connection issues
- Take advantage of Prisma's relations for nested queries
- Use `findFirst` instead of `findMany().then(results => results[0])`
- Use `connect` or `connectOrCreate` for relationships between models

## Vercel Deployment Considerations

- Ensure `DATABASE_URL` is set in Vercel environment variables
- Run `prisma generate` during build steps
- Follow the serverless connection pool best practices in the Prisma client setup
