# Prometheus Monitoring

JHipster Rust applications include optional Prometheus metrics support for monitoring application performance and health.

## Overview

When Prometheus monitoring is enabled, the application exposes metrics at `/management/prometheus` in the standard Prometheus text format. These metrics are automatically collected by the `axum-prometheus` middleware.

## Enabling Prometheus

During project generation, select "Prometheus" when prompted for monitoring:

```
? Would you like to enable *monitoring* for your application?
  No monitoring
> Prometheus (metrics collection with Grafana dashboards)
```

Or specify it in your `.yo-rc.json`:

```json
{
  "generator-jhipster": {
    "monitoring": "prometheus"
  }
}
```

## Available Metrics

### HTTP Request Metrics

| Metric                                     | Type      | Description                                                            |
| ------------------------------------------ | --------- | ---------------------------------------------------------------------- |
| `axum_axum_http_requests_total`            | Counter   | Total number of HTTP requests, labeled by endpoint, method, and status |
| `axum_axum_http_requests_duration_seconds` | Histogram | HTTP request duration distribution                                     |
| `axum_axum_http_requests_pending`          | Gauge     | Number of currently in-flight requests                                 |

### Labels

All HTTP metrics include the following labels:

- `endpoint`: Request path (normalized)
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `status`: HTTP status code

## Configuration

### Environment Variables

| Variable          | Description                       | Default                  |
| ----------------- | --------------------------------- | ------------------------ |
| `METRICS_ENABLED` | Enable/disable metrics collection | `true`                   |
| `METRICS_PATH`    | Path for metrics endpoint         | `/management/prometheus` |

### Example Configuration

```bash
# Enable metrics (default)
METRICS_ENABLED=true

# Disable metrics for production if not needed
METRICS_ENABLED=false
```

## Running the Monitoring Stack

### Using Docker Compose

The project includes a complete monitoring stack with Prometheus and Grafana:

```bash
# Start the monitoring stack
docker-compose -f docker/monitoring.yml up -d

# View logs
docker-compose -f docker/monitoring.yml logs -f

# Stop the stack
docker-compose -f docker/monitoring.yml down
```

### Accessing the Services

| Service    | URL                   | Credentials   |
| ---------- | --------------------- | ------------- |
| Prometheus | http://localhost:9090 | None          |
| Grafana    | http://localhost:3000 | admin / admin |

## Grafana Dashboards

A pre-configured dashboard is automatically provisioned in Grafana with the following panels:

1. **Request Rate by Method** - Shows requests per second grouped by HTTP method
2. **Request Latency Percentiles** - p50, p95, and p99 latency metrics
3. **Request Rate by Status Code** - Identifies error rates and success rates
4. **Application Status** - Shows if the application is up or down
5. **Total Requests** - Cumulative request count
6. **In-Flight Requests** - Current number of active requests

## Prometheus Queries

### Useful PromQL Queries

```promql
# Request rate per second (last 5 minutes)
rate(axum_axum_http_requests_total{job="your-app-name"}[5m])

# Error rate (5xx responses)
sum(rate(axum_axum_http_requests_total{job="your-app-name", status=~"5.."}[5m]))
/
sum(rate(axum_axum_http_requests_total{job="your-app-name"}[5m]))

# 95th percentile latency
histogram_quantile(0.95, sum(rate(axum_axum_http_requests_duration_seconds_bucket{job="your-app-name"}[5m])) by (le))

# Average request duration by endpoint
sum(rate(axum_axum_http_requests_duration_seconds_sum{job="your-app-name"}[5m])) by (endpoint)
/
sum(rate(axum_axum_http_requests_duration_seconds_count{job="your-app-name"}[5m])) by (endpoint)
```

## Alert Rules

The monitoring stack includes pre-configured alert rules:

### ApplicationDown

Triggers when the application has been unreachable for more than 1 minute.

### HighRequestLatency

Triggers when the 95th percentile latency exceeds 1 second for more than 5 minutes.

### HighErrorRate

Triggers when more than 5% of requests return 5xx errors over a 5-minute window.

## Integration with External Prometheus

If you're using an external Prometheus server, add the following scrape configuration:

```yaml
scrape_configs:
  - job_name: 'your-app-name'
    metrics_path: '/management/prometheus'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-app-host:8080']
```

## Security Considerations

The `/management/prometheus` endpoint is exposed without authentication to allow Prometheus to scrape metrics. In production:

1. Use network-level security (firewall rules, VPC) to restrict access
2. Consider using a reverse proxy to add authentication
3. Use Prometheus service discovery with proper authentication

## Rust Libraries Used

| Library                       | Version | Purpose                                    |
| ----------------------------- | ------- | ------------------------------------------ |
| `axum-prometheus`             | 0.7     | Axum middleware for automatic HTTP metrics |
| `metrics`                     | 0.24    | Metrics facade for Rust                    |
| `metrics-exporter-prometheus` | 0.16    | Prometheus exporter backend                |

## Troubleshooting

### Metrics Not Available

1. Check if the application is running and healthy:

   ```bash
   curl http://localhost:8080/api/health
   ```

2. Verify metrics endpoint is accessible:

   ```bash
   curl http://localhost:8080/management/prometheus
   ```

3. Check application logs for metrics initialization:
   ```bash
   # Should see: "Prometheus metrics enabled at /management/prometheus"
   ```

### Prometheus Not Scraping

1. Verify Prometheus target status at http://localhost:9090/targets
2. Check Prometheus configuration in `docker/prometheus-conf/prometheus.yml`
3. Ensure the application is reachable from the Prometheus container

### Grafana Dashboard Not Loading

1. Verify Prometheus datasource is configured correctly
2. Check Grafana logs: `docker-compose -f docker/monitoring.yml logs grafana`
3. Manually import the dashboard from `docker/grafana/provisioning/dashboards/`

## Architecture

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     Docker Compose                          │
                    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
                    │  │  Rust App   │───▶│  Prometheus │───▶│     Grafana     │ │
                    │  │  :8080      │    │    :9090    │    │     :3000       │ │
                    │  │             │    │             │    │                 │ │
                    │  │ /management │    │  scrapes    │    │  visualizes     │ │
                    │  │ /prometheus │    │  every 15s  │    │  dashboards     │ │
                    │  └─────────────┘    └─────────────┘    └─────────────────┘ │
                    └─────────────────────────────────────────────────────────────┘
```
