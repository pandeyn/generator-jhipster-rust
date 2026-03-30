# Distributed Tracing

JHipster Rust applications include optional distributed tracing support using OpenTelemetry for microservices and gateway applications.

> **Note:** Distributed tracing is only available for microservice and gateway application types. Monolith applications do not include this feature.

## Overview

The application exports trace spans to either **Zipkin** (via the Zipkin HTTP API) or **Jaeger** (via the OpenTelemetry Protocol over gRPC). All requests are automatically instrumented through the `tracing` and `tracing-opentelemetry` integration.

Distributed tracing allows you to:

- Track requests as they flow across multiple services
- Identify latency bottlenecks in your microservices architecture
- Visualize service dependencies and call graphs
- Debug issues by examining individual trace spans

## Enabling Distributed Tracing

During project generation, select a tracing backend when prompted:

```
? Would you like to enable distributed tracing for your application?
  No distributed tracing
> Zipkin (lightweight distributed tracing)
  Jaeger (full-featured distributed tracing with Jaeger UI)
```

This prompt only appears for microservice and gateway application types.

## Configuration

### Environment Variables

| Variable               | Description                        | Default                                                                       |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `TRACING_ENABLED`      | Enable/disable distributed tracing | `true`                                                                        |
| `TRACING_SERVICE_NAME` | Service name reported in traces    | `<baseName>`                                                                  |
| `TRACING_ENDPOINT`     | Tracing backend endpoint           | Zipkin: `http://localhost:9411/api/v2/spans`, Jaeger: `http://localhost:4317` |
| `TRACING_SAMPLE_RATIO` | Sampling ratio (0.0 to 1.0)        | `1.0`                                                                         |

### Example Configuration

```bash
# Enable tracing (default)
TRACING_ENABLED=true
TRACING_SERVICE_NAME=myApp

# Zipkin endpoint
TRACING_ENDPOINT=http://localhost:9411/api/v2/spans

# Or Jaeger OTLP endpoint
TRACING_ENDPOINT=http://localhost:4317

# Sample 50% of traces in production
TRACING_SAMPLE_RATIO=0.5

# Disable tracing
TRACING_ENABLED=false
```

## Running the Tracing Backend

### Using Docker Compose

The generated project includes a Docker Compose file for the tracing backend:

```bash
# Start the tracing backend
docker compose -f docker/tracing.yml up -d

# View logs
docker compose -f docker/tracing.yml logs -f

# Stop the tracing backend
docker compose -f docker/tracing.yml down
```

### Accessing the UI

| Backend | URL                    | Description            |
| ------- | ---------------------- | ---------------------- |
| Zipkin  | http://localhost:9411  | Search and view traces |
| Jaeger  | http://localhost:16686 | Search and view traces |

## Kubernetes Deployment

### Raw Manifests

The Kubernetes manifests automatically deploy the tracing backend:

```bash
# Apply all manifests (includes tracing)
./k8s/kubectl-apply.sh apply
```

### Helm Charts

The Helm chart includes the tracing backend as a configurable component:

```bash
# Install with tracing enabled (default when generated)
helm install myapp ./helm/myapp

# Disable Zipkin
helm install myapp ./helm/myapp --set zipkin.enabled=false

# Disable Jaeger
helm install myapp ./helm/myapp --set jaeger.enabled=false
```

## Integration with Prometheus

When both Prometheus monitoring and distributed tracing are enabled, you get a complete observability stack:

- **Prometheus** collects metrics (request counts, latencies, error rates)
- **Distributed tracing** provides detailed per-request traces across services
- **Grafana** visualizes metrics dashboards

Use trace IDs in your logs to correlate metrics with specific traces.

## Sampling Strategy

The `TRACING_SAMPLE_RATIO` controls what percentage of traces are exported:

| Value  | Behavior               | Use Case                      |
| ------ | ---------------------- | ----------------------------- |
| `1.0`  | All traces exported    | Development, debugging        |
| `0.1`  | 10% of traces exported | Production (moderate traffic) |
| `0.01` | 1% of traces exported  | Production (high traffic)     |
| `0.0`  | No traces exported     | Effectively disables tracing  |

For production, start with `0.1` and adjust based on your traffic volume and storage capacity.

## Tracing Backend Comparison

| Feature      | Zipkin                                               | Jaeger                                               |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| Protocol     | Zipkin HTTP API                                      | OTLP gRPC                                            |
| UI           | Zipkin UI (port 9411)                                | Jaeger UI (port 16686)                               |
| Complexity   | Lightweight, single container                        | Full-featured, more options                          |
| Storage      | In-memory (default), Elasticsearch, Cassandra, MySQL | In-memory (default), Elasticsearch, Cassandra, Kafka |
| Best for     | Simple setups, low overhead                          | Production environments, advanced querying           |
| Docker image | `openzipkin/zipkin:3`                                | `jaegertracing/all-in-one:latest`                    |

## Rust Libraries Used

| Library                 | Version | Purpose                                          |
| ----------------------- | ------- | ------------------------------------------------ |
| `opentelemetry`         | 0.27    | OpenTelemetry API                                |
| `opentelemetry_sdk`     | 0.27    | OpenTelemetry SDK with Tokio runtime             |
| `tracing-opentelemetry` | 0.28    | Bridge between `tracing` crate and OpenTelemetry |
| `opentelemetry-zipkin`  | 0.27    | Zipkin span exporter (Zipkin backend)            |
| `opentelemetry-otlp`    | 0.27    | OTLP span exporter (Jaeger backend)              |

## Troubleshooting

### Traces Not Appearing

1. Verify the tracing backend is running:

   ```bash
   # For Zipkin
   curl http://localhost:9411/health

   # For Jaeger
   curl http://localhost:16686/
   ```

2. Check application logs for tracing initialization errors

3. Verify the `TRACING_ENDPOINT` is correct and reachable from your application

4. Ensure `TRACING_ENABLED` is set to `true`

5. Check that `TRACING_SAMPLE_RATIO` is greater than `0.0`

### High Memory Usage

If the tracing backend uses too much memory:

1. Reduce the sample ratio: `TRACING_SAMPLE_RATIO=0.1`
2. Configure persistent storage instead of in-memory (Elasticsearch, Cassandra)
3. Set retention policies to limit trace data retention
