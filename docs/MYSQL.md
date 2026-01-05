# MySQL Integration

This document covers setting up and running MySQL with the JHipster Rust generator.

## Prerequisites

### macOS Setup

On macOS, you need to install the MySQL client library for the Diesel ORM to compile:

```bash
brew install mysql-client
```

After installation, you need to configure the environment so that Rust can find the library during compilation.

#### Setting MYSQLCLIENT_LIB_DIR

The `mysqlclient-sys` crate (used by Diesel) needs to know where the MySQL client library is located. Set the `MYSQLCLIENT_LIB_DIR` environment variable:

**Apple Silicon (M1/M2/M3):**

```bash
export MYSQLCLIENT_LIB_DIR="/opt/homebrew/opt/mysql-client/lib"
```

**Intel Mac:**

```bash
export MYSQLCLIENT_LIB_DIR="/usr/local/opt/mysql-client/lib"
```

You can add this to your shell profile (`~/.zshrc` or `~/.bashrc`) to make it permanent:

```bash
# For Apple Silicon
echo 'export MYSQLCLIENT_LIB_DIR="/opt/homebrew/opt/mysql-client/lib"' >> ~/.zshrc

# For Intel Mac
echo 'export MYSQLCLIENT_LIB_DIR="/usr/local/opt/mysql-client/lib"' >> ~/.zshrc
```

#### Alternative: Using .cargo/config.toml

You can also create a `.cargo/config.toml` file in your server directory:

```toml
[env]
MYSQLCLIENT_LIB_DIR = "/opt/homebrew/opt/mysql-client/lib"

[target.'cfg(target_os = "macos")']
rustflags = ["-L", "/opt/homebrew/opt/mysql-client/lib", "-L", "/usr/local/opt/mysql-client/lib"]
```

### Linux Setup

On most Linux distributions, install the MySQL development package:

**Ubuntu/Debian:**

```bash
sudo apt-get install libmysqlclient-dev
```

**Fedora/RHEL:**

```bash
sudo dnf install mysql-devel
```

**Arch Linux:**

```bash
sudo pacman -S mariadb-libs
```

### Windows Setup

On Windows, you can install MySQL and add the `lib` directory to your PATH, or set `MYSQLCLIENT_LIB_DIR` to point to the MySQL `lib` directory.

## Running MySQL with Docker

The generated project includes a Docker Compose file for running MySQL.

### Starting the Database

```bash
docker compose -f docker/mysql.yml up -d
```

### Stopping the Database

```bash
docker compose -f docker/mysql.yml down
```

### Viewing Logs

```bash
docker compose -f docker/mysql.yml logs -f
```

### Default Configuration

| Setting  | Value                                |
| -------- | ------------------------------------ |
| Host     | localhost (127.0.0.1)                |
| Port     | 3306                                 |
| Database | `<appname>` (based on your app name) |
| Username | root                                 |
| Password | root (or as configured in .env)      |

The database URL is configured in the `.env` file:

```
DATABASE_URL=mysql://root:root@127.0.0.1:3306/<appname>
```

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

## Running the Server

Once MySQL is running and migrations are applied:

```bash
cd server
cargo run
```

The server will start on `http://localhost:8080`.

## Running Tests

Integration tests require a running MySQL database. The tests will automatically create a separate test database (appending `_test` to the database name).

```bash
# Run all tests (with single thread for database tests)
cargo test -- --test-threads=1

# Run only unit tests (no database required)
cargo test --lib -- --skip integration
```

### Test Database Configuration

By default, tests use `DATABASE_URL` with `_test` appended to the database name. You can override this with:

```bash
export TEST_DATABASE_URL="mysql://root:root@127.0.0.1:3306/myapp_test"
cargo test -- --test-threads=1
```

## Troubleshooting

### Build Error: library 'mysqlclient' not found

```
error: linking with `cc` failed: exit status: 1
ld: library 'mysqlclient' not found
```

**Solution:** Set the `MYSQLCLIENT_LIB_DIR` environment variable as described in the macOS Setup section above.

### Connection Refused

```
Can't connect to MySQL server on '127.0.0.1:3306'
```

**Solution:** Ensure MySQL is running:

```bash
docker compose -f docker/mysql.yml up -d
```

### Authentication Failed

```
Access denied for user 'root'@'localhost'
```

**Solution:** Check your `.env` file and ensure the `DATABASE_URL` matches your MySQL configuration. The default password is `root`.

### Permission Denied Creating Database

If the test utilities fail to create the test database:

```bash
# Connect to MySQL and create it manually
docker exec -it <container_name> mysql -u root -proot
CREATE DATABASE myapp_test;
exit
```

### MySQL 8.0+ Authentication Plugin

If you encounter authentication issues with MySQL 8.0+:

```
Authentication plugin 'caching_sha2_password' cannot be loaded
```

**Solution:** The Docker container should be configured to use `mysql_native_password`. If not, you can alter the user:

```sql
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
```

## Production Considerations

For production deployments:

1. **Use strong passwords**: Update the database password in your production `.env` file
2. **Enable SSL**: Configure SSL connections to MySQL
3. **Connection pooling**: The application uses r2d2 for connection pooling with sensible defaults
4. **Backups**: Set up regular database backups
5. **Monitoring**: Monitor database performance and connection counts
6. **Character Set**: Ensure proper UTF-8 configuration (`utf8mb4`) for international character support
