# SQLite Integration

This document covers setting up and running SQLite with the JHipster Rust generator.

## Overview

SQLite is the default database for JHipster Rust projects. It requires no external database server and stores data in a local file, making it ideal for development and small-scale deployments.

## Prerequisites

### macOS Setup

SQLite comes pre-installed on macOS. No additional installation is required.

### Linux Setup

On most Linux distributions, SQLite is pre-installed. If not, install it:

**Ubuntu/Debian:**

```bash
sudo apt-get install sqlite3 libsqlite3-dev
```

**Fedora/RHEL:**

```bash
sudo dnf install sqlite sqlite-devel
```

**Arch Linux:**

```bash
sudo pacman -S sqlite
```

### Windows Setup

Download SQLite from the [official website](https://www.sqlite.org/download.html) and add the directory to your PATH.

## Configuration

### Database Location

The SQLite database file is stored in the project root directory. The default configuration in `.env`:

```
DATABASE_URL=sqlite://./data.db
```

You can customize the database file location:

```
DATABASE_URL=sqlite:///absolute/path/to/database.db
DATABASE_URL=sqlite://./relative/path/database.db
```

### In-Memory Database

For testing or temporary data, you can use an in-memory database:

```
DATABASE_URL=sqlite://:memory:
```

Note: In-memory databases are lost when the application stops.

## Running Migrations

Before starting the server, run the database migrations:

```bash
cd server
diesel migration run
```

To revert the last migration:

```bash
diesel migration revert
```

To check migration status:

```bash
diesel migration pending
```

### Creating the Database

The database file is created automatically when you run migrations. If it doesn't exist, Diesel will create it.

## Running the Server

Once migrations are applied:

```bash
cd server
cargo run
```

The server will start on `http://localhost:8080`.

## Running Tests

Integration tests use a separate SQLite database file for isolation. The tests automatically create temporary database files.

```bash
# Run all tests (SQLite supports parallel tests)
cargo test

# Run with single thread if you encounter issues
cargo test -- --test-threads=1

# Run only unit tests (no database required)
cargo test --lib -- --skip integration
```

### Test Database Configuration

By default, tests create unique temporary database files. You can override this with:

```bash
export TEST_DATABASE_URL="sqlite://./test.db"
cargo test
```

## Database Management

### Viewing Database Contents

Use the `sqlite3` command-line tool:

```bash
sqlite3 data.db

# List tables
.tables

# Show schema
.schema

# Query data
SELECT * FROM users;

# Exit
.quit
```

### Backup and Restore

**Backup:**

```bash
sqlite3 data.db ".backup 'backup.db'"
# or simply copy the file
cp data.db backup.db
```

**Restore:**

```bash
cp backup.db data.db
```

### Database Size

Check the database file size:

```bash
ls -lh data.db
```

Vacuum to reclaim space after deletions:

```bash
sqlite3 data.db "VACUUM;"
```

## Troubleshooting

### Database is Locked

```
Error: database is locked
```

**Solution:** This occurs when multiple processes try to write simultaneously. SQLite uses file-based locking. Ensure only one instance of the application is running, or switch to PostgreSQL/MySQL for concurrent access.

### No Such Table

```
Error: no such table: users
```

**Solution:** Run the database migrations:

```bash
diesel migration run
```

### Permission Denied

```
Error: unable to open database file
```

**Solution:** Check file permissions:

```bash
chmod 644 data.db
chmod 755 $(dirname data.db)
```

### Database File Not Found

```
Error: unable to open database file: ./data.db
```

**Solution:** Ensure you're running commands from the correct directory (project root) or use an absolute path in `DATABASE_URL`.

## Differences from PostgreSQL/MySQL

SQLite has some differences to be aware of:

| Feature          | SQLite                       | PostgreSQL/MySQL |
| ---------------- | ---------------------------- | ---------------- |
| Concurrency      | Limited (file lock)          | Full multi-user  |
| Data Types       | Dynamic typing               | Strict typing    |
| Foreign Keys     | Optional (enabled by Diesel) | Built-in         |
| JSON Support     | Limited                      | Full             |
| Full-Text Search | FTS5 extension               | Built-in         |

### SQL Syntax Differences

Some SQL features work differently in SQLite:

- `AUTOINCREMENT` instead of `SERIAL`/`AUTO_INCREMENT`
- No `ENUM` type (use `TEXT` with constraints)
- Limited `ALTER TABLE` support
- `BOOLEAN` stored as `INTEGER` (0/1)

## When to Use SQLite

**Good for:**

- Development and prototyping
- Small applications with single-user access
- Embedded applications
- Testing and CI/CD pipelines
- Desktop applications

**Consider PostgreSQL/MySQL for:**

- Production web applications
- Multi-user concurrent access
- Large datasets (> 1GB)
- Complex queries and full-text search
- High availability requirements

## Production Considerations

If using SQLite in production:

1. **Backups**: Set up regular file backups
2. **WAL Mode**: Enable Write-Ahead Logging for better concurrency:
   ```sql
   PRAGMA journal_mode=WAL;
   ```
3. **Synchronous Mode**: Balance durability vs performance:
   ```sql
   PRAGMA synchronous=NORMAL;
   ```
4. **File Permissions**: Secure the database file
5. **Monitoring**: Monitor file size and vacuum regularly

## Migrating to PostgreSQL/MySQL

When your application outgrows SQLite:

1. Export data from SQLite
2. Regenerate the application with PostgreSQL/MySQL
3. Import data into the new database
4. Update `DATABASE_URL` in `.env`

Tools like `pgloader` can help automate SQLite to PostgreSQL migration.
