# API Configuration Guide

## Overview

Each service/page can be configured independently to use **mock data** (local JSON files) or **live API endpoints** for each environment (prod, stage, dev). The configuration is done per-page in the HTML file.

## How It Works

### 1. Configuration Location

Every page has an `#api-config` script tag in its HTML file that defines endpoints for each environment:

```html
<script type="application/json" id="api-config">
{
  "section-name": {
    "prod": { "endpoint": "" },
    "stage": { "endpoint": "" },
    "dev": { "endpoint": "" }
  }
}
</script>
```

### 2. Decision Logic

The system checks the endpoint value for the current environment:

- **Empty string (`""`)** → Uses **mock data** from `page/{section-name}/data.json`
- **Non-empty string** → Uses **live API** at the specified endpoint URL

### 3. Environment Switching

Users can switch environments using the dropdown selector in the page header:
- **PROD** → Uses `prod` endpoint configuration
- **STAGE** → Uses `stage` endpoint configuration  
- **DEV** → Uses `dev` endpoint configuration

When the environment changes, the page automatically refreshes and uses the appropriate endpoint (or mock data) for that environment.

## Configuration Examples

### Example 1: Products - All Mock Data

```html
<script type="application/json" id="api-config">
{
  "products": {
    "prod": { "endpoint": "" },
    "stage": { "endpoint": "" },
    "dev": { "endpoint": "" }
  }
}
</script>
```

**Result**: Products page always uses mock data from `page/products/data.json` regardless of environment.

### Example 2: KYC-Shufti - All Live API

```html
<script type="application/json" id="api-config">
{
  "kyc-shufti": {
    "prod": { "endpoint": "https://api.production.com/kyc/shufti/sessions" },
    "stage": { "endpoint": "https://api.staging.com/kyc/shufti/sessions" },
    "dev": { "endpoint": "http://localhost:3000/kyc/shufti/sessions" }
  }
}
</script>
```

**Result**: KYC-Shufti page always uses live API, but different endpoints per environment.

### Example 3: Moderation - Mixed (Dev Live, Others Mock)

```html
<script type="application/json" id="api-config">
{
  "moderation": {
    "prod": { "endpoint": "" },
    "stage": { "endpoint": "" },
    "dev": { "endpoint": "http://localhost:3000/moderation/status/pending" }
  }
}
</script>
```

**Result**: 
- **PROD/STAGE**: Uses mock data from `page/moderation/data.json`
- **DEV**: Uses live API at `http://localhost:3000/moderation/status/pending`

### Example 4: Orders - Prod Live, Others Mock

```html
<script type="application/json" id="api-config">
{
  "orders": {
    "prod": { "endpoint": "https://api.production.com/orders" },
    "stage": { "endpoint": "" },
    "dev": { "endpoint": "" }
  }
}
</script>
```

**Result**:
- **PROD**: Uses live API at `https://api.production.com/orders`
- **STAGE/DEV**: Uses mock data from `page/orders/data.json`

## Configuration Flow

```
1. User selects environment (PROD/STAGE/DEV) from dropdown
   ↓
2. System reads #api-config script tag from current page
   ↓
3. Gets endpoint for current environment (e.g., "prod", "stage", "dev")
   ↓
4. Checks if endpoint is empty or has value
   ↓
   ├─ Empty string → Load mock data from page/{section}/data.json
   │                 (Client-side filtering applied)
   │
   └─ Has value → Make API call to endpoint URL
                   (Server-side filtering via POST payload or GET query params)
```

## Key Points

1. **Per-Service Configuration**: Each service/page has its own independent configuration
2. **Per-Environment Configuration**: Each environment (prod/stage/dev) can have different settings
3. **Automatic Switching**: Changing environment automatically switches between mock/live
4. **No Code Changes**: Just update the endpoint strings in the HTML config
5. **Fallback Behavior**: Empty endpoint = mock data, no errors thrown

## Current Configuration Status

Based on the codebase:

- **Products**: All environments use mock data (empty endpoints)
- **Orders**: All environments use mock data (empty endpoints)
- **Subscriptions**: All environments use mock data (empty endpoints)
- **Users**: All environments use mock data (empty endpoints)
- **Media**: All environments use mock data (empty endpoints)
- **Moderation**: Dev uses live API, prod/stage use mock data
- **KYC-Shufti**: All environments use live API (localhost endpoints)

## Best Practices

1. **Development**: Use `localhost` endpoints for dev environment
2. **Staging**: Use staging API endpoints for stage environment
3. **Production**: Use production API endpoints for prod environment
4. **Testing**: Leave endpoints empty to test with mock data
5. **Gradual Migration**: Start with dev environment, then stage, then prod

## Global Override (Advanced)

There's also a global flag `USE_ENDPOINTS` in `api-service.js` (line 7) that can force all services to use endpoints, but this is currently set to `false` and should remain that way for per-service configuration.

