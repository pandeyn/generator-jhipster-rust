# Kubernetes Deployment Guide

This guide covers deploying JHipster Rust applications to Kubernetes. Two deployment approaches are available:

- **Helm Charts** (recommended) -- Parameterized deployments with values overrides, upgrades, and rollback
- **Raw K8s Manifests** -- Plain YAML manifests for simple or custom deployments

## Helm Chart Deployment

Helm is the recommended approach for Kubernetes deployments. It provides parameterized charts, release tracking, easy upgrades, and rollback support.

### Generating Helm Charts

```bash
jhipster-rust kubernetes:helm
```

### Configuration Prompts

| Prompt               | Options                                    | Default       |
| -------------------- | ------------------------------------------ | ------------- |
| Kubernetes namespace | Any valid namespace                        | `default`     |
| Service type         | ClusterIP, NodePort, LoadBalancer, Ingress | `ClusterIP`   |
| Ingress controller   | NGINX, Traefik (when Ingress selected)     | `nginx`       |
| Ingress domain       | Any domain                                 | `example.com` |
| Docker registry URL  | Registry path (e.g., `docker.io/user`)     | (none)        |
| Chart version        | SemVer version for the chart               | `0.1.0`       |
| Enable HPA           | Yes/No                                     | `No`          |

### Generated Chart Structure

```
helm/
  <appname>/
    Chart.yaml              # Chart metadata (name, version, description)
    values.yaml             # Configurable default values
    .helmignore             # Files to exclude from chart packaging
    templates/
      _helpers.tpl          # Reusable template helpers (labels, names)
      NOTES.txt             # Post-install instructions shown by Helm
      deployment.yaml       # Application Deployment
      service.yaml          # Application Service
      configmap.yaml        # Environment configuration
      secret.yaml           # Sensitive values (JWT secret, DB passwords)
      ingress.yaml          # Ingress (conditional)
      hpa.yaml              # Horizontal Pod Autoscaler (conditional)
      namespace.yaml        # Namespace (if not default)
      postgresql-statefulset.yaml   # PostgreSQL (conditional)
      mysql-statefulset.yaml        # MySQL (conditional)
      mongodb-statefulset.yaml      # MongoDB (conditional)
      consul-statefulset.yaml       # Consul (conditional)
      kafka-statefulset.yaml        # Kafka + Zookeeper (conditional)
      keycloak-deployment.yaml      # Keycloak (conditional)
      monitoring.yaml               # Prometheus + Grafana (conditional)
  helm-apply.sh             # Deployment helper script
  README-helm.md            # Quick start guide
```

### Quick Deploy

```bash
# Build the Docker image
docker build -t myapp:latest .

# Install the Helm chart (handles image loading for local clusters)
./helm/helm-apply.sh install
```

### Manual Helm Commands

```bash
# Install
helm install myapp ./helm/myapp --namespace default

# Install with custom values
helm install myapp ./helm/myapp -f custom-values.yaml

# Upgrade after changes
helm upgrade myapp ./helm/myapp

# Dry-run (render templates without deploying)
helm template myapp ./helm/myapp

# Check release status
helm status myapp

# Rollback to previous revision
helm rollback myapp 1
```

### Customizing Values

Override defaults by creating a `custom-values.yaml`:

```yaml
replicaCount: 3

image:
  repository: my-registry.io/myapp
  tag: v1.0.0

resources:
  limits:
    memory: '1Gi'
    cpu: '1'

ingress:
  enabled: true
  className: nginx
  host: myapp.mydomain.com

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 70
```

Then install with:

```bash
helm install myapp ./helm/myapp -f custom-values.yaml
```

### Key Values Reference

| Value                       | Description                       | Default                 |
| --------------------------- | --------------------------------- | ----------------------- |
| `replicaCount`              | Number of application pods        | `1`                     |
| `image.repository`          | Docker image name                 | `<appname>`             |
| `image.tag`                 | Docker image tag                  | `latest`                |
| `image.pullPolicy`          | Image pull policy                 | `IfNotPresent`          |
| `service.type`              | Kubernetes service type           | `ClusterIP`             |
| `service.port`              | Service port                      | `8080`                  |
| `ingress.enabled`           | Enable Ingress                    | `false`                 |
| `ingress.className`         | Ingress class                     | `nginx`                 |
| `ingress.host`              | Ingress hostname                  | `<appname>.example.com` |
| `resources.requests.memory` | Memory request                    | `128Mi`                 |
| `resources.limits.memory`   | Memory limit                      | `512Mi`                 |
| `autoscaling.enabled`       | Enable HPA                        | `false`                 |
| `autoscaling.minReplicas`   | Minimum replicas                  | `1`                     |
| `autoscaling.maxReplicas`   | Maximum replicas                  | `5`                     |
| `config.*`                  | Application environment variables | (varies by DB type)     |
| `secrets.JWT_SECRET`        | JWT signing key                   | (placeholder)           |

### Tear Down (Helm)

```bash
# Uninstall release and clean up PVCs
./helm/helm-apply.sh uninstall

# Or manually
helm uninstall myapp
kubectl delete pvc --all   # Clean up StatefulSet PVCs
```

---

## Raw Kubernetes Manifests

For simpler deployments or when Helm is not available, you can generate plain YAML manifests that are applied directly with `kubectl`.

### Generating Kubernetes Manifests

```bash
jhipster-rust kubernetes
```

### Configuration Prompts

| Prompt               | Options                                    | Default       |
| -------------------- | ------------------------------------------ | ------------- |
| Kubernetes namespace | Any valid namespace                        | `default`     |
| Service type         | ClusterIP, NodePort, LoadBalancer, Ingress | `ClusterIP`   |
| Ingress controller   | NGINX, Traefik (when Ingress selected)     | `nginx`       |
| Ingress domain       | Any domain                                 | `example.com` |
| Docker registry URL  | Registry path (e.g., `docker.io/user`)     | (none)        |

### Generated Manifests

#### Core Manifests (Always Generated)

| File                     | Description                                 |
| ------------------------ | ------------------------------------------- |
| `k8s/namespace.yml`      | Namespace (if not `default`)                |
| `k8s/app-deployment.yml` | Application Deployment with health probes   |
| `k8s/app-service.yml`    | Service (ClusterIP/NodePort/LoadBalancer)   |
| `k8s/app-configmap.yml`  | Environment configuration                   |
| `k8s/app-secret.yml`     | Sensitive values (JWT secret, DB passwords) |
| `k8s/kubectl-apply.sh`   | Deployment helper script                    |
| `k8s/README-k8s.md`      | Quick start guide                           |

#### Database Manifests (Conditional)

| File                             | Condition           |
| -------------------------------- | ------------------- |
| `k8s/postgresql-statefulset.yml` | PostgreSQL selected |
| `k8s/mysql-statefulset.yml`      | MySQL selected      |
| `k8s/mongodb-statefulset.yml`    | MongoDB selected    |
| (PVC in app-deployment.yml)      | SQLite selected     |

All database manifests use **StatefulSets** with PersistentVolumeClaims for data persistence.

#### Infrastructure Manifests (Conditional)

| File                          | Condition                                |
| ----------------------------- | ---------------------------------------- |
| `k8s/app-ingress.yml`         | Ingress enabled (NGINX or Traefik)       |
| `k8s/keycloak-deployment.yml` | OAuth2/OIDC authentication               |
| `k8s/consul-statefulset.yml`  | Consul service discovery (microservices) |
| `k8s/kafka-statefulset.yml`   | Kafka message broker                     |
| `k8s/monitoring.yml`          | Prometheus monitoring                    |

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

### Tear Down (Manifests)

```bash
./k8s/kubectl-apply.sh delete
```

---

## Helm vs Raw Kubernetes Manifests

| Feature            | `jhipster-rust kubernetes` | `jhipster-rust kubernetes:helm`    |
| ------------------ | -------------------------- | ---------------------------------- |
| Output format      | Plain YAML manifests       | Helm chart with values.yaml        |
| Parameterization   | Hardcoded values           | `values.yaml` overrides            |
| Upgrades           | `kubectl apply` (manual)   | `helm upgrade` (tracked revisions) |
| Rollback           | Manual                     | `helm rollback`                    |
| Release management | None                       | Helm release tracking              |
| HPA support        | No                         | Yes (optional)                     |
| Best for           | Simple/dev deployments     | Production/multi-env deployments   |

---

## Common Topics

### Health Probes

Both approaches include Kubernetes health probes:

| Probe     | Endpoint                | Purpose                          |
| --------- | ----------------------- | -------------------------------- |
| Liveness  | `/api/health/liveness`  | Restart unhealthy pods           |
| Readiness | `/api/health/readiness` | Route traffic only to ready pods |

### Resource Limits

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

Adjust in `values.yaml` (Helm) or `k8s/app-deployment.yml` (manifests).

### Access the Application

```bash
# Port forwarding
kubectl port-forward svc/myapp 8080:8080

# Or if using NodePort
# Access at http://<node-ip>:30080

# Or if using Ingress
# Access at http://myapp.example.com
```

### Production Considerations

#### Secrets Management

For production, replace placeholder secrets with real values. Consider:

- [Sealed Secrets](https://sealed-secrets.netlify.app/) for encrypted secrets in Git
- [External Secrets Operator](https://external-secrets.io/) for secrets from external stores

#### Database

The generated StatefulSets are suitable for development. For production:

- Use managed database services (RDS, Cloud SQL, Atlas) when possible
- If self-hosted, configure proper backup strategies
- Tune resource limits based on workload

#### Scaling

```bash
# With Helm (if HPA not enabled)
helm upgrade myapp ./helm/myapp --set replicaCount=3

# With manifests
kubectl scale deployment/myapp --replicas=3

# Note: SQLite does not support multiple replicas writing concurrently.
# Use PostgreSQL or MySQL for multi-replica deployments.
```

#### TLS

To enable HTTPS via Ingress:

1. Install [cert-manager](https://cert-manager.io/) for automatic certificates
2. Configure TLS in values.yaml (Helm) or `k8s/app-ingress.yml` (manifests)
3. Create or reference a TLS secret
