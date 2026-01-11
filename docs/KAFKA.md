# Apache Kafka Integration

This document describes the Apache Kafka message broker integration in generator-jhipster-rust.

## Overview

The generated Rust application uses [rdkafka](https://github.com/fede1024/rust-rdkafka), a Rust wrapper around the battle-tested librdkafka C library, for Kafka integration. This provides:

## Build Prerequisites

The `rdkafka` crate requires native library dependencies to be installed. Choose one of the following options based on your platform:

### macOS

**Option 1: Build from source (recommended)**

```bash
brew install cmake
```

**Option 2: Use pre-built librdkafka**

```bash
brew install librdkafka
export RDKAFKA_DYNAMIC_LINKING=1
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install cmake librdkafka-dev
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install cmake librdkafka-devel
```

### Windows

**Option 1: Using vcpkg (recommended)**

```powershell
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
.\bootstrap-vcpkg.bat
.\vcpkg install librdkafka:x64-windows
$env:VCPKG_ROOT = "C:\path\to\vcpkg"
$env:RDKAFKA_DYNAMIC_LINKING = "1"
```

**Option 2: Using WSL2**

Run the project inside WSL2 where Linux build instructions apply.

## Features

The Kafka integration provides:

- High-performance message production and consumption
- Full async/await support with Tokio
- Consumer groups with automatic rebalancing
- Message delivery guarantees
- Support for SASL authentication

## Architecture

The Kafka integration consists of three main components:

1. **KafkaProducer** - Publishes messages to Kafka topics
2. **KafkaConsumer** - Consumes messages from Kafka topics
3. **KafkaHandler** - REST API endpoints for Kafka operations

## Enabling Kafka

When running the generator, select "Apache Kafka" when prompted for message broker:

```
? Would you like to use a message broker for asynchronous messaging?
  No message broker
❯ Apache Kafka (high-throughput distributed messaging)
```

Or use the CLI option:

```bash
jhipster-rust --message-broker kafka
```

## Generated Files

When Kafka is enabled, the following files are generated:

| File                                    | Description                           |
| --------------------------------------- | ------------------------------------- |
| `server/src/config/kafka_config.rs`     | Kafka configuration from environment  |
| `server/src/services/kafka_producer.rs` | Async message producer                |
| `server/src/services/kafka_consumer.rs` | Async message consumer with broadcast |
| `server/src/handlers/kafka.rs`          | REST API endpoints                    |
| `docker/kafka.yml`                      | Docker Compose for local Kafka        |
| `docs/KAFKA.md`                         | Project-specific documentation        |

## Configuration

Configure Kafka using environment variables in your `.env` file:

```env
# Enable/disable Kafka
KAFKA_ENABLED=true

# Kafka broker addresses (comma-separated for multiple brokers)
# Use port 29092 for external access (port 9092 is for internal Docker communication)
KAFKA_BOOTSTRAP_SERVERS=localhost:29092

# Consumer group ID
KAFKA_GROUP_ID=myapp-group

# Default topic for publishing/consuming
KAFKA_DEFAULT_TOPIC=myapp-topic

# Consumer configuration
KAFKA_AUTO_OFFSET_RESET=earliest  # or 'latest'
KAFKA_ENABLE_AUTO_COMMIT=true
KAFKA_AUTO_COMMIT_INTERVAL_MS=5000
KAFKA_SESSION_TIMEOUT_MS=10000

# Producer configuration
KAFKA_MESSAGE_TIMEOUT_MS=5000

# Security (for secured clusters)
KAFKA_SECURITY_PROTOCOL=plaintext  # or 'ssl', 'sasl_plaintext', 'sasl_ssl'
# KAFKA_SASL_MECHANISM=PLAIN  # or 'SCRAM-SHA-256', 'SCRAM-SHA-512'
# KAFKA_SASL_USERNAME=your-username
# KAFKA_SASL_PASSWORD=your-password
```

## Running Kafka Locally

### Using Docker Compose

Start Kafka using the generated Docker Compose file:

```bash
docker compose -f docker/kafka.yml up -d
```

This starts:

- **Kafka** - Message broker on port 9092 (KRaft mode, no Zookeeper)
- **Kafka UI** - Web interface on port 9080 for debugging

Access Kafka UI at: http://localhost:9080

### Stop Kafka

```bash
docker compose -f docker/kafka.yml down
```

To remove all data:

```bash
docker compose -f docker/kafka.yml down -v
```

## REST API Endpoints

### Publish a Message

```bash
POST /api/{baseName}-kafka/publish
Content-Type: application/json

{
  "message": "Hello, Kafka!",
  "key": "optional-message-key",
  "topic": "optional-custom-topic"
}
```

**Response:**

```json
{
  "success": true,
  "topic": "myapp-topic"
}
```

### Consume Messages (SSE)

Subscribe to messages using Server-Sent Events:

```bash
GET /api/{baseName}-kafka/consume
```

**Response (SSE stream):**

```
data: {"topic":"myapp-topic","partition":0,"offset":42,"key":"my-key","payload":"Hello, Kafka!","timestamp":1704067200000}

data: {"topic":"myapp-topic","partition":0,"offset":43,"key":null,"payload":"Another message","timestamp":1704067201000}
```

### Get Kafka Status

```bash
GET /api/{baseName}-kafka/status
```

**Response:**

```json
{
  "enabled": true,
  "default_topic": "myapp-topic",
  "group_id": "myapp-group"
}
```

## Programmatic Usage

### Publishing Messages

```rust
use crate::services::KafkaProducer;

// From AppState
if let Some(producer) = &state.kafka_producer {
    // Publish to default topic
    producer.send("message-key", "Hello, Kafka!").await?;

    // Publish without a key (random partition assignment)
    producer.send_without_key("Hello, Kafka!").await?;

    // Publish to a specific topic
    producer.send_to_topic("custom-topic", "key", "payload").await?;
}
```

### Consuming Messages

Messages are automatically consumed in the background and broadcast to all receivers:

```rust
use crate::services::KafkaConsumer;

// From AppState
if let Some(consumer) = &state.kafka_consumer {
    // Get a receiver for messages
    let mut receiver = consumer.get_receiver();

    // Process messages
    while let Ok(message) = receiver.recv().await {
        println!("Received: {} from {}", message.payload, message.topic);
    }
}
```

## Message Format

Messages received from Kafka have the following structure:

```rust
pub struct KafkaMessage {
    pub topic: String,
    pub partition: i32,
    pub offset: i64,
    pub key: Option<String>,
    pub payload: String,
    pub timestamp: Option<i64>,
}
```

## OpenAPI Integration

When OpenAPI documentation is enabled (`enableSwaggerCodegen: true`), Kafka endpoints are automatically documented:

- Swagger UI: `/swagger-ui`
- Scalar UI: `/scalar`
- OpenAPI JSON: `/v3/api-docs`

## Best Practices

### Message Keys

- Use message keys for ordering guarantees within a partition
- Messages with the same key always go to the same partition
- Use `send_without_key()` when ordering doesn't matter

### Consumer Groups

- All instances of your application share the same consumer group
- Kafka automatically balances partitions across consumers
- Use unique group IDs for different applications

### Error Handling

```rust
match producer.send("key", "payload").await {
    Ok(_) => tracing::info!("Message sent"),
    Err(e) => tracing::error!("Failed to send: {}", e),
}
```

### Graceful Shutdown

The application handles graceful shutdown automatically. When the application stops:

- The producer flushes pending messages
- The consumer commits final offsets

## Monitoring

### Logs

Kafka operations are logged at various levels:

- `INFO` - Connection status, initialization
- `DEBUG` - Message send/receive events
- `WARN` - Non-fatal errors, retries
- `ERROR` - Fatal errors

Enable detailed logging:

```env
RUST_LOG=info,rdkafka=debug
```

### Kafka UI

Access the Kafka UI at http://localhost:9080 to:

- View topics and partitions
- Browse messages
- Monitor consumer groups
- Check broker health

## Troubleshooting

### Connection Issues

1. Verify Kafka is running: `docker compose -f docker/kafka.yml ps`
2. Check broker address: `KAFKA_BOOTSTRAP_SERVERS`
3. Test connectivity: `docker compose -f docker/kafka.yml exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092`

### Consumer Not Receiving Messages

1. Check consumer group: Messages may be consumed by another instance
2. Verify topic subscription
3. Check offset reset policy (`KAFKA_AUTO_OFFSET_RESET`)

### Producer Timeouts

1. Increase `KAFKA_MESSAGE_TIMEOUT_MS`
2. Check broker health
3. Verify network connectivity

## Security Considerations

### Production Deployment

For production environments:

1. Use TLS encryption (`KAFKA_SECURITY_PROTOCOL=ssl`)
2. Enable SASL authentication
3. Use strong passwords
4. Restrict network access to Kafka brokers

### Example Secure Configuration

```env
KAFKA_SECURITY_PROTOCOL=sasl_ssl
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=app-user
KAFKA_SASL_PASSWORD=secure-password
```

## Dependencies

The Kafka integration uses:

- `rdkafka` - Kafka client library (wraps librdkafka)
- `tokio-stream` - Async stream utilities
- `futures` - Async utilities

These are automatically included when Kafka is enabled.
