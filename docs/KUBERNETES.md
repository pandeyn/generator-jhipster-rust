# Kubernetes Deployment Guide

This guide covers deploying JHipster Rust applications to Kubernetes using the generated manifests.

## Overview

The Kubernetes sub-generator creates plain YAML manifests for deploying your application and its dependencies to any Kubernetes cluster. It supports all database types, authentication methods, and infrastructure services configured in your JHipster application.

## Generating Kubernetes Manifests

```bash
# Generate K8s manifests for an existing application
jhipster-rust kubernetes
```

### Configuration Prompts

| Prompt               | Options                                | Default       |
| -------------------- | -------------------------------------- | ------------- |
| Kubernetes namespace | Any valid namespace                    | `default`     |
| Service type         | ClusterIP, NodePort, LoadBalancer      | `ClusterIP`   |
| Ingress controller   | None, NGINX, Traefik                   | `None`        |
| Ingress domain       | Any domain                             | `example.com` |
| Docker registry URL  | Registry path (e.g., `docker.io/user`) | (none)        |
| Replicas             | Number of app pods                     | `1`           |

## Generated Manifests

### Core Manifests (Always Generated)

| File                     | Description                                 |
| ------------------------ | ------------------------------------------- |
| `k8s/namespace.yml`      | Namespace (if not `default`)                |
| `k8s/app-deployment.yml` | Application Deployment with health probes   |
| `k8s/app-service.yml`    | Service (ClusterIP/NodePort/LoadBalancer)   |
| `k8s/app-configmap.yml`  | Environment configuration                   |
| `k8s/app-secret.yml`     | Sensitive values (JWT secret, DB passwords) |
| `k8s/kubectl-apply.sh`   | Deployment helper script                    |
| `k8s/README-k8s.md`      | Quick start guide                           |

### Database Manifests (Conditional)

| File                             | Condition           |
| -------------------------------- | ------------------- |
| `k8s/postgresql-statefulset.yml` | PostgreSQL selected |
| `k8s/mysql-statefulset.yml`      | MySQL selected      |
| `k8s/mongodb-statefulset.yml`    | MongoDB selected    |
| (PVC in app-deployment.yml)      | SQLite selected     |

All database manifests use **StatefulSets** with PersistentVolumeClaims for data persistence.

### Infrastructure Manifests (Conditional)

| File                          | Condition                                |
| ----------------------------- | ---------------------------------------- |
| `k8s/app-ingress.yml`         | Ingress enabled (NGINX or Traefik)       |
| `k8s/keycloak-deployment.yml` | OAuth2/OIDC authentication               |
| `k8s/consul-statefulset.yml`  | Consul service discovery (microservices) |
| `k8s/kafka-statefulset.yml`   | Kafka message broker                     |
| `k8s/monitoring.yml`          | Prometheus monitoring                    |

## Deployment

### Quick Deploy

```bash
# Build the Docker image
docker build -t myapp:latest .

# Deploy everything in correct order
./k8s/kubectl-apply.sh apply
```

### Manual Deploy

```bash
# 1. Create namespace (if not default)
kubectl apply -f k8s/namespace.yml

# 2. Apply secrets and config
kubectl apply -f k8s/app-secret.yml
kubectl apply -f k8s/app-configmap.yml

# 3. Deploy database (if applicable)
kubectl apply -f k8s/postgresql-statefulset.yml

# 4. Deploy application
kubectl apply -f k8s/app-deployment.yml
kubectl apply -f k8s/app-service.yml

# 5. Apply ingress (if configured)
kubectl apply -f k8s/app-ingress.yml
```

### Access the Application

```bash
# Port forwarding
kubectl port-forward svc/myapp 8080:8080

# Or if using NodePort
# Access at http://<node-ip>:30080

# Or if using Ingress
# Access at http://myapp.example.com
```

## Health Probes

The generated deployment includes Kubernetes health probes that map to the application's health endpoints:

| Probe     | Endpoint                | Purpose                          |
| --------- | ----------------------- | -------------------------------- |
| Liveness  | `/api/health/liveness`  | Restart unhealthy pods           |
| Readiness | `/api/health/readiness` | Route traffic only to ready pods |

## Resource Limits

Default resource configuration for the application pod:

```yaml
resources:
  requests:
    memory: '128Mi'
    cpu: '100m'
  limits:
    memory: '512Mi'
    cpu: '500m'
```

Adjust these values in `k8s/app-deployment.yml` based on your workload.

## Production Considerations

### Secrets Management

The generated `app-secret.yml` uses `stringData` with placeholder values. For production:

1. Replace placeholder values with real secrets
2. Consider using [Sealed Secrets](https://sealed-secrets.netlify.app/) or [External Secrets Operator](https://external-secrets.io/)
3. Never commit production secrets to version control

### Database

The generated StatefulSets are suitable for development. For production databases:

- Use managed database services (RDS, Cloud SQL, Atlas) when possible
- If self-hosted, configure proper backup strategies
- Tune resource limits based on workload

### Scaling

```bash
# Scale application replicas
kubectl scale deployment/myapp --replicas=3

# Note: SQLite does not support multiple replicas writing concurrently.
# Use PostgreSQL or MySQL for multi-replica deployments.
```

### TLS

To enable HTTPS via Ingress:

1. Install [cert-manager](https://cert-manager.io/) for automatic certificates
2. Uncomment the `tls` section in `k8s/app-ingress.yml`
3. Create or reference a TLS secret

## Tear Down

```bash
# Remove all resources
./k8s/kubectl-apply.sh delete
```
