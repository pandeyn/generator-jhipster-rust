# MongoDB Integration

This document covers setting up and running MongoDB with the JHipster Rust generator.

## Prerequisites

### No Native Library Required

Unlike PostgreSQL or MySQL, MongoDB does not require installing any native client libraries. The official MongoDB Rust driver uses pure Rust implementations for networking and BSON serialization.

Simply ensure you have:

- Rust 1.70+ installed
- Docker (for running MongoDB container)
- MongoDB 5.0+ (if running standalone)

## Running MongoDB with Docker

The generated project includes a Docker Compose file for running MongoDB as a replica set.

### Why Replica Set?

MongoDB transactions (required for multi-document operations) need a replica set. The generator configures a single-node replica set for development, which provides:

- Transaction support for relationship sync operations
- Change streams capability
- Production-like behavior in development

### Starting the Database

```bash
docker compose up -d
```

The healthcheck automatically initializes the replica set. An init container runs after MongoDB is healthy to set up the database schema, indexes, and default users.

### Stopping the Database

```bash
docker compose down
```

To completely reset the database (including all data):

```bash
docker compose down -v
docker compose up -d
```

### Viewing Logs

```bash
docker compose logs -f
```

### Default Configuration

| Setting  | Value                                |
| -------- | ------------------------------------ |
| Host     | localhost                            |
| Port     | 27017                                |
| Database | `<appname>` (based on your app name) |

The development setup uses MongoDB without authentication for simplicity. The MongoDB connection is configured in the `.env` file:

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=<appname>
```

For production, you should enable authentication and use a connection string like:

```
MONGODB_URI=mongodb://user:password@host:27017/?authSource=admin
```

## Entity Generation

### Field Type Mappings

The generator maps JDL field types to MongoDB-compatible Rust and BSON types:

| JDL Type      | Rust Type           | BSON Type | Notes                         |
| ------------- | ------------------- | --------- | ----------------------------- |
| Boolean       | `bool`              | `bool`    |                               |
| Integer       | `i32`               | `int`     |                               |
| Long          | `i64`               | `long`    |                               |
| Float         | `f64`               | `double`  | MongoDB uses 64-bit floats    |
| Double        | `f64`               | `double`  |                               |
| BigDecimal    | `f64`               | `double`  | Consider string for precision |
| String        | `String`            | `string`  |                               |
| UUID          | `String`            | `string`  | Stored as hex string          |
| LocalDate     | `chrono::NaiveDate` | `date`    |                               |
| Instant       | `bson::DateTime`    | `date`    |                               |
| ZonedDateTime | `bson::DateTime`    | `date`    |                               |
| Duration      | `i64`               | `long`    | Stored as milliseconds        |
| TextBlob      | `String`            | `string`  |                               |
| Blob          | `bson::Binary`      | `binData` |                               |
| AnyBlob       | `bson::Binary`      | `binData` |                               |
| ImageBlob     | `bson::Binary`      | `binData` |                               |

### ObjectId as Primary Key

MongoDB uses `ObjectId` as the native primary identifier instead of auto-incrementing integers:

```rust
use bson::oid::ObjectId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub price: f64,
    // ... other fields
}
```

In API responses, ObjectIds are serialized as hex strings:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Widget",
  "price": 29.99
}
```

### Example JDL with Field Types

```jdl
application {
  config {
    baseName myapp
    applicationType monolith
    databaseType mongodb
    devDatabaseType mongodb
    prodDatabaseType mongodb
    authenticationType jwt
    buildTool cargo
  }
  entities *
}

entity Product {
  name String required minlength(1) maxlength(100)
  description TextBlob
  price Double required min(0)
  quantity Integer min(0)
  available Boolean
  createdAt Instant
  sku String unique
}
```

## Relationships

MongoDB supports relationships differently than SQL databases. The generator provides two strategies:

### ManyToOne / OneToOne (Reference by ObjectId)

Relationships are stored as ObjectId references in the owning document:

```jdl
entity Post {
  title String required
  content TextBlob required
}

entity Blog {
  name String required
}

relationship ManyToOne {
  Post{blog(name)} to Blog
}
```

**Generated Model:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Post {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blog_id: Option<ObjectId>,
    // ... audit fields
}
```

**Service Methods:**

```rust
impl PostService {
    // Find post with optional blog population
    pub async fn find_by_id(db: &MongoPool, id: ObjectId) -> Result<Post, AppError>;

    // Find related blog
    pub async fn find_blog_by_id(db: &MongoPool, id: ObjectId) -> Result<Option<Blog>, AppError>;
}
```

### OneToMany (Embedded Documents)

For tightly coupled parent-child relationships, you can use embedded documents. This option stores child documents directly in the parent document:

```jdl
entity Order {
  orderNumber String required unique
  totalAmount Double
}

entity OrderItem {
  productName String required
  quantity Integer required min(1)
  price Double required
}

relationship OneToMany {
  Order{items} to OrderItem{order}
}
```

**Embedded Document Model:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub order_number: String,
    pub total_amount: Option<f64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub items: Vec<EmbeddedOrderItem>,
    // ... audit fields
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddedOrderItem {
    pub id: String,  // UUID for local identification
    pub product_name: String,
    pub quantity: i32,
    pub price: f64,
}
```

**Service Methods for Embedded Documents:**

```rust
impl OrderService {
    // Add an item to the order
    pub async fn add_item(
        db: &MongoPool,
        order_id: ObjectId,
        item: EmbeddedOrderItem,
    ) -> Result<Order, AppError>;

    // Remove an item from the order
    pub async fn remove_item(
        db: &MongoPool,
        order_id: ObjectId,
        item_id: &str,
    ) -> Result<Order, AppError>;

    // Update an item in the order
    pub async fn update_item(
        db: &MongoPool,
        order_id: ObjectId,
        item_id: &str,
        update: UpdateEmbeddedOrderItem,
    ) -> Result<Order, AppError>;
}
```

**When to Use Embedded Documents:**

| Use Embedded                         | Use References                     |
| ------------------------------------ | ---------------------------------- |
| Children always accessed with parent | Children queried independently     |
| Small number of children (<100)      | Large/unbounded number of children |
| Children rarely updated individually | Frequent individual child updates  |
| Strong containment relationship      | Loose coupling between entities    |

### ManyToMany (Link Collection)

ManyToMany relationships use a separate linking collection:

```jdl
entity Post {
  title String required
}

entity Tag {
  name String required unique
}

relationship ManyToMany {
  Post{tag(name)} to Tag{post}
}
```

**Link Collection Model:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostTagLink {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub post_id: ObjectId,
    pub tag_id: ObjectId,
}
```

**Service Methods:**

```rust
impl PostService {
    // Add a tag to a post
    pub async fn add_tag(
        db: &MongoPool,
        post_id: ObjectId,
        tag_id: ObjectId,
    ) -> Result<(), AppError>;

    // Remove a tag from a post
    pub async fn remove_tag(
        db: &MongoPool,
        post_id: ObjectId,
        tag_id: ObjectId,
    ) -> Result<(), AppError>;

    // Get all tags for a post
    pub async fn get_tags(db: &MongoPool, post_id: ObjectId) -> Result<Vec<Tag>, AppError>;

    // Sync tags (replace all)
    pub async fn sync_tags(
        db: &MongoPool,
        post_id: ObjectId,
        tag_ids: Vec<ObjectId>,
    ) -> Result<(), AppError>;
}
```

## Audit Fields

Every entity automatically includes audit fields:

| Field                | Rust Type                | BSON Type | Description                     |
| -------------------- | ------------------------ | --------- | ------------------------------- |
| `created_by`         | `Option<String>`         | `string`  | Username who created the entity |
| `created_date`       | `Option<bson::DateTime>` | `date`    | Creation timestamp              |
| `last_modified_by`   | `Option<String>`         | `string`  | Username who last modified      |
| `last_modified_date` | `Option<bson::DateTime>` | `date`    | Last modification timestamp     |

These fields are automatically populated by the service layer based on the authenticated user:

```rust
pub async fn create(
    db: &MongoPool,
    dto: CreateProductDto,
    created_by: &str,
) -> Result<Product, AppError> {
    let now = bson::DateTime::now();

    let product = Product {
        id: None,
        name: dto.name,
        price: dto.price,
        created_by: Some(created_by.to_string()),
        created_date: Some(now),
        last_modified_by: Some(created_by.to_string()),
        last_modified_date: Some(now),
    };

    // ... insert logic
}
```

## Running the Server

Once MongoDB is running:

```bash
cd server
cargo run
```

The server will start on `http://localhost:8080`.

## Running Tests

Integration tests require a running MongoDB instance. The tests automatically use a separate test database (appending `_test` to the database name).

```bash
# Run all tests
cargo test

# Run only unit tests (no database required)
cargo test --lib -- --skip integration
```

### Test Database Configuration

By default, tests use the same MongoDB URI with `_test` appended to the database name. You can override with:

```bash
export TEST_MONGODB_URI="mongodb://root:secret@localhost:27017"
export TEST_MONGODB_DATABASE="myapp_test"
cargo test
```

## Indexing

The generator creates appropriate indexes for:

1. **Unique fields**: Unique index for fields with `unique` validation
2. **Foreign key references**: Index on `*_id` fields for relationship queries
3. **Link collection**: Compound unique index on both reference fields

Example initialization script (`scripts/mongodb_init.js`):

```javascript
// Create unique index for email
db.users.createIndex({ email: 1 }, { unique: true });

// Create index for blog_id foreign key
db.posts.createIndex({ blog_id: 1 });

// Create compound unique index for many-to-many
db.rel_post__tag.createIndex({ post_id: 1, tag_id: 1 }, { unique: true });
```

## Connection Pooling

The MongoDB Rust driver handles connection pooling internally. The application uses `Arc<Database>` as the pool type:

```rust
pub type MongoPool = Arc<Database>;

pub async fn create_pool(
    database_url: &str,
    database_name: &str,
) -> Result<MongoPool, mongodb::error::Error> {
    let client_options = ClientOptions::parse(database_url).await?;
    let client = Client::with_options(client_options)?;
    let database = client.database(database_name);

    // Verify connection
    database.run_command(doc! { "ping": 1 }).await?;

    Ok(Arc::new(database))
}
```

## MongoDB Atlas Support

The driver supports MongoDB Atlas connection strings (`mongodb+srv://`):

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DATABASE=myapp
```

No code changes are required; the driver auto-detects the SRV format.

## Troubleshooting

### Connection Refused

```
Error: ServerSelectionError: No available servers
```

**Solution:** Ensure MongoDB is running:

```bash
docker compose up -d
docker compose logs mongodb
```

### Replica Set Not Initialized

```
Error: NotPrimaryNoSecondaryOk
```

**Solution:** Initialize the replica set:

```bash
docker exec -it <appname>-mongodb mongosh --eval "rs.initiate()"
```

### Authentication Failed

```
Error: Authentication failed
```

**Solution:** Verify credentials in `.env` match the Docker configuration:

```env
MONGODB_URI=mongodb://root:secret@localhost:27017
```

### ObjectId Parse Error

```
Error: Invalid ID format
```

**Solution:** Ensure the ID is a valid 24-character hex string:

```bash
# Valid
curl http://localhost:8080/api/products/507f1f77bcf86cd799439011

# Invalid
curl http://localhost:8080/api/products/123
```

### Transaction Errors

```
Error: Transaction numbers are only allowed on a replica set member
```

**Solution:** Ensure you're connected to a replica set, not a standalone MongoDB:

```bash
docker exec -it <appname>-mongodb mongosh --eval "rs.status()"
```

## Production Considerations

1. **Use MongoDB Atlas or proper replica set**: Never use standalone MongoDB in production
2. **Enable authentication**: Always use strong credentials
3. **Use TLS**: Enable TLS for connections in production
4. **Backup strategy**: Set up regular backups using mongodump or Atlas backup
5. **Connection string secrets**: Use environment variables, never hardcode credentials
6. **Index optimization**: Monitor slow queries and add indexes as needed

### Production Connection String

```env
MONGODB_URI=mongodb+srv://produser:strongpassword@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=myapp_prod
```

## Dependencies

The generator adds these MongoDB-related dependencies to `Cargo.toml`:

```toml
[dependencies]
mongodb = "3.1"
bson = { version = "2", features = ["chrono-0_4"] }
futures = "0.3"
```
