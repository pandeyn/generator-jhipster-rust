# CI/CD Integration for JHipster Rust

This document describes the CI/CD pipeline generation capability for JHipster Rust applications.

## Overview

The `jhipster-rust ci-cd` generator creates CI/CD configuration files tailored for Rust applications using the Axum framework. The generated pipelines handle building, testing, linting, and optionally deploying your Rust backend.

## Supported CI/CD Platforms

- **GitHub Actions** (`.github/workflows/main.yml`) - Recommended
- **GitLab CI** (`.gitlab-ci.yml`)

## Usage

To generate CI/CD configuration for your JHipster Rust application:

```bash
jhipster-rust ci-cd
```

You will be prompted to select:

1. Which CI/CD pipeline(s) to configure
2. Optional integrations (Docker publishing, SonarQube analysis)

## Generated Pipeline Features

### Build & Test

- **Rust toolchain setup** with stable channel
- **Dependency caching** for faster builds
- **Cargo build** for compilation
- **Cargo test** for running unit and integration tests
- **Cargo clippy** for linting
- **Cargo fmt --check** for format validation

### Database Support

Pipelines are configured based on your database selection:

- **SQLite**: No additional services required
- **PostgreSQL**: PostgreSQL service container with health checks
- **MySQL**: MySQL service container with health checks
- **MongoDB**: MongoDB service container

### Optional Integrations

- **Docker image building and publishing** to container registries
- **SonarQube code analysis** for code quality metrics

## Environment Variables

### Required Secrets (GitHub Actions)

Configure these in your repository settings → Secrets and variables → Actions:

| Secret            | Description                    | Required When             |
| ----------------- | ------------------------------ | ------------------------- |
| `DOCKER_USERNAME` | Docker registry username       | Docker publishing enabled |
| `DOCKER_PASSWORD` | Docker registry password/token | Docker publishing enabled |
| `SONAR_TOKEN`     | SonarQube authentication token | SonarQube enabled         |

### GitLab CI Variables

Configure these in Settings → CI/CD → Variables:

| Variable               | Description                    | Required When             |
| ---------------------- | ------------------------------ | ------------------------- |
| `CI_REGISTRY_USER`     | Container registry username    | Docker publishing enabled |
| `CI_REGISTRY_PASSWORD` | Container registry password    | Docker publishing enabled |
| `SONAR_TOKEN`          | SonarQube authentication token | SonarQube enabled         |

## Pipeline Structure

### GitHub Actions

```yaml
jobs:
  build:
    - Checkout code
    - Setup Rust toolchain
    - Cache Cargo dependencies
    - Start database services (if needed)
    - Run cargo fmt --check
    - Run cargo clippy
    - Run cargo build
    - Run cargo test

  docker: (optional)
    - Build Docker image
    - Push to registry
```

### GitLab CI

```yaml
stages:
  - lint
  - build
  - test
  - package

lint:
  - cargo fmt --check
  - cargo clippy

build:
  - cargo build --release

test:
  - cargo test

package: (optional)
  - docker build & push
```

## Customization

After generation, you can customize the pipeline files to:

- Add deployment stages
- Configure additional environments (staging, production)
- Add notifications (Slack, email)
- Include additional security scanning tools

## Local Testing with Act

You can run GitHub Actions locally using [act](https://github.com/nektos/act), which simulates the GitHub Actions environment in Docker containers.

### Installing Act

```bash
# macOS
brew install act

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

### Running GitHub Actions Locally

To run the full workflow:

```bash
# For Apple Silicon Macs (M1/M2/M3)
act push --container-architecture linux/amd64

# For Intel Macs or Linux
act push
```

To perform a dry run (shows what would run without executing):

```bash
act -n
```

To run a specific job:

```bash
act push -j build --container-architecture linux/amd64
```

### First Run Setup

On first run, `act` will prompt you to select a Docker image size:

- **Micro** - Minimal image, faster but may lack some tools
- **Medium** - Good balance (recommended)
- **Large** - Full GitHub Actions environment, slower to download

### Important Notes

- The `--container-architecture linux/amd64` flag is required on Apple Silicon Macs to ensure compatibility with x86_64 Docker images
- `act` mounts your local directory into the container, so changes are reflected immediately
- Some GitHub Actions features (like secrets) need to be configured separately - see [act documentation](https://github.com/nektos/act#secrets)
- First run will download Docker images which may take some time

### Troubleshooting Act

1. **Docker not running**

   - Ensure Docker Desktop is running before using `act`

2. **Permission denied errors**

   - On Linux, you may need to run with `sudo` or add your user to the `docker` group

3. **Out of memory errors**

   - Increase Docker's memory allocation in Docker Desktop settings

4. **Slow builds on Apple Silicon**
   - This is expected due to x86_64 emulation; builds will be faster on actual GitHub Actions

## Troubleshooting

### Common Issues

1. **Tests fail due to database connection**

   - Ensure the database service is healthy before tests run
   - Check environment variables match your application config

2. **Clippy warnings fail the build**

   - Fix linting issues locally with `cargo clippy --fix`
   - Or adjust the CI configuration to allow warnings (not recommended)

3. **Cache not working**

   - Verify cache keys match your Cargo.lock structure
   - Check cache size limits for your CI platform

4. **Tests fail with "duplicate key" errors (PostgreSQL/MySQL)**

   - This happens when tests run in parallel and try to run migrations simultaneously
   - The generated workflow uses `--test-threads=1` to prevent this
   - For local testing, run: `cargo test -- --test-threads=1`

5. **rdkafka build fails with "cmake not found" (Kafka projects)**
   - The `rdkafka` crate requires `cmake` to build `librdkafka`
   - The generated workflow automatically installs cmake for Kafka projects
   - For local development, install cmake: `brew install cmake` (macOS) or `apt-get install cmake` (Linux)
