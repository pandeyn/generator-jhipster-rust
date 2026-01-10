# Consul Service Discovery

This guide explains how to use [HashiCorp Consul](https://www.consul.io/) for service discovery and configuration management in microservices architecture with JHipster Rust.

## Overview

Consul provides:

- **Service Registration**: Automatically registers your service with Consul on startup
- **Service Discovery**: Find and connect to other microservices
- **Health Checks**: Regular health checks ensure only healthy instances receive traffic
- **Configuration Management**: Centralized configuration via Consul KV store

## Enabling Consul

When generating a gateway or microservice application, select "Consul" when prompted for service discovery:

```
? Which service discovery would you like to use?
❯ Consul (recommended for service discovery and configuration)
  No service discovery
```

This will generate:

- Consul client code in your Rust server
- Docker Compose files for running Consul locally
- Documentation specific to your application

## Configuration

### Environment Variables

| Variable                       | Description                     | Default                         |
| ------------------------------ | ------------------------------- | ------------------------------- |
| `CONSUL_HOST`                  | Consul server hostname          | `localhost`                     |
| `CONSUL_PORT`                  | Consul server port              | `8500`                          |
| `CONSUL_SERVICE_NAME`          | Name to register in Consul      | App base name                   |
| `CONSUL_SERVICE_ID`            | Unique instance ID              | Auto-generated                  |
| `CONSUL_SERVICE_TAGS`          | Comma-separated tags            | `version=X.X.X,env=development` |
| `CONSUL_REGISTER_SERVICE`      | Enable service registration     | `true`                          |
| `CONSUL_REGISTER_HOST`         | Address to register             | `APP_HOST` value                |
| `CONSUL_HEALTH_CHECK_INTERVAL` | Health check interval (seconds) | `10`                            |
| `CONSUL_ENABLE_CONFIG`         | Enable KV config loading        | `true`                          |
| `CONSUL_ACL_TOKEN`             | ACL token for authentication    | None                            |
| `CONSUL_CONFIG_KEY_PREFIX`     | KV prefix for config            | `config/<appname>`              |

### Example `.env` Configuration

```env
# Consul Service Discovery
CONSUL_HOST=localhost
CONSUL_PORT=8500
CONSUL_SERVICE_NAME=myapp
CONSUL_REGISTER_SERVICE=true
CONSUL_HEALTH_CHECK_INTERVAL=10
```

## Running Consul Locally

### Using Docker Compose

Start Consul with the provided Docker Compose file:

```bash
docker compose -f docker/consul.yml up -d
```

This starts:

- **Consul Agent** in development mode with UI at http://localhost:8500
- **Config Loader** that populates Consul KV with configuration from `docker/central-server-config/`

### Standalone Docker

```bash
docker run -d --name consul \
  -p 8500:8500 \
  hashicorp/consul:1.15 \
  agent -dev -ui -client 0.0.0.0
```

## Service Registration

When the application starts, it automatically:

1. Creates a unique service ID (hostname + random suffix)
2. Registers with Consul using the service name and tags
3. Configures a health check pointing to `/api/health`
4. Deregisters on graceful shutdown (Ctrl+C)

### Registration Payload Example

```json
{
  "ID": "myapp-host1-a1b2c3d4",
  "Name": "myapp",
  "Tags": ["version=0.1.0", "env=development"],
  "Address": "192.168.1.100",
  "Port": 8080,
  "Check": {
    "HTTP": "http://192.168.1.100:8080/api/health",
    "Interval": "10s",
    "Timeout": "5s"
  }
}
```

## Service Discovery

### Discovering Other Services

Use the `ConsulService` to find other microservices:

```rust
use crate::services::ConsulService;

async fn call_other_service(consul: &ConsulService) -> Result<String, ConsulError> {
    // Get URL of a healthy instance
    let url = consul.get_service_url("other-service").await?;

    // Make HTTP request to the discovered service
    let response = reqwest::get(format!("{}/api/data", url))
        .await?
        .text()
        .await?;

    Ok(response)
}
```

### Load Balancing

The `get_service_url` method implements simple random load balancing across healthy instances. For more advanced load balancing:

```rust
// Get all instances for custom load balancing
let instances = consul.discover_service("other-service").await?;

// Implement your own selection logic
for instance in instances {
    println!("Instance: {}:{}", instance.address, instance.port);
    println!("Tags: {:?}", instance.tags);
}
```

## Configuration Management

### Reading Configuration from Consul KV

```rust
// Read a specific configuration key
if let Some(value) = consul.get_config("database/url").await? {
    println!("Database URL: {}", value);
}
```

### Writing Configuration

```rust
// Store configuration in Consul KV
consul.set_config("feature_flags/new_feature", "true").await?;
```

### Central Server Configuration

The `docker/central-server-config/application.yml` file is automatically loaded into Consul KV by the config loader. This provides centralized configuration for all microservices.

## Health Checks

Consul polls the `/api/health` endpoint to verify service health. The service is automatically removed from discovery if:

- Health check fails for 30 seconds (configurable via `deregister_critical_service_after`)
- The service stops responding

## Production Considerations

### High Availability

In production, run a Consul cluster with 3-5 server nodes:

```yaml
# Kubernetes StatefulSet or multiple Docker containers
consul:
  replicas: 3
  config:
    bootstrap_expect: 3
    retry_join: ['consul-0', 'consul-1', 'consul-2']
```

### Security

1. **Enable ACLs**: Configure ACL tokens for authentication
2. **TLS**: Enable TLS for agent communication
3. **Network Isolation**: Restrict Consul ports to internal network

```env
CONSUL_ACL_TOKEN=your-secret-acl-token
```

### Kubernetes Integration

When running in Kubernetes, consider:

- Using Consul Connect for service mesh
- Configuring pod annotations for automatic service registration
- Using Consul's built-in Kubernetes integration

## Troubleshooting

### Service Not Registering

1. Check Consul is running: `curl http://localhost:8500/v1/status/leader`
2. Verify network connectivity to Consul
3. Check logs for registration errors
4. Verify `CONSUL_REGISTER_SERVICE=true`

### Service Not Discovered

1. Verify the service is registered: `curl http://localhost:8500/v1/catalog/service/<servicename>`
2. Check health check status: `curl http://localhost:8500/v1/health/service/<servicename>`
3. Ensure health endpoint `/api/health` is accessible

### Configuration Not Loading

1. Verify Consul KV has the data: `curl http://localhost:8500/v1/kv/config/<appname>?recurse`
2. Check `CONSUL_ENABLE_CONFIG=true`
3. Verify config key prefix matches

## API Reference

### ConsulService Methods

| Method                         | Description                        |
| ------------------------------ | ---------------------------------- |
| `new(config)`                  | Create new Consul service instance |
| `register_service(host, port)` | Register with Consul               |
| `deregister_service()`         | Remove from Consul                 |
| `discover_service(name)`       | Find service instances             |
| `get_service_url(name)`        | Get URL of a healthy instance      |
| `get_config(key)`              | Read from KV store                 |
| `set_config(key, value)`       | Write to KV store                  |

## Resources

- [Consul Documentation](https://www.consul.io/docs)
- [Consul API Reference](https://www.consul.io/api-docs)
- [JHipster Microservices](https://www.jhipster.tech/microservices-architecture/)
