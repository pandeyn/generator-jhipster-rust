# Keycloak Integration

This document describes the Keycloak/OAuth2 integration for JHipster Rust applications.

## Overview

When you generate a JHipster Rust application with OAuth2 authentication, it integrates with Keycloak as the identity provider. The implementation uses:

- **OIDC (OpenID Connect)** for authentication
- **JWT tokens** validated using JWKS (JSON Web Key Set)
- **Stateless authentication** via HTTP cookies

## Running Keycloak

### Using Docker Compose

The generated application includes a pre-configured Keycloak setup in the `docker` directory.

```bash
# Start Keycloak
docker compose -f docker/keycloak.yml up -d

# Stop Keycloak
docker compose -f docker/keycloak.yml down

# Stop and remove volumes (for fresh start with realm reimport)
docker compose -f docker/keycloak.yml down -v
```

### Default Configuration

- **Keycloak URL**: http://localhost:9080
- **Admin Console**: http://localhost:9080/admin (admin/admin)
- **Realm**: `jhipster`
- **Client ID**: `web_app`
- **Client Secret**: `web_app`

### Test Users

| Username | Password | Roles                 |
| -------- | -------- | --------------------- |
| admin    | admin    | ROLE_ADMIN, ROLE_USER |
| user     | user     | ROLE_USER             |

## Authentication Flow

### Login Flow

1. User clicks "Sign in" on the Angular frontend
2. Browser redirects to `/oauth2/authorization/oidc` on the Rust server
3. Rust server redirects to Keycloak's authorization endpoint
4. User authenticates with Keycloak
5. Keycloak redirects back to `/login/oauth2/code/oidc` with an authorization code
6. Rust server exchanges the code for tokens (access_token, id_token)
7. Tokens are set as HTTP cookies and user is redirected to the frontend
8. Frontend calls `/api/account` to get user info (cookie is sent automatically)

### Logout Flow

1. User clicks "Sign out" on the Angular frontend
2. Frontend calls `POST /api/logout`
3. Rust server returns the Keycloak logout URL with:
   - `id_token_hint`: For proper session termination
   - `post_logout_redirect_uri`: To redirect back to the app after logout
4. Server clears authentication cookies (`access_token`, `id_token`)
5. Frontend redirects to the Keycloak logout URL
6. Keycloak terminates the session and redirects back to the app

## Configuration

### Environment Variables

Configure OAuth2 in your `.env` file:

```bash
# OAuth2/OIDC Configuration
OAUTH2_ISSUER_URI=http://localhost:9080/realms/jhipster
OAUTH2_CLIENT_ID=web_app
OAUTH2_CLIENT_SECRET=web_app

# Frontend URL (for post-login and post-logout redirects)
FRONTEND_URL=http://localhost:9000
```

### Keycloak Realm Configuration

The realm configuration is stored in `docker/realm-config/jhipster-realm.json`. Key settings:

- **Valid Redirect URIs**: URLs allowed for OAuth2 callbacks
- **Post Logout Redirect URIs**: URLs allowed for post-logout redirects
- **Web Origins**: CORS allowed origins

## Token Validation

The Rust server validates JWT tokens using:

1. **JWKS Validation**: Fetches public keys from Keycloak's JWKS endpoint
2. **Issuer Validation**: Ensures token was issued by the expected Keycloak realm
3. **Authorized Party (azp) Validation**: Ensures token was issued for our client

Note: Keycloak access tokens have `aud="account"` (not the client ID), so we validate the `azp` claim instead of the standard `aud` claim.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Angular App    │────▶│   Rust Server   │────▶│    Keycloak     │
│  (port 9000)    │     │   (port 8080)   │     │   (port 9080)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │   1. Click Login      │                       │
        │──────────────────────▶│                       │
        │                       │   2. Redirect to      │
        │                       │      Keycloak         │
        │                       │──────────────────────▶│
        │                       │                       │
        │   3. User authenticates with Keycloak         │
        │◀──────────────────────────────────────────────│
        │                       │                       │
        │   4. Redirect with    │                       │
        │      auth code        │                       │
        │──────────────────────▶│                       │
        │                       │   5. Exchange code    │
        │                       │      for tokens       │
        │                       │──────────────────────▶│
        │                       │                       │
        │                       │   6. Return tokens    │
        │                       │◀──────────────────────│
        │                       │                       │
        │   7. Set cookies &    │                       │
        │      redirect to app  │                       │
        │◀──────────────────────│                       │
        │                       │                       │
        │   8. GET /api/account │                       │
        │      (with cookie)    │                       │
        │──────────────────────▶│                       │
        │                       │   9. Validate JWT     │
        │                       │      via JWKS         │
        │                       │──────────────────────▶│
        │                       │                       │
        │   10. Return user info│                       │
        │◀──────────────────────│                       │
```

## Security Considerations

### Cookie Settings

- **Path=/**: Cookie available for all paths
- **SameSite=Lax**: Protects against CSRF while allowing top-level navigation
- **Max-Age**: Set based on token expiration

### Token Storage

Tokens are stored in HTTP cookies rather than localStorage/sessionStorage:

- Automatically sent with requests
- Not accessible via JavaScript (when HttpOnly is set)
- Cleared on logout

### JWKS Caching

The JWKS (public keys) are cached to avoid fetching on every request. The cache is invalidated periodically and when key rotation is detected.

## Troubleshooting

### Common Issues

1. **401 Unauthorized after login**

   - Check that cookies are being set correctly
   - Verify the OAUTH2_ISSUER_URI matches your Keycloak configuration
   - Ensure the client secret is correct

2. **Redirect loop on login**

   - Check that Valid Redirect URIs in Keycloak include your callback URL
   - Verify FRONTEND_URL is set correctly

3. **Logout doesn't work**

   - Ensure Post Logout Redirect URIs are configured in Keycloak
   - Check that id_token cookie is being set during login

4. **InvalidAudience error**
   - This is normal - Keycloak uses `aud="account"` in access tokens
   - The server validates the `azp` (authorized party) claim instead

### Debugging

Enable debug logging:

```bash
RUST_LOG=debug cargo run
```

Check Keycloak logs:

```bash
docker compose -f docker/keycloak.yml logs -f
```

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [Keycloak RP-Initiated Logout](https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/endpoints/LogoutEndpoint.html)
