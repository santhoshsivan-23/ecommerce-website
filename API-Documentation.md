# ShopKart — API Payload Documentation

Postman-ready reference for every endpoint exposed by `ecommerce-backend`.

---

## 1. Setup

| Item | Value |
| ---- | ----- |
| Base URL (local) | `http://localhost:5000` |
| All routes prefixed with | `/api` |
| Content type | `application/json` |
| Auth scheme | JWT — sent as an httpOnly cookie **and** returned as a bearer token |

### Postman environment variables

Create an environment with these variables and every example below works as written:

| Variable | Initial value |
| -------- | ------------- |
| `baseUrl` | `http://localhost:5000` |
| `token` | *(empty — filled by the login request)* |
| `customerToken` | *(empty)* |
| `sellerToken` | *(empty)* |
| `adminToken` | *(empty)* |

### Headers

| Header | When |
| ------ | ---- |
| `Content-Type: application/json` | every request with a body |
| `Authorization: Bearer {{token}}` | every protected route |

The API also accepts the `token` cookie set by `/api/auth/login`. In Postman, enabling the cookie jar means protected routes work without the header; the bearer header is the reliable option and is used throughout this document.

### Roles

`customer`, `seller`, `admin`. Route guards are enforced server-side by `restrictTo()`, not only in the UI.

### Demo accounts (after `npm run seed`)

| Role | Email | Password |
| ---- | ----- | -------- |
| Customer | `customer@shop.com` | `Customer@123` |
| Seller | `seller@shop.com` | `Seller@123` |
| Seller | `seller2@shop.com` | `Seller@123` |
| Admin | `admin@shop.com` | `Admin@123` |

All record IDs used in the examples (product `1`, category `2`, brand `2`, payment method `1`, …) are the IDs produced by a freshly seeded database.

---

## 2. Response envelope

Every response — success or failure — shares one shape:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {},
  "errors": []
}
```

- `success` — `true` on 2xx, `false` on any error.
- `message` — present on writes and on all errors.
- `data` — present on success.
- `errors` — present only when field-level validation failed.

### Status codes

| Code | Meaning | Typical message |
| ---- | ------- | --------------- |
| `200` | OK | — |
| `201` | Created | `Order ORD-20260812-00221 placed successfully` |
| `400` | Bad request / validation | `Validation failed` |
| `401` | Not signed in / bad token | `You are not logged in. Please log in to continue.` |
| `403` | Wrong role or not your record | `This action is restricted to: admin.` |
| `404` | Not found | `Product not found` |
| `409` | Conflict | `An account with this email already exists` |
| `500` | Server error | `Something went wrong` |

### Standard validation error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Enter a valid email address" },
    { "field": "password", "message": "Password must contain at least one number" }
  ]
}
```

### Standard auth errors

```json
{ "success": false, "message": "You are not logged in. Please log in to continue." }
```

```json
{ "success": false, "message": "This action is restricted to: admin." }
```

```json
{ "success": false, "message": "Your session is invalid or has expired. Please log in again." }
```

A deactivated account is rejected on the very next request, not just at login:

```json
{ "success": false, "message": "This account has been disabled." }
```

---

## 3. Health check

### 3.1 Health

| | |
| --- | --- |
| **API name** | Health check |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/health` |
| **Auth** | Public |
| **Parameters** | None |

**Request payload:** none.

**Success — 200**

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-08-12T09:15:42.118Z"
}
```

**Error — 404** (wrong path)

```json
{ "success": false, "message": "Route GET /api/helth not found" }
```

---

## 4. Authentication — `/api/auth`

### 4.1 Register

| | |
| --- | --- |
| **API name** | Register customer |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/auth/register` |
| **Auth** | Public |
| **Headers** | `Content-Type: application/json` |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | 2–100 characters |
| `email` | string | yes | valid email, must be unique |
| `password` | string | yes | min 6 characters, must contain a number |
| `phone` | string | no | valid mobile number |
| `role` | string | no | `seller` is accepted; anything else becomes `customer`. Admin accounts are never self-serve. |

**Request payload**

```json
{
  "name": "Ananya Sharma",
  "email": "ananya.sharma@example.com",
  "password": "Shop@2026",
  "phone": "9876543210"
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 13,
      "name": "Ananya Sharma",
      "email": "ananya.sharma@example.com",
      "phone": "9876543210",
      "role": "customer",
      "avatar": null,
      "isActive": true,
      "createdAt": "2026-08-12T09:20:11.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTMsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4NjY0MjgxMSwiZXhwIjoxNzg3MjQ3NjExfQ.Qm1yG0m9tGf2fSxJ4o5v0oKZq1cQx2nS8HkVc7bY3nA"
  }
}
```

> **Postman tip:** add this to the request's *Tests* tab so later requests are authenticated automatically:
> `pm.environment.set("token", pm.response.json().data.token);`

**Error — 409** (email already registered)

```json
{ "success": false, "message": "An account with this email already exists" }
```

**Error — 400** (validation)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Name must be 2-100 characters" },
    { "field": "password", "message": "Password must contain at least one number" }
  ]
}
```

---

### 4.2 Login

| | |
| --- | --- |
| **API name** | Login |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/auth/login` |
| **Auth** | Public |
| **Headers** | `Content-Type: application/json` |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `email` | string | yes | valid email |
| `password` | string | yes | not empty |

**Request payload**

```json
{
  "email": "customer@shop.com",
  "password": "Customer@123"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Welcome back, Riya Customer",
  "data": {
    "user": {
      "id": 4,
      "name": "Riya Customer",
      "email": "customer@shop.com",
      "phone": "9000000003",
      "role": "customer",
      "avatar": null,
      "isActive": true,
      "createdAt": "2026-08-12T08:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzg2NjQyOTAwLCJleHAiOjE3ODcyNDc3MDB9.rT7pQ0wYyH3nUeF9sJk2LmZbXc4aVdN6oIqB1gRhE8s"
  }
}
```

The same call with `admin@shop.com` / `seller@shop.com` returns `role: "admin"` / `role: "seller"`; store those tokens as `{{adminToken}}` and `{{sellerToken}}`.

**Error — 401** (wrong email *or* wrong password — deliberately identical so accounts cannot be enumerated)

```json
{ "success": false, "message": "Invalid email or password" }
```

**Error — 403** (account deactivated by an admin)

```json
{ "success": false, "message": "This account has been disabled" }
```

---

### 4.3 Logout

| | |
| --- | --- |
| **API name** | Logout |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/auth/logout` |
| **Auth** | Public (clears the cookie if one is present) |

**Request payload:** none.

**Success — 200**

```json
{ "success": true, "message": "Logged out successfully" }
```

**Error — 404** (wrong method/path)

```json
{ "success": false, "message": "Route GET /api/auth/logout not found" }
```

---

### 4.4 Get current profile

| | |
| --- | --- |
| **API name** | Get my profile |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/auth/me` |
| **Auth** | Any signed-in user — `Authorization: Bearer {{token}}` |

**Request payload:** none.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 4,
      "name": "Riya Customer",
      "email": "customer@shop.com",
      "phone": "9000000003",
      "role": "customer",
      "avatar": null,
      "isActive": true,
      "createdAt": "2026-08-12T08:00:00.000Z"
    }
  }
}
```

**Error — 401**

```json
{ "success": false, "message": "You are not logged in. Please log in to continue." }
```

---

### 4.5 Update profile

| | |
| --- | --- |
| **API name** | Update my profile |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/auth/me` |
| **Auth** | Any signed-in user |

**Body parameters** — all optional; only the fields sent are changed.

| Field | Type | Rules |
| ----- | ---- | ----- |
| `name` | string | 2–100 characters |
| `phone` | string | valid mobile number |
| `avatar` | string | image URL |

**Request payload**

```json
{
  "name": "Riya S. Customer",
  "phone": "9000000033",
  "avatar": "https://picsum.photos/seed/riya/200/200"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "user": {
      "id": 4,
      "name": "Riya S. Customer",
      "email": "customer@shop.com",
      "phone": "9000000033",
      "role": "customer",
      "avatar": "https://picsum.photos/seed/riya/200/200",
      "isActive": true,
      "createdAt": "2026-08-12T08:00:00.000Z"
    }
  }
}
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "phone", "message": "Enter a valid phone number" }]
}
```

---

### 4.6 Change password

| | |
| --- | --- |
| **API name** | Change password |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/auth/change-password` |
| **Auth** | Any signed-in user |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `currentPassword` | string | yes | must match the stored password |
| `newPassword` | string | yes | min 6 characters, must contain a number |

**Request payload**

```json
{
  "currentPassword": "Customer@123",
  "newPassword": "Customer@2026"
}
```

**Success — 200** (a fresh token is issued, so the session survives the change)

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzg2NjQzMTAwLCJleHAiOjE3ODcyNDc5MDB9.5Yk8pLwQ2vH1nRtBzXc9aMjD3sOeUf7gIqN0bV4hTdE"
  }
}
```

**Error — 400** (wrong current password)

```json
{ "success": false, "message": "Your current password is incorrect" }
```

---

## 5. Categories — `/api/categories`

### 5.1 List category tree

| | |
| --- | --- |
| **API name** | List categories |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/categories` |
| **Auth** | Public (optional auth — an admin sees more) |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `includeInactive` | `true` | Admin only; returns disabled categories too |

**Success — 200** (top-level categories, each with its subcategories)

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "description": null,
        "image": "https://picsum.photos/seed/electronics/700/700",
        "parentId": null,
        "isActive": true,
        "sortOrder": 0,
        "createdAt": "2026-08-12T08:00:01.000Z",
        "updatedAt": "2026-08-12T08:00:01.000Z",
        "children": [
          {
            "id": 2,
            "name": "Smartphones",
            "slug": "smartphones",
            "image": "https://picsum.photos/seed/cat-Smartphones/700/700",
            "parentId": 1,
            "isActive": true,
            "sortOrder": 0
          },
          {
            "id": 3,
            "name": "Laptops",
            "slug": "laptops",
            "image": "https://picsum.photos/seed/cat-Laptops/700/700",
            "parentId": 1,
            "isActive": true,
            "sortOrder": 1
          }
        ]
      },
      {
        "id": 6,
        "name": "Fashion",
        "slug": "fashion",
        "image": "https://picsum.photos/seed/fashion/700/700",
        "parentId": null,
        "isActive": true,
        "sortOrder": 1,
        "children": [
          { "id": 7, "name": "T-Shirts", "slug": "t-shirts", "parentId": 6, "isActive": true, "sortOrder": 0 }
        ]
      }
    ]
  }
}
```

**Error — 500**

```json
{ "success": false, "message": "Something went wrong" }
```

---

### 5.2 List categories flat

| | |
| --- | --- |
| **API name** | List categories (flat) |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/categories/flat` |
| **Auth** | Admin — `Authorization: Bearer {{adminToken}}` |

Used to populate admin dropdowns: every category in one list, each carrying its parent.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 11,
        "name": "Cookware",
        "slug": "cookware",
        "parentId": 10,
        "isActive": true,
        "sortOrder": 0,
        "parent": { "id": 10, "name": "Home & Kitchen", "slug": "home-kitchen" }
      },
      {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "parentId": null,
        "isActive": true,
        "sortOrder": 0,
        "parent": null
      }
    ]
  }
}
```

**Error — 403** (signed in as a customer or seller)

```json
{ "success": false, "message": "This action is restricted to: admin." }
```

---

### 5.3 Get one category

| | |
| --- | --- |
| **API name** | Get category |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/categories/:idOrSlug` |
| **Auth** | Public |

**Path parameter:** `idOrSlug` — numeric id (`2`) or slug (`smartphones`).

**Example:** `{{baseUrl}}/api/categories/smartphones`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "category": {
      "id": 2,
      "name": "Smartphones",
      "slug": "smartphones",
      "description": null,
      "image": "https://picsum.photos/seed/cat-Smartphones/700/700",
      "parentId": 1,
      "isActive": true,
      "sortOrder": 0,
      "children": [],
      "parent": { "id": 1, "name": "Electronics", "slug": "electronics" }
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Category not found" }
```

---

### 5.4 Create category

| | |
| --- | --- |
| **API name** | Create category |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/categories` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | not empty; the slug is generated from it |
| `description` | string | no | |
| `image` | string | no | image URL |
| `parentId` | number | no | makes this a subcategory; the parent must itself be top-level |
| `isActive` | boolean | no | defaults to `true` |
| `sortOrder` | number | no | defaults to `0` |

**Request payload**

```json
{
  "name": "Tablets",
  "description": "Android and iPad tablets",
  "image": "https://picsum.photos/seed/cat-Tablets/700/700",
  "parentId": 1,
  "isActive": true,
  "sortOrder": 4
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "category": {
      "id": 16,
      "name": "Tablets",
      "slug": "tablets",
      "description": "Android and iPad tablets",
      "image": "https://picsum.photos/seed/cat-Tablets/700/700",
      "parentId": 1,
      "isActive": true,
      "sortOrder": 4,
      "updatedAt": "2026-08-12T09:30:00.000Z",
      "createdAt": "2026-08-12T09:30:00.000Z"
    }
  }
}
```

**Error — 400** (nesting too deep — categories go one level only)

```json
{ "success": false, "message": "Categories can only be nested one level deep" }
```

**Error — 400** (missing name)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "name", "message": "Category name is required" }]
}
```

---

### 5.5 Update category

| | |
| --- | --- |
| **API name** | Update category |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/categories/:id` |
| **Auth** | Admin |

**Body parameters:** any of `name`, `description`, `image`, `parentId`, `isActive`, `sortOrder`. Only the fields sent are changed.

**Request payload**

```json
{
  "name": "Tablets & E-readers",
  "isActive": false,
  "sortOrder": 5
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Category updated",
  "data": {
    "category": {
      "id": 16,
      "name": "Tablets & E-readers",
      "slug": "tablets",
      "parentId": 1,
      "isActive": false,
      "sortOrder": 5,
      "updatedAt": "2026-08-12T09:34:12.000Z"
    }
  }
}
```

**Error — 400** (a category cannot be its own parent)

```json
{ "success": false, "message": "A category cannot be its own parent" }
```

**Error — 404**

```json
{ "success": false, "message": "Category not found" }
```

---

### 5.6 Delete category

| | |
| --- | --- |
| **API name** | Delete category |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/categories/:id` |
| **Auth** | Admin |

**Request payload:** none.

**Success — 200**

```json
{ "success": true, "message": "Category deleted" }
```

**Error — 400** (still has subcategories)

```json
{ "success": false, "message": "Remove or reassign the subcategories before deleting this category" }
```

**Error — 400** (still in use by products)

```json
{ "success": false, "message": "3 product(s) still use this category. Move them first, or disable the category instead." }
```

---

## 6. Brands — `/api/brands`

### 6.1 List brands

| | |
| --- | --- |
| **API name** | List brands |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/brands` |
| **Auth** | Public (optional auth) |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `includeInactive` | `true` | Admin only |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": 1,
        "name": "Aurora",
        "slug": "aurora",
        "logo": "https://picsum.photos/seed/brand-Aurora/700/700",
        "description": null,
        "isActive": true,
        "createdAt": "2026-08-12T08:00:02.000Z",
        "updatedAt": "2026-08-12T08:00:02.000Z"
      },
      {
        "id": 6,
        "name": "CasaLuxe",
        "slug": "casaluxe",
        "logo": "https://picsum.photos/seed/brand-CasaLuxe/700/700",
        "description": null,
        "isActive": true
      }
    ]
  }
}
```

---

### 6.2 Get one brand

| | |
| --- | --- |
| **API name** | Get brand |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/brands/:id` |
| **Auth** | Public |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "brand": {
      "id": 2,
      "name": "NovaTech",
      "slug": "novatech",
      "logo": "https://picsum.photos/seed/brand-NovaTech/700/700",
      "description": null,
      "isActive": true
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Brand not found" }
```

---

### 6.3 Create brand

| | |
| --- | --- |
| **API name** | Create brand |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/brands` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | must be unique |
| `logo` | string | no | image URL |
| `description` | string | no | |
| `isActive` | boolean | no | defaults to `true` |

**Request payload**

```json
{
  "name": "Solaris",
  "logo": "https://picsum.photos/seed/brand-Solaris/700/700",
  "description": "Solar-powered outdoor gear",
  "isActive": true
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Brand created",
  "data": {
    "brand": {
      "id": 9,
      "name": "Solaris",
      "slug": "solaris",
      "logo": "https://picsum.photos/seed/brand-Solaris/700/700",
      "description": "Solar-powered outdoor gear",
      "isActive": true,
      "updatedAt": "2026-08-12T09:40:00.000Z",
      "createdAt": "2026-08-12T09:40:00.000Z"
    }
  }
}
```

**Error — 409** (name already taken)

```json
{
  "success": false,
  "message": "A record with this name already exists",
  "errors": [{ "field": "name", "message": "name must be unique" }]
}
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "name", "message": "Brand name is required" }]
}
```

---

### 6.4 Update brand

| | |
| --- | --- |
| **API name** | Update brand |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/brands/:id` |
| **Auth** | Admin |

**Body parameters:** any of `name`, `logo`, `description`, `isActive`.

**Request payload**

```json
{
  "description": "Solar-powered outdoor and camping gear",
  "isActive": false
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Brand updated",
  "data": {
    "brand": {
      "id": 9,
      "name": "Solaris",
      "slug": "solaris",
      "description": "Solar-powered outdoor and camping gear",
      "isActive": false,
      "updatedAt": "2026-08-12T09:42:30.000Z"
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Brand not found" }
```

---

### 6.5 Delete brand

| | |
| --- | --- |
| **API name** | Delete brand |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/brands/:id` |
| **Auth** | Admin |

**Success — 200**

```json
{ "success": true, "message": "Brand deleted" }
```

**Error — 400** (products still reference it)

```json
{ "success": false, "message": "4 product(s) still use this brand. Reassign them first, or disable the brand instead." }
```

---

## 7. Products — `/api/products`

### 7.1 List products (search, filter, sort, paginate)

| | |
| --- | --- |
| **API name** | List products |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/products` |
| **Auth** | Public (optional auth changes what is visible) |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Searches product name, description, brand name and category name |
| `category` | id or slug | Includes the category's subcategories |
| `brand` | id/slug, comma-separated | `brand=2,5` or `brand=novatech` |
| `minPrice` | number | Compared against the effective (discounted) price |
| `maxPrice` | number | |
| `inStock` | `true` | Product stock > 0, or any active variant with stock |
| `size` | string, comma-separated | `size=M,L` |
| `color` | string, comma-separated | `color=Black,Blue` |
| `rating` | number | Minimum rating |
| `featured` | `true` | Featured products only |
| `sort` | enum | `newest` (default), `oldest`, `price_asc`, `price_desc`, `popular`, `rating`, `name_asc` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `12`, capped at `60` |
| `includeInactive` | `true` | Admin, or a seller viewing their own listings |
| `mine` | `true` | Seller only — scopes the list to their own catalogue |
| `sellerId` | number | Filters to one seller's products |

**Example**

```
{{baseUrl}}/api/products?q=nova&category=smartphones&minPrice=10000&maxPrice=40000&inStock=true&sort=price_asc&page=1&limit=12
```

**Success — 200**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 2,
        "name": "Nova Lite 4G Smartphone",
        "slug": "nova-lite-4g-smartphone",
        "description": "Everyday performance with a large battery and a clean, ad-free interface.",
        "price": 14999,
        "discountPrice": 12499,
        "stock": 38,
        "categoryId": 2,
        "brandId": 2,
        "sellerId": 2,
        "isActive": true,
        "isFeatured": false,
        "rating": 4.3,
        "numReviews": 25,
        "soldCount": 34,
        "specifications": [
          { "key": "Display", "value": "6.5\" IPS" },
          { "key": "RAM", "value": "6GB" },
          { "key": "Storage", "value": "128GB" }
        ],
        "createdAt": "2026-08-12T08:00:05.000Z",
        "updatedAt": "2026-08-12T08:04:11.000Z",
        "category": { "id": 2, "name": "Smartphones", "slug": "smartphones", "parentId": 1 },
        "brand": { "id": 2, "name": "NovaTech", "slug": "novatech" },
        "seller": { "id": 2, "name": "Sam Seller" },
        "images": [
          {
            "id": 4,
            "productId": 2,
            "url": "https://picsum.photos/seed/nova-lite-4g-smartphone-0/700/700",
            "alt": "Nova Lite 4G Smartphone image 1",
            "isPrimary": true,
            "sortOrder": 0
          }
        ],
        "variants": []
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 12, "totalPages": 1 }
  }
}
```

**Empty result — 200** (an unknown category returns nothing rather than everything)

```json
{
  "success": true,
  "data": {
    "products": [],
    "pagination": { "total": 0, "page": 1, "limit": 12, "totalPages": 0 }
  }
}
```

---

### 7.2 Filter options

| | |
| --- | --- |
| **API name** | Get filter options |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/products/filters` |
| **Auth** | Public |

Feeds the listing page sidebar. Optionally scoped with `?category=smartphones`.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "brands": [
      { "id": 1, "name": "Aurora", "slug": "aurora", "productCount": 3 },
      { "id": 2, "name": "NovaTech", "slug": "novatech", "productCount": 3 },
      { "id": 5, "name": "PeakForm", "slug": "peakform", "productCount": 5 }
    ],
    "priceRange": { "min": 699, "max": 129999 },
    "sizes": ["L", "M", "S", "UK 10", "UK 6", "UK 7", "UK 8", "UK 9", "XL"],
    "colors": ["Black", "Blue", "Grey", "Red", "White"]
  }
}
```

---

### 7.3 Get product details

| | |
| --- | --- |
| **API name** | Get product |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/products/:idOrSlug` |
| **Auth** | Public (a disabled product stays visible to an admin and to the owning seller) |

**Example:** `{{baseUrl}}/api/products/vertex-ultrabook-14`

**Success — 200** (product plus up to 4 related products from the same category)

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 4,
      "name": "Vertex Ultrabook 14",
      "slug": "vertex-ultrabook-14",
      "description": "A 1.2kg magnesium chassis, 14\" 2.8K OLED screen and 18 hours of real-world battery life.",
      "price": 74999,
      "discountPrice": 69999,
      "stock": 6,
      "categoryId": 3,
      "brandId": 7,
      "sellerId": 2,
      "isActive": true,
      "isFeatured": true,
      "rating": 4.5,
      "numReviews": 51,
      "soldCount": 121,
      "specifications": [
        { "key": "Screen", "value": "14\" 2.8K OLED" },
        { "key": "RAM", "value": "16GB LPDDR5" },
        { "key": "SSD", "value": "512GB NVMe" },
        { "key": "Weight", "value": "1.2kg" }
      ],
      "category": { "id": 3, "name": "Laptops", "slug": "laptops", "parentId": 1 },
      "brand": { "id": 7, "name": "Vertex", "slug": "vertex" },
      "seller": { "id": 2, "name": "Sam Seller" },
      "images": [
        {
          "id": 10,
          "productId": 4,
          "url": "https://picsum.photos/seed/vertex-ultrabook-14-0/700/700",
          "alt": "Vertex Ultrabook 14 image 1",
          "isPrimary": true,
          "sortOrder": 0
        },
        {
          "id": 11,
          "productId": 4,
          "url": "https://picsum.photos/seed/vertex-ultrabook-14-1/700/700",
          "alt": "Vertex Ultrabook 14 image 2",
          "isPrimary": false,
          "sortOrder": 1
        }
      ],
      "variants": []
    },
    "related": [
      {
        "id": 5,
        "name": "Vertex Creator 16",
        "slug": "vertex-creator-16",
        "price": 129999,
        "discountPrice": null,
        "stock": 4,
        "isActive": true,
        "brand": { "id": 7, "name": "Vertex", "slug": "vertex" },
        "images": [
          { "url": "https://picsum.photos/seed/vertex-creator-16-0/700/700", "isPrimary": true }
        ]
      }
    ]
  }
}
```

A product with variants returns them in the same shape as the product form sends:

```json
"variants": [
  {
    "id": 1,
    "productId": 12,
    "sku": "URBANEDGE-COTTON-TEE-1",
    "size": "S",
    "color": "Black",
    "price": null,
    "discountPrice": null,
    "stock": 0,
    "image": null,
    "isActive": true
  },
  {
    "id": 2,
    "productId": 12,
    "sku": "URBANEDGE-COTTON-TEE-2",
    "size": "S",
    "color": "White",
    "price": null,
    "discountPrice": null,
    "stock": 12,
    "image": null,
    "isActive": true
  }
]
```

**Error — 404** (unknown slug, or a disabled product requested by a shopper)

```json
{ "success": false, "message": "Product not found" }
```

---

### 7.4 Create product

| | |
| --- | --- |
| **API name** | Create product |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/products` |
| **Auth** | Admin or seller — `Authorization: Bearer {{sellerToken}}` |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | min 2 characters |
| `price` | number | yes | greater than 0 |
| `categoryId` | number | yes | must exist |
| `description` | string | no | |
| `discountPrice` | number | no | greater than 0 and **lower than** `price` |
| `stock` | number | no | not negative; defaults to `0` |
| `brandId` | number | no | must exist |
| `sellerId` | number | no | **Admin only** — assigns the owning seller. A seller sending this is ignored; their own id is used. |
| `isActive` | boolean | no | defaults to `true` |
| `isFeatured` | boolean | no | defaults to `false` |
| `specifications` | array of `{ key, value }` | no | free-form spec sheet |
| `images` | array of string URLs, or `{ url, alt, isPrimary }` | no | exactly one image ends up primary |
| `variants` | array | no | each `{ sku, size, color, price, discountPrice, stock, image, isActive }`; a row needs at least a size, colour or SKU |

**Request payload**

```json
{
  "name": "Aurora Sport Buds",
  "description": "Sweat-resistant wireless earbuds with an ear-hook fit for running.",
  "price": 4499,
  "discountPrice": 3299,
  "stock": 0,
  "categoryId": 4,
  "brandId": 1,
  "isActive": true,
  "isFeatured": false,
  "specifications": [
    { "key": "Type", "value": "In-ear with hook" },
    { "key": "Battery", "value": "28 hours with case" },
    { "key": "Water resistance", "value": "IPX7" }
  ],
  "images": [
    { "url": "https://picsum.photos/seed/aurora-sport-buds-0/700/700", "alt": "Aurora Sport Buds front", "isPrimary": true },
    { "url": "https://picsum.photos/seed/aurora-sport-buds-1/700/700", "alt": "Aurora Sport Buds case" }
  ],
  "variants": [
    { "sku": "AURORA-SPORT-BUDS-1", "color": "Black", "stock": 25, "isActive": true },
    { "sku": "AURORA-SPORT-BUDS-2", "color": "Blue", "stock": 15, "price": 4699, "isActive": true }
  ]
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Product created",
  "data": {
    "product": {
      "id": 26,
      "name": "Aurora Sport Buds",
      "slug": "aurora-sport-buds",
      "description": "Sweat-resistant wireless earbuds with an ear-hook fit for running.",
      "price": 4499,
      "discountPrice": 3299,
      "stock": 0,
      "categoryId": 4,
      "brandId": 1,
      "sellerId": 2,
      "isActive": true,
      "isFeatured": false,
      "rating": 0,
      "numReviews": 0,
      "soldCount": 0,
      "specifications": [
        { "key": "Type", "value": "In-ear with hook" },
        { "key": "Battery", "value": "28 hours with case" },
        { "key": "Water resistance", "value": "IPX7" }
      ],
      "createdAt": "2026-08-12T10:02:00.000Z",
      "updatedAt": "2026-08-12T10:02:00.000Z",
      "category": { "id": 4, "name": "Headphones", "slug": "headphones", "parentId": 1 },
      "brand": { "id": 1, "name": "Aurora", "slug": "aurora" },
      "seller": { "id": 2, "name": "Sam Seller" },
      "images": [
        {
          "id": 80,
          "productId": 26,
          "url": "https://picsum.photos/seed/aurora-sport-buds-0/700/700",
          "alt": "Aurora Sport Buds front",
          "isPrimary": true,
          "sortOrder": 0
        }
      ],
      "variants": [
        { "id": 91, "productId": 26, "sku": "AURORA-SPORT-BUDS-1", "size": null, "color": "Black", "price": null, "discountPrice": null, "stock": 25, "image": null, "isActive": true },
        { "id": 92, "productId": 26, "sku": "AURORA-SPORT-BUDS-2", "size": null, "color": "Blue", "price": 4699, "discountPrice": null, "stock": 15, "image": null, "isActive": true }
      ]
    }
  }
}
```

**Error — 400** (discount not below price)

```json
{ "success": false, "message": "Discount price must be lower than the original price" }
```

**Error — 400** (unknown category)

```json
{ "success": false, "message": "Selected category does not exist" }
```

**Error — 400** (validation)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "price", "message": "Price must be greater than 0" },
    { "field": "categoryId", "message": "Please select a category" }
  ]
}
```

---

### 7.5 Update product

| | |
| --- | --- |
| **API name** | Update product |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/products/:id` |
| **Auth** | Admin, or the seller who owns the product |

**Body parameters:** the same fields as *Create product*; only what is sent is changed.

> Sending `images` or `variants` **replaces** the whole set for that product. Omit them to leave them untouched.
> `sellerId` is honoured only for an admin — it is how a listing is moved between sellers.

**Request payload**

```json
{
  "price": 4299,
  "discountPrice": 2999,
  "stock": 40,
  "isFeatured": true,
  "specifications": [
    { "key": "Type", "value": "In-ear with hook" },
    { "key": "Battery", "value": "30 hours with case" }
  ]
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Product updated",
  "data": {
    "product": {
      "id": 26,
      "name": "Aurora Sport Buds",
      "slug": "aurora-sport-buds",
      "price": 4299,
      "discountPrice": 2999,
      "stock": 40,
      "isFeatured": true,
      "isActive": true,
      "specifications": [
        { "key": "Type", "value": "In-ear with hook" },
        { "key": "Battery", "value": "30 hours with case" }
      ],
      "category": { "id": 4, "name": "Headphones", "slug": "headphones", "parentId": 1 },
      "brand": { "id": 1, "name": "Aurora", "slug": "aurora" },
      "seller": { "id": 2, "name": "Sam Seller" },
      "images": [],
      "variants": []
    }
  }
}
```

**Error — 403** (one seller editing another seller's listing)

```json
{ "success": false, "message": "This product belongs to another seller" }
```

**Error — 400** (admin assigning a non-seller account)

```json
{ "success": false, "message": "Selected seller does not exist" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 7.6 Enable / disable product

| | |
| --- | --- |
| **API name** | Toggle product status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/products/:id/status` |
| **Auth** | Admin, or the owning seller |

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `isActive` | boolean | no | Omit the body entirely to flip the current value |

**Request payload**

```json
{ "isActive": false }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Product disabled",
  "data": {
    "product": {
      "id": 26,
      "name": "Aurora Sport Buds",
      "slug": "aurora-sport-buds",
      "price": 4299,
      "discountPrice": 2999,
      "stock": 40,
      "isActive": false,
      "isFeatured": true,
      "sellerId": 2,
      "updatedAt": "2026-08-12T10:12:44.000Z"
    }
  }
}
```

Enabling it again returns `"message": "Product enabled"`.

**Error — 403**

```json
{ "success": false, "message": "This product belongs to another seller" }
```

---

### 7.7 Delete product

| | |
| --- | --- |
| **API name** | Delete product |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/products/:id` |
| **Auth** | Admin, or the owning seller |

Past order lines survive the deletion — they keep their own snapshot of the product.

**Success — 200**

```json
{ "success": true, "message": "Product deleted" }
```

**Error — 403**

```json
{ "success": false, "message": "This product belongs to another seller" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

## 8. Cart — `/api/cart`

Every cart route is **customer-only** (`Authorization: Bearer {{customerToken}}`). Staff accounts get a `403`.

All seven endpoints return the **same priced cart payload**, so the client never has to re-fetch after a change:

```jsonc
{
  "cartId": 1,
  "items": [ /* priced lines, see below */ ],
  "summary": {
    "itemCount": 3,
    "subtotal": 0,          // sum of original prices
    "productDiscount": 0,   // saved by product-level discounts
    "couponDiscount": 0,    // saved by the applied coupon
    "discount": 0,          // productDiscount + couponDiscount
    "itemsTotal": 0,        // goods total after all discounts
    "deliveryCharge": 0,    // 49, or 0 at or above the free-delivery threshold
    "total": 0,             // itemsTotal + deliveryCharge
    "freeDeliveryThreshold": 500
  },
  "coupon": null,
  "couponError": null,
  "hasUnavailableItems": false
}
```

The calculation order is fixed and always done on the server: **product total → product discounts → coupon → delivery charge → final total.**

---

### 8.1 Get cart

| | |
| --- | --- |
| **API name** | Get cart |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/cart` |
| **Auth** | Customer |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `coupon` | string | Previews a coupon without committing it; an unusable code comes back in `couponError` rather than failing |

**Example:** `{{baseUrl}}/api/cart?coupon=WELCOME10`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "productId": 7,
        "variantId": null,
        "sellerId": 2,
        "product": {
          "id": 7,
          "name": "Aurora Studio Headphones",
          "slug": "aurora-studio-headphones",
          "isActive": true,
          "sellerId": 2,
          "brand": { "id": 1, "name": "Aurora", "slug": "aurora" },
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700"
        },
        "variant": null,
        "variantLabel": null,
        "originalPrice": 8999,
        "effectivePrice": 6499,
        "lineTotal": 12998,
        "availableStock": 58,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "itemsTotal": 12498,
      "deliveryCharge": 0,
      "total": 12498,
      "freeDeliveryThreshold": 500
    },
    "coupon": {
      "id": 1,
      "code": "WELCOME10",
      "description": "10% off your order, up to ₹500",
      "discountType": "percent",
      "discountValue": 10
    },
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

A line that has become unbuyable is flagged in place rather than dropped:

```json
{
  "id": 3,
  "quantity": 5,
  "productId": 6,
  "isAvailable": false,
  "availableStock": 2,
  "issues": ["Only 2 left in stock"]
}
```

**Error — 403** (signed in as an admin or seller)

```json
{ "success": false, "message": "This action is restricted to: customer." }
```

---

### 8.2 Add item to cart

| | |
| --- | --- |
| **API name** | Add to cart |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/cart/items` |
| **Auth** | Customer |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `productId` | number | yes | must exist and be active |
| `variantId` | number | conditional | **required** when the product has variants |
| `quantity` | number | no | at least 1; defaults to `1` |

Adding a product that is already in the cart tops up the existing line.

**Request payload**

```json
{
  "productId": 12,
  "variantId": 2,
  "quantity": 2
}
```

**Success — 201** — the full cart payload (as in 8.1) with `"message": "Added to cart"`.

```json
{
  "success": true,
  "message": "Added to cart",
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 4,
        "quantity": 2,
        "productId": 12,
        "variantId": 2,
        "sellerId": 2,
        "product": {
          "id": 12,
          "name": "UrbanEdge Cotton Tee",
          "slug": "urbanedge-cotton-tee",
          "isActive": true,
          "sellerId": 2,
          "brand": { "id": 4, "name": "UrbanEdge", "slug": "urbanedge" },
          "image": "https://picsum.photos/seed/urbanedge-cotton-tee-0/700/700"
        },
        "variant": { "id": 2, "size": "S", "color": "White", "sku": "URBANEDGE-COTTON-TEE-2" },
        "variantLabel": "White / S",
        "originalPrice": 999,
        "effectivePrice": 699,
        "lineTotal": 1398,
        "availableStock": 12,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotal": 1998,
      "productDiscount": 600,
      "couponDiscount": 0,
      "discount": 600,
      "itemsTotal": 1398,
      "deliveryCharge": 0,
      "total": 1398,
      "freeDeliveryThreshold": 500
    },
    "coupon": null,
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

**Error — 400** (variant product added without choosing one)

```json
{ "success": false, "message": "Please select a variant before adding this product to the cart" }
```

**Error — 400** (not enough stock)

```json
{ "success": false, "message": "Only 3 unit(s) available in stock" }
```

**Error — 400** (out of stock / disabled product / wrong variant)

```json
{ "success": false, "message": "This product is out of stock" }
```

```json
{ "success": false, "message": "This product is not available right now" }
```

```json
{ "success": false, "message": "Selected variant does not belong to this product" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 8.3 Update cart item quantity

| | |
| --- | --- |
| **API name** | Update cart item |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/cart/items/:id` |
| **Auth** | Customer |

**Path parameter:** `id` — the **cart item** id, not the product id.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `quantity` | number | yes | at least 1, and within available stock |

**Request payload**

```json
{ "quantity": 3 }
```

**Success — 200** — the recalculated cart, with `"message": "Cart updated"`.

```json
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 4,
        "quantity": 3,
        "productId": 12,
        "variantId": 2,
        "variantLabel": "White / S",
        "originalPrice": 999,
        "effectivePrice": 699,
        "lineTotal": 2097,
        "availableStock": 12,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 3,
      "subtotal": 2997,
      "productDiscount": 900,
      "couponDiscount": 0,
      "discount": 900,
      "itemsTotal": 2097,
      "deliveryCharge": 0,
      "total": 2097,
      "freeDeliveryThreshold": 500
    },
    "coupon": null,
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "quantity", "message": "Quantity must be at least 1" }]
}
```

**Error — 404**

```json
{ "success": false, "message": "Cart item not found" }
```

---

### 8.4 Remove cart item

| | |
| --- | --- |
| **API name** | Remove cart item |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/cart/items/:id` |
| **Auth** | Customer |

**Request payload:** none.

**Success — 200** — the recalculated cart.

```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "cartId": 1,
    "items": [],
    "summary": {
      "itemCount": 0,
      "subtotal": 0,
      "productDiscount": 0,
      "couponDiscount": 0,
      "discount": 0,
      "itemsTotal": 0,
      "deliveryCharge": 0,
      "total": 0,
      "freeDeliveryThreshold": 500
    },
    "coupon": null,
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Cart item not found" }
```

---

### 8.5 Clear cart

| | |
| --- | --- |
| **API name** | Clear cart |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/cart` |
| **Auth** | Customer |

**Success — 200**

```json
{
  "success": true,
  "message": "Cart cleared",
  "data": {
    "cartId": 1,
    "items": [],
    "summary": {
      "itemCount": 0,
      "subtotal": 0,
      "productDiscount": 0,
      "couponDiscount": 0,
      "discount": 0,
      "itemsTotal": 0,
      "deliveryCharge": 0,
      "total": 0,
      "freeDeliveryThreshold": 500
    },
    "coupon": null,
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

---

### 8.6 Apply coupon

| | |
| --- | --- |
| **API name** | Apply coupon |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/cart/coupon` |
| **Auth** | Customer |

Unlike the `?coupon=` preview, this validates strictly: an unusable code is an error, not a note.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `code` | string | yes | not empty; matched case-insensitively |

**Request payload**

```json
{ "code": "WELCOME10" }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Coupon WELCOME10 applied",
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "productId": 7,
        "variantId": null,
        "originalPrice": 8999,
        "effectivePrice": 6499,
        "lineTotal": 12998,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "itemsTotal": 12498,
      "deliveryCharge": 0,
      "total": 12498,
      "freeDeliveryThreshold": 500
    },
    "coupon": {
      "id": 1,
      "code": "WELCOME10",
      "description": "10% off your order, up to ₹500",
      "discountType": "percent",
      "discountValue": 10
    },
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

**Error — 400** (unknown code)

```json
{ "success": false, "message": "That coupon code is not valid" }
```

**Error — 400** (order value below the minimum)

```json
{ "success": false, "message": "This coupon needs a minimum order of ₹1000" }
```

**Error — 400** (other rejection reasons)

```json
{ "success": false, "message": "This coupon has expired" }
```

```json
{ "success": false, "message": "This coupon has reached its usage limit" }
```

```json
{ "success": false, "message": "This coupon is no longer active" }
```

```json
{ "success": false, "message": "This coupon is not active yet" }
```

---

### 8.7 Move a wishlist item into the cart

| | |
| --- | --- |
| **API name** | Move from wishlist to cart |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/cart/move-from-wishlist` |
| **Auth** | Customer |

The product is added to the cart and removed from the wishlist in one call.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `productId` | number | yes | must already be in the wishlist |
| `variantId` | number | conditional | required when the product has variants |
| `quantity` | number | no | defaults to `1` |

**Request payload**

```json
{
  "productId": 10,
  "quantity": 1
}
```

**Success — 200** — the recalculated cart, with `"message": "Moved to cart"`.

```json
{
  "success": true,
  "message": "Moved to cart",
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 6,
        "quantity": 1,
        "productId": 10,
        "variantId": null,
        "sellerId": 3,
        "product": {
          "id": 10,
          "name": "Zenith Watch Series 6",
          "slug": "zenith-watch-series-6",
          "isActive": true,
          "sellerId": 3,
          "brand": { "id": 3, "name": "Zenith", "slug": "zenith" },
          "image": "https://picsum.photos/seed/zenith-watch-series-6-0/700/700"
        },
        "variant": null,
        "variantLabel": null,
        "originalPrice": 21999,
        "effectivePrice": 18999,
        "lineTotal": 18999,
        "availableStock": 20,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 1,
      "subtotal": 21999,
      "productDiscount": 3000,
      "couponDiscount": 0,
      "discount": 3000,
      "itemsTotal": 18999,
      "deliveryCharge": 0,
      "total": 18999,
      "freeDeliveryThreshold": 500
    },
    "coupon": null,
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

**Error — 404** (not in the wishlist)

```json
{ "success": false, "message": "This product is not in your wishlist" }
```

---

## 9. Wishlist — `/api/wishlist`

Customer-only.

### 9.1 Get wishlist

| | |
| --- | --- |
| **API name** | Get wishlist |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/wishlist` |
| **Auth** | Customer |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "addedAt": "2026-08-12T08:05:00.000Z",
        "product": {
          "id": 10,
          "name": "Zenith Watch Series 6",
          "slug": "zenith-watch-series-6",
          "price": 21999,
          "discountPrice": 18999,
          "stock": 20,
          "isActive": true,
          "rating": 4.2,
          "category": { "id": 5, "name": "Smart Watches", "slug": "smart-watches", "parentId": 1 },
          "brand": { "id": 3, "name": "Zenith", "slug": "zenith" },
          "seller": { "id": 3, "name": "Priya Traders" },
          "images": [
            {
              "id": 28,
              "productId": 10,
              "url": "https://picsum.photos/seed/zenith-watch-series-6-0/700/700",
              "alt": "Zenith Watch Series 6 image 1",
              "isPrimary": true,
              "sortOrder": 0
            }
          ],
          "variants": []
        }
      }
    ],
    "productIds": [10]
  }
}
```

`productIds` is what the storefront uses to fill in the heart icon on product cards.

---

### 9.2 Add to wishlist

| | |
| --- | --- |
| **API name** | Add to wishlist |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/wishlist` |
| **Auth** | Customer |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `productId` | number | yes | must exist and be active |

**Request payload**

```json
{ "productId": 14 }
```

**Success — 201**

```json
{
  "success": true,
  "message": "Added to wishlist",
  "data": { "productIds": [10, 14] }
}
```

**Error — 409** (already saved — a unique index backs this, not just the check)

```json
{ "success": false, "message": "This product is already in your wishlist" }
```

**Error — 400**

```json
{ "success": false, "message": "This product is not available right now" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 9.3 Remove from wishlist

| | |
| --- | --- |
| **API name** | Remove from wishlist |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/wishlist/:productId` |
| **Auth** | Customer |

**Path parameter:** `productId` — the **product** id, not the wishlist row id.

**Success — 200**

```json
{
  "success": true,
  "message": "Removed from wishlist",
  "data": { "productIds": [10] }
}
```

**Error — 404**

```json
{ "success": false, "message": "This product is not in your wishlist" }
```

---

### 9.4 Clear wishlist

| | |
| --- | --- |
| **API name** | Clear wishlist |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/wishlist` |
| **Auth** | Customer |

**Success — 200**

```json
{
  "success": true,
  "message": "Wishlist cleared",
  "data": { "productIds": [] }
}
```

---

## 10. Addresses — `/api/addresses`

Customer-only. Exactly one address is the default at all times: the first one saved becomes the default automatically, and deleting the default promotes another.

### 10.1 List addresses

| | |
| --- | --- |
| **API name** | List addresses |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/addresses` |
| **Auth** | Customer |

**Success — 200** (the default first)

```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": 1,
        "userId": 4,
        "label": "home",
        "fullName": "Riya Customer",
        "phone": "9000000003",
        "addressLine1": "42 Lakeview Residency",
        "addressLine2": "Anna Nagar",
        "landmark": "Opposite the city library",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postalCode": "600040",
        "country": "India",
        "isDefault": true,
        "createdAt": "2026-08-12T08:04:00.000Z",
        "updatedAt": "2026-08-12T08:04:00.000Z"
      },
      {
        "id": 2,
        "userId": 4,
        "label": "work",
        "fullName": "Riya Customer",
        "phone": "9000000003",
        "addressLine1": "Tech Park, Tower B, 7th Floor",
        "addressLine2": null,
        "landmark": null,
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postalCode": "600113",
        "country": "India",
        "isDefault": false
      }
    ]
  }
}
```

---

### 10.2 Get one address

| | |
| --- | --- |
| **API name** | Get address |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/addresses/:id` |
| **Auth** | Customer (own addresses only) |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "address": {
      "id": 1,
      "userId": 4,
      "label": "home",
      "fullName": "Riya Customer",
      "phone": "9000000003",
      "addressLine1": "42 Lakeview Residency",
      "addressLine2": "Anna Nagar",
      "landmark": "Opposite the city library",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "postalCode": "600040",
      "country": "India",
      "isDefault": true
    }
  }
}
```

**Error — 404** (unknown id, or someone else's address)

```json
{ "success": false, "message": "Address not found" }
```

---

### 10.3 Add address

| | |
| --- | --- |
| **API name** | Add address |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/addresses` |
| **Auth** | Customer |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `fullName` | string | yes | min 2 characters |
| `phone` | string | yes | 7–20 chars, digits and `+ - ( ) space` |
| `addressLine1` | string | yes | min 3 characters |
| `city` | string | yes | not empty |
| `state` | string | yes | not empty |
| `postalCode` | string | yes | 4–12 chars, letters/digits/space/hyphen |
| `label` | string | no | `home` (default), `work`, `other` |
| `addressLine2` | string | no | |
| `landmark` | string | no | |
| `country` | string | no | defaults to `India` |
| `isDefault` | boolean | no | making this the default clears the flag on the others |

**Request payload**

```json
{
  "label": "work",
  "fullName": "Riya Customer",
  "phone": "9000000003",
  "addressLine1": "18 Marina Heights",
  "addressLine2": "Second Avenue",
  "landmark": "Next to the metro station",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "postalCode": "600028",
  "country": "India",
  "isDefault": true
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Address added",
  "data": {
    "address": {
      "id": 3,
      "userId": 4,
      "label": "work",
      "fullName": "Riya Customer",
      "phone": "9000000003",
      "addressLine1": "18 Marina Heights",
      "addressLine2": "Second Avenue",
      "landmark": "Next to the metro station",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "postalCode": "600028",
      "country": "India",
      "isDefault": true,
      "createdAt": "2026-08-12T10:30:00.000Z",
      "updatedAt": "2026-08-12T10:30:00.000Z"
    }
  }
}
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "phone", "message": "Enter a valid phone number" },
    { "field": "postalCode", "message": "Enter a valid postal code" }
  ]
}
```

---

### 10.4 Edit address

| | |
| --- | --- |
| **API name** | Update address |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/addresses/:id` |
| **Auth** | Customer (own addresses only) |

**Body parameters:** any of `label`, `fullName`, `phone`, `addressLine1`, `addressLine2`, `landmark`, `city`, `state`, `postalCode`, `country`, plus `isDefault: true` to promote it.

**Request payload**

```json
{
  "landmark": "Beside the community hall",
  "postalCode": "600029",
  "isDefault": true
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Address updated",
  "data": {
    "address": {
      "id": 3,
      "userId": 4,
      "label": "work",
      "fullName": "Riya Customer",
      "phone": "9000000003",
      "addressLine1": "18 Marina Heights",
      "addressLine2": "Second Avenue",
      "landmark": "Beside the community hall",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "postalCode": "600029",
      "country": "India",
      "isDefault": true,
      "updatedAt": "2026-08-12T10:35:00.000Z"
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Address not found" }
```

---

### 10.5 Set default address

| | |
| --- | --- |
| **API name** | Set default address |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/addresses/:id/default` |
| **Auth** | Customer |

**Request payload:** none.

**Success — 200** — the whole address book comes back, default first.

```json
{
  "success": true,
  "message": "Default address updated",
  "data": {
    "addresses": [
      { "id": 2, "label": "work", "fullName": "Riya Customer", "city": "Chennai", "postalCode": "600113", "isDefault": true },
      { "id": 1, "label": "home", "fullName": "Riya Customer", "city": "Chennai", "postalCode": "600040", "isDefault": false }
    ]
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Address not found" }
```

---

### 10.6 Delete address

| | |
| --- | --- |
| **API name** | Delete address |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/addresses/:id` |
| **Auth** | Customer |

**Success — 200**

```json
{ "success": true, "message": "Address deleted" }
```

**Error — 404**

```json
{ "success": false, "message": "Address not found" }
```

---

## 11. Payment methods — `/api/payment-methods`

Cash is **permanent**: the API refuses to disable or delete it, so there is always at least one way to pay. `settlesImmediately` decides the payment status an order gets: `true` → `paid` on placement, `false` → `pending` until delivery.

### 11.1 List payment methods

| | |
| --- | --- |
| **API name** | List payment methods |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/payment-methods` |
| **Auth** | Public (optional auth) |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `includeInactive` | `true` | **Admin only** — customers only ever receive active methods |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "id": 1,
        "name": "Cash on Delivery",
        "code": "cash",
        "description": "Pay in cash when your order arrives",
        "instructions": "Please keep the exact amount ready for the delivery partner.",
        "icon": null,
        "isActive": true,
        "isPermanent": true,
        "settlesImmediately": false,
        "sortOrder": 0
      },
      {
        "id": 2,
        "name": "Google Pay",
        "code": "gpay",
        "description": "Pay instantly with Google Pay",
        "instructions": "You will be marked as paid once the order is placed.",
        "icon": null,
        "isActive": true,
        "isPermanent": false,
        "settlesImmediately": true,
        "sortOrder": 1
      },
      {
        "id": 3,
        "name": "PhonePe",
        "code": "phonepe",
        "description": "Pay instantly with PhonePe",
        "instructions": "You will be marked as paid once the order is placed.",
        "icon": null,
        "isActive": true,
        "isPermanent": false,
        "settlesImmediately": true,
        "sortOrder": 2
      }
    ]
  }
}
```

With `?includeInactive=true` as an admin, the disabled seeded UPI method appears too:

```json
{
  "id": 4,
  "name": "UPI",
  "code": "upi",
  "description": "Pay using any UPI app",
  "instructions": "You will be marked as paid once the order is placed.",
  "icon": null,
  "isActive": false,
  "isPermanent": false,
  "settlesImmediately": true,
  "sortOrder": 3
}
```

---

### 11.2 Add payment method

| | |
| --- | --- |
| **API name** | Create payment method |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/payment-methods` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | min 2 characters |
| `code` | string | no | letters, numbers, spaces, hyphens, underscores; lower-cased and spaces become `_`. Defaults to the name. |
| `description` | string | no | |
| `instructions` | string | no | shown under the option at checkout |
| `icon` | string | no | image URL |
| `isActive` | boolean | no | defaults to `true` |
| `settlesImmediately` | boolean | no | defaults to `true` |
| `sortOrder` | number | no | defaults to `0` |

**Request payload**

```json
{
  "name": "Net Banking",
  "code": "netbanking",
  "description": "Pay from your bank account",
  "instructions": "You will be marked as paid once the order is placed.",
  "isActive": true,
  "settlesImmediately": true,
  "sortOrder": 4
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Payment method created",
  "data": {
    "paymentMethod": {
      "id": 5,
      "name": "Net Banking",
      "code": "netbanking",
      "description": "Pay from your bank account",
      "instructions": "You will be marked as paid once the order is placed.",
      "icon": null,
      "isActive": true,
      "isPermanent": false,
      "settlesImmediately": true,
      "sortOrder": 4
    }
  }
}
```

**Error — 409** (code already used)

```json
{ "success": false, "message": "A payment method with this code already exists" }
```

**Error — 409** (trying to add a second cash method)

```json
{ "success": false, "message": "A cash payment method already exists" }
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "code", "message": "Code may only contain letters, numbers, spaces, hyphens and underscores" }]
}
```

---

### 11.3 Edit payment method

| | |
| --- | --- |
| **API name** | Update payment method |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/payment-methods/:id` |
| **Auth** | Admin |

**Body parameters:** any of `name`, `code`, `description`, `instructions`, `icon`, `isActive`, `settlesImmediately`, `sortOrder`.

**Request payload**

```json
{
  "name": "Net Banking (all banks)",
  "instructions": "Choose your bank on the next screen.",
  "sortOrder": 3
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Payment method updated",
  "data": {
    "paymentMethod": {
      "id": 5,
      "name": "Net Banking (all banks)",
      "code": "netbanking",
      "description": "Pay from your bank account",
      "instructions": "Choose your bank on the next screen.",
      "icon": null,
      "isActive": true,
      "isPermanent": false,
      "settlesImmediately": true,
      "sortOrder": 3
    }
  }
}
```

**Error — 400** (attempting to disable cash)

```json
{ "success": false, "message": "Cash is always available and cannot be disabled" }
```

**Error — 400** (attempting to rename the cash code)

```json
{ "success": false, "message": "The cash payment method code cannot be changed" }
```

**Error — 404**

```json
{ "success": false, "message": "Payment method not found" }
```

---

### 11.4 Enable / disable payment method

| | |
| --- | --- |
| **API name** | Toggle payment method |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/payment-methods/:id/status` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `isActive` | boolean | no | omit the body to flip the current value |

**Request payload**

```json
{ "isActive": false }
```

**Success — 200**

```json
{
  "success": true,
  "message": "PhonePe disabled",
  "data": {
    "paymentMethod": {
      "id": 3,
      "name": "PhonePe",
      "code": "phonepe",
      "description": "Pay instantly with PhonePe",
      "instructions": "You will be marked as paid once the order is placed.",
      "icon": null,
      "isActive": false,
      "isPermanent": false,
      "settlesImmediately": true,
      "sortOrder": 2
    }
  }
}
```

Disabling a method removes it from checkout on the customer's next load. Enabling returns `"<name> enabled"`.

**Error — 400** (cash)

```json
{ "success": false, "message": "Cash is always available and cannot be disabled" }
```

---

### 11.5 Delete payment method

| | |
| --- | --- |
| **API name** | Delete payment method |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/payment-methods/:id` |
| **Auth** | Admin |

**Success — 200**

```json
{ "success": true, "message": "Payment method deleted" }
```

**Error — 400** (cash is permanent)

```json
{ "success": false, "message": "Cash is a permanent payment method and cannot be deleted" }
```

**Error — 400** (already used by orders)

```json
{ "success": false, "message": "38 order(s) used this method. Disable it instead of deleting it." }
```

---

## 12. Coupons — `/api/coupons`

Admin-only. Coupons are validated when applied to the cart **and** again when the order is placed.

### 12.1 List coupons

| | |
| --- | --- |
| **API name** | List coupons |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/coupons` |
| **Auth** | Admin |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": 1,
        "code": "WELCOME10",
        "description": "10% off your order, up to ₹500",
        "discountType": "percent",
        "discountValue": 10,
        "minOrderValue": 1000,
        "maxDiscount": 500,
        "startsAt": null,
        "expiresAt": null,
        "usageLimit": null,
        "usedCount": 0,
        "isActive": true,
        "createdAt": "2026-08-12T08:06:00.000Z",
        "updatedAt": "2026-08-12T08:06:00.000Z"
      },
      {
        "id": 2,
        "code": "FLAT200",
        "description": "₹200 off orders above ₹2,000",
        "discountType": "fixed",
        "discountValue": 200,
        "minOrderValue": 2000,
        "maxDiscount": null,
        "startsAt": null,
        "expiresAt": null,
        "usageLimit": null,
        "usedCount": 0,
        "isActive": true
      }
    ]
  }
}
```

---

### 12.2 Create coupon

| | |
| --- | --- |
| **API name** | Create coupon |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/coupons` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `code` | string | yes | 3–40 characters, stored upper-cased, must be unique |
| `discountValue` | number | yes | greater than 0; a percentage may not exceed 100 |
| `discountType` | string | no | `percent` (default) or `fixed` |
| `description` | string | no | |
| `minOrderValue` | number | no | defaults to `0` |
| `maxDiscount` | number | no | caps a percentage coupon |
| `startsAt` | date | no | ISO date-time |
| `expiresAt` | date | no | ISO date-time |
| `usageLimit` | number | no | total redemptions allowed |
| `isActive` | boolean | no | defaults to `true` |

**Request payload**

```json
{
  "code": "FESTIVE15",
  "description": "15% off the festive sale, up to ₹750",
  "discountType": "percent",
  "discountValue": 15,
  "minOrderValue": 1500,
  "maxDiscount": 750,
  "startsAt": "2026-09-01T00:00:00.000Z",
  "expiresAt": "2026-09-30T23:59:59.000Z",
  "usageLimit": 500,
  "isActive": true
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Coupon created",
  "data": {
    "coupon": {
      "id": 4,
      "code": "FESTIVE15",
      "description": "15% off the festive sale, up to ₹750",
      "discountType": "percent",
      "discountValue": 15,
      "minOrderValue": 1500,
      "maxDiscount": 750,
      "startsAt": "2026-09-01T00:00:00.000Z",
      "expiresAt": "2026-09-30T23:59:59.000Z",
      "usageLimit": 500,
      "usedCount": 0,
      "isActive": true,
      "createdAt": "2026-08-12T10:50:00.000Z",
      "updatedAt": "2026-08-12T10:50:00.000Z"
    }
  }
}
```

**Error — 409**

```json
{ "success": false, "message": "A coupon with this code already exists" }
```

**Error — 400**

```json
{ "success": false, "message": "A percentage discount cannot exceed 100" }
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "code", "message": "Coupon code is required" },
    { "field": "discountValue", "message": "Discount value must be greater than 0" }
  ]
}
```

---

### 12.3 Update coupon

| | |
| --- | --- |
| **API name** | Update coupon |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/coupons/:id` |
| **Auth** | Admin |

**Body parameters:** any of `code`, `description`, `discountType`, `discountValue`, `minOrderValue`, `maxDiscount`, `startsAt`, `expiresAt`, `usageLimit`, `isActive`.

**Request payload**

```json
{
  "usageLimit": 1000,
  "maxDiscount": 900,
  "isActive": false
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Coupon updated",
  "data": {
    "coupon": {
      "id": 4,
      "code": "FESTIVE15",
      "description": "15% off the festive sale, up to ₹750",
      "discountType": "percent",
      "discountValue": 15,
      "minOrderValue": 1500,
      "maxDiscount": 900,
      "usageLimit": 1000,
      "usedCount": 0,
      "isActive": false,
      "updatedAt": "2026-08-12T10:55:00.000Z"
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Coupon not found" }
```

---

### 12.4 Delete coupon

| | |
| --- | --- |
| **API name** | Delete coupon |
| **Method** | `DELETE` |
| **Endpoint** | `{{baseUrl}}/api/coupons/:id` |
| **Auth** | Admin |

**Success — 200**

```json
{ "success": true, "message": "Coupon deleted" }
```

**Error — 400** (already redeemed)

```json
{ "success": false, "message": "6 order(s) used this coupon. Deactivate it instead of deleting it." }
```

---

## 13. Checkout and customer orders — `/api/orders`

Customer-only. Placing an order runs in one transaction that locks the stock rows (`SELECT … FOR UPDATE`), re-checks them, decrements stock, snapshots the address, payment method and every line, and empties the cart.

**Order statuses:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`
**Payment statuses:** `pending`, `paid`, `failed`, `refunded`
**Order sources:** `customer`, `seller`

### 13.1 Checkout summary

| | |
| --- | --- |
| **API name** | Get checkout summary |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/orders/checkout-summary` |
| **Auth** | Customer |

Everything the review screen needs — priced cart, address book and the payment methods currently offered — all priced by the server.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `coupon` | string | Previews a coupon on the summary |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "cartId": 1,
    "items": [
      {
        "id": 1,
        "quantity": 2,
        "productId": 7,
        "variantId": null,
        "sellerId": 2,
        "product": {
          "id": 7,
          "name": "Aurora Studio Headphones",
          "slug": "aurora-studio-headphones",
          "isActive": true,
          "sellerId": 2,
          "brand": { "id": 1, "name": "Aurora", "slug": "aurora" },
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700"
        },
        "variant": null,
        "variantLabel": null,
        "originalPrice": 8999,
        "effectivePrice": 6499,
        "lineTotal": 12998,
        "availableStock": 58,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "itemsTotal": 12498,
      "deliveryCharge": 0,
      "total": 12498,
      "freeDeliveryThreshold": 500
    },
    "coupon": {
      "id": 1,
      "code": "WELCOME10",
      "description": "10% off your order, up to ₹500",
      "discountType": "percent",
      "discountValue": 10
    },
    "couponError": null,
    "hasUnavailableItems": false,
    "addresses": [
      {
        "id": 1,
        "userId": 4,
        "label": "home",
        "fullName": "Riya Customer",
        "phone": "9000000003",
        "addressLine1": "42 Lakeview Residency",
        "addressLine2": "Anna Nagar",
        "landmark": "Opposite the city library",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postalCode": "600040",
        "country": "India",
        "isDefault": true
      }
    ],
    "paymentMethods": [
      {
        "id": 1,
        "name": "Cash on Delivery",
        "code": "cash",
        "description": "Pay in cash when your order arrives",
        "instructions": "Please keep the exact amount ready for the delivery partner.",
        "icon": null,
        "isActive": true,
        "isPermanent": true,
        "settlesImmediately": false,
        "sortOrder": 0
      },
      {
        "id": 2,
        "name": "Google Pay",
        "code": "gpay",
        "description": "Pay instantly with Google Pay",
        "instructions": "You will be marked as paid once the order is placed.",
        "icon": null,
        "isActive": true,
        "isPermanent": false,
        "settlesImmediately": true,
        "sortOrder": 1
      }
    ],
    "canPlaceOrder": true
  }
}
```

`canPlaceOrder` is `false` when the cart is empty, an item is unavailable, or the customer has no saved address.

---

### 13.2 Place order

| | |
| --- | --- |
| **API name** | Place order |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/orders` |
| **Auth** | Customer |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `addressId` | number | yes | must be one of the customer's own addresses |
| `paymentMethodId` | number | conditional | an **active** method; send this or `paymentMethodCode` |
| `paymentMethodCode` | string | conditional | e.g. `cash`, `gpay`, `phonepe` |
| `couponCode` | string | no | re-validated here; an unusable code fails the request |
| `customerNote` | string | no | max 500 characters |

The client's totals are ignored — the cart is re-priced from the database.

**Request payload**

```json
{
  "addressId": 1,
  "paymentMethodId": 2,
  "couponCode": "WELCOME10",
  "customerNote": "Please deliver after 6 pm."
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Order ORD-20260812-00221 placed successfully",
  "data": {
    "order": {
      "id": 221,
      "orderNumber": "ORD-20260812-00221",
      "userId": 4,
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "deliveryCharge": 0,
      "total": 12498,
      "couponId": 1,
      "couponCode": "WELCOME10",
      "paymentMethodId": 2,
      "paymentMethodCode": "gpay",
      "paymentMethodName": "Google Pay",
      "paymentStatus": "paid",
      "status": "pending",
      "orderSource": "customer",
      "createdById": null,
      "addressId": 1,
      "shippingFullName": "Riya Customer",
      "shippingPhone": "9000000003",
      "shippingAddressLine1": "42 Lakeview Residency",
      "shippingAddressLine2": "Anna Nagar",
      "shippingLandmark": "Opposite the city library",
      "shippingCity": "Chennai",
      "shippingState": "Tamil Nadu",
      "shippingPostalCode": "600040",
      "shippingCountry": "India",
      "customerNote": "Please deliver after 6 pm.",
      "cancelReason": null,
      "placedAt": "2026-08-12T11:02:15.000Z",
      "confirmedAt": null,
      "shippedAt": null,
      "deliveredAt": null,
      "cancelledAt": null,
      "createdAt": "2026-08-12T11:02:15.000Z",
      "updatedAt": "2026-08-12T11:02:15.000Z",
      "items": [
        {
          "id": 480,
          "orderId": 221,
          "productId": 7,
          "variantId": null,
          "sellerId": 2,
          "productName": "Aurora Studio Headphones",
          "productSlug": "aurora-studio-headphones",
          "brandName": "Aurora",
          "variantLabel": null,
          "sku": null,
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700",
          "originalPrice": 8999,
          "unitPrice": 6499,
          "quantity": 2,
          "lineTotal": 12998
        }
      ],
      "statusHistory": [
        {
          "id": 460,
          "orderId": 221,
          "status": "pending",
          "note": "Order placed",
          "changedById": 4,
          "createdAt": "2026-08-12T11:02:15.000Z",
          "changedBy": { "id": 4, "name": "Riya Customer", "role": "customer" }
        }
      ],
      "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
      "coupon": { "id": 1, "code": "WELCOME10", "discountType": "percent", "discountValue": 10 },
      "canBeCancelledByCustomer": true
    }
  }
}
```

Paying with `cash` instead records `"paymentStatus": "pending"` — it is settled automatically when the order is marked delivered.

**Error — 400** (empty cart)

```json
{ "success": false, "message": "Your cart is empty" }
```

**Error — 400** (an item went out of stock while the customer was on the page)

```json
{ "success": false, "message": "Some items in your cart are unavailable. Please review your cart before ordering." }
```

**Error — 400** (lost the race for the last unit)

```json
{ "success": false, "message": "Only 1 unit(s) of Vertex Ultrabook 14 left in stock" }
```

**Error — 400** (bad address or payment method)

```json
{ "success": false, "message": "Please select a valid delivery address" }
```

```json
{ "success": false, "message": "Please select an available payment method" }
```

**Error — 400** (coupon no longer usable)

```json
{ "success": false, "message": "This coupon has expired" }
```

**Error — 400** (validation)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "addressId", "message": "Please select a delivery address" }]
}
```

---

### 13.3 Order history

| | |
| --- | --- |
| **API name** | List my orders |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/orders` |
| **Auth** | Customer |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `status` | enum | One of the six order statuses |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `10`, capped at `50` |

**Example:** `{{baseUrl}}/api/orders?status=delivered&page=1&limit=10`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "userId": 4,
        "subtotal": 17998,
        "productDiscount": 5000,
        "couponDiscount": 500,
        "discount": 5500,
        "deliveryCharge": 0,
        "total": 12498,
        "couponCode": "WELCOME10",
        "paymentMethodCode": "gpay",
        "paymentMethodName": "Google Pay",
        "paymentStatus": "paid",
        "status": "pending",
        "orderSource": "customer",
        "shippingFullName": "Riya Customer",
        "shippingCity": "Chennai",
        "shippingPostalCode": "600040",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "items": [
          {
            "id": 480,
            "orderId": 221,
            "productId": 7,
            "productName": "Aurora Studio Headphones",
            "brandName": "Aurora",
            "variantLabel": null,
            "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700",
            "originalPrice": 8999,
            "unitPrice": 6499,
            "quantity": 2,
            "lineTotal": 12998
          }
        ],
        "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
        "canBeCancelledByCustomer": true
      }
    ],
    "pagination": { "total": 14, "page": 1, "limit": 10, "totalPages": 2 }
  }
}
```

---

### 13.4 Order details and tracking

| | |
| --- | --- |
| **API name** | Get my order |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/orders/:idOrNumber` |
| **Auth** | Customer (own orders only) |

**Path parameter:** the numeric id (`221`) or the order number (`ORD-20260812-00221`).

**Success — 200** — the full order, including the tracking timeline drawn from the recorded status history.

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 221,
      "orderNumber": "ORD-20260812-00221",
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "deliveryCharge": 0,
      "total": 12498,
      "couponCode": "WELCOME10",
      "paymentMethodCode": "gpay",
      "paymentMethodName": "Google Pay",
      "paymentStatus": "paid",
      "status": "shipped",
      "orderSource": "customer",
      "shippingFullName": "Riya Customer",
      "shippingPhone": "9000000003",
      "shippingAddressLine1": "42 Lakeview Residency",
      "shippingAddressLine2": "Anna Nagar",
      "shippingLandmark": "Opposite the city library",
      "shippingCity": "Chennai",
      "shippingState": "Tamil Nadu",
      "shippingPostalCode": "600040",
      "shippingCountry": "India",
      "customerNote": "Please deliver after 6 pm.",
      "cancelReason": null,
      "placedAt": "2026-08-12T11:02:15.000Z",
      "confirmedAt": "2026-08-12T13:40:00.000Z",
      "shippedAt": "2026-08-13T09:15:00.000Z",
      "deliveredAt": null,
      "cancelledAt": null,
      "items": [
        {
          "id": 480,
          "productId": 7,
          "variantId": null,
          "sellerId": 2,
          "productName": "Aurora Studio Headphones",
          "productSlug": "aurora-studio-headphones",
          "brandName": "Aurora",
          "variantLabel": null,
          "sku": null,
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700",
          "originalPrice": 8999,
          "unitPrice": 6499,
          "quantity": 2,
          "lineTotal": 12998
        }
      ],
      "statusHistory": [
        {
          "id": 460,
          "status": "pending",
          "note": "Order placed",
          "changedById": 4,
          "createdAt": "2026-08-12T11:02:15.000Z",
          "changedBy": { "id": 4, "name": "Riya Customer", "role": "customer" }
        },
        {
          "id": 461,
          "status": "confirmed",
          "note": null,
          "changedById": 1,
          "createdAt": "2026-08-12T13:40:00.000Z",
          "changedBy": { "id": 1, "name": "Site Admin", "role": "admin" }
        },
        {
          "id": 462,
          "status": "shipped",
          "note": "Handed to the courier",
          "changedById": 1,
          "createdAt": "2026-08-13T09:15:00.000Z",
          "changedBy": { "id": 1, "name": "Site Admin", "role": "admin" }
        }
      ],
      "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
      "coupon": { "id": 1, "code": "WELCOME10", "discountType": "percent", "discountValue": 10 },
      "canBeCancelledByCustomer": false
    }
  }
}
```

**Error — 404** (unknown, or another customer's order)

```json
{ "success": false, "message": "Order not found" }
```

---

### 13.5 Cancel my order

| | |
| --- | --- |
| **API name** | Cancel order |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/orders/:id/cancel` |
| **Auth** | Customer |

Allowed only while the order is `pending` or `confirmed`. Cancelling puts the reserved stock back on sale and refunds an already-settled payment.

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `reason` | string | no | defaults to `Cancelled by customer` |

**Request payload**

```json
{ "reason": "Ordered the wrong colour" }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Order cancelled",
  "data": {
    "order": {
      "id": 221,
      "orderNumber": "ORD-20260812-00221",
      "status": "cancelled",
      "paymentStatus": "refunded",
      "cancelReason": "Ordered the wrong colour",
      "cancelledAt": "2026-08-12T12:10:00.000Z",
      "total": 12498,
      "items": [
        {
          "id": 480,
          "productName": "Aurora Studio Headphones",
          "quantity": 2,
          "unitPrice": 6499,
          "lineTotal": 12998
        }
      ],
      "statusHistory": [
        { "id": 460, "status": "pending", "note": "Order placed", "createdAt": "2026-08-12T11:02:15.000Z" },
        { "id": 463, "status": "cancelled", "note": "Ordered the wrong colour", "createdAt": "2026-08-12T12:10:00.000Z" }
      ],
      "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
      "canBeCancelledByCustomer": false
    }
  }
}
```

**Error — 400** (too late to cancel online)

```json
{ "success": false, "message": "This order is already shipped and can no longer be cancelled online. Please contact support." }
```

**Error — 400** (already cancelled)

```json
{ "success": false, "message": "This order is already cancelled" }
```

**Error — 404**

```json
{ "success": false, "message": "Order not found" }
```

---

## 14. Admin order management — `/api/admin/orders`

Admin-only. Covers every order regardless of origin. Status moves are validated server-side: an order cannot skip steps, and `delivered` / `cancelled` are terminal.

**Allowed transitions:** `pending → confirmed → processing → shipped → delivered`, plus `cancelled` from any live status.

### 14.1 List all orders

| | |
| --- | --- |
| **API name** | Admin list orders |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/orders` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Order number, shipping name, shipping phone, customer name or email |
| `status` | enum | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` |
| `paymentStatus` | enum | `pending`, `paid`, `failed`, `refunded` |
| `paymentMethod` | string | The method **code**, e.g. `cash` |
| `source` | enum | `customer` or `seller` |
| `sellerId` | number | Orders containing that seller's lines |
| `customerId` | number | Orders for one customer |
| `from` / `to` | `YYYY-MM-DD` | Date range on `placedAt` |
| `sort` | enum | `newest` (default), `oldest`, `total_desc`, `total_asc` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `15`, capped at `100` |

**Example**

```
{{baseUrl}}/api/admin/orders?q=ORD-2026&status=pending&source=seller&sellerId=2&from=2026-07-01&to=2026-08-12&sort=total_desc&page=1&limit=15
```

**Success — 200**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 219,
        "orderNumber": "ORD-20260811-00219",
        "userId": 6,
        "subtotal": 12999,
        "productDiscount": 2500,
        "couponDiscount": 0,
        "discount": 2500,
        "deliveryCharge": 0,
        "total": 10499,
        "paymentMethodCode": "cash",
        "paymentMethodName": "Cash on Delivery",
        "paymentStatus": "pending",
        "status": "pending",
        "orderSource": "seller",
        "createdById": 3,
        "shippingFullName": "Neha Kapoor",
        "shippingPhone": "9000000011",
        "shippingCity": "Chennai",
        "shippingState": "Tamil Nadu",
        "shippingPostalCode": "600040",
        "placedAt": "2026-08-11T14:22:00.000Z",
        "customer": { "id": 6, "name": "Neha Kapoor", "email": "neha@shop.com", "phone": "9000000011" },
        "items": [
          {
            "id": 476,
            "orderId": 219,
            "productId": 22,
            "sellerId": 3,
            "productName": "PeakForm Adjustable Dumbbells",
            "brandName": "PeakForm",
            "variantLabel": null,
            "originalPrice": 12999,
            "unitPrice": 10499,
            "quantity": 1,
            "lineTotal": 10499
          }
        ],
        "paymentMethod": { "id": 1, "name": "Cash on Delivery", "code": "cash" },
        "canBeCancelledByCustomer": true,
        "allowedNextStatuses": ["confirmed", "cancelled"]
      }
    ],
    "pagination": { "total": 42, "page": 1, "limit": 15, "totalPages": 3 }
  }
}
```

---

### 14.2 Order statistics

| | |
| --- | --- |
| **API name** | Admin order stats |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/orders/stats` |
| **Auth** | Admin |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "byStatus": {
      "pending": 27,
      "confirmed": 18,
      "processing": 17,
      "shipped": 22,
      "delivered": 114,
      "cancelled": 22
    },
    "byPaymentMethod": {
      "cash": 74,
      "gpay": 78,
      "phonepe": 68
    },
    "bySource": {
      "customer": 181,
      "seller": 39
    },
    "orderCount": 198,
    "revenue": 3874521.5
  }
}
```

---

### 14.3 Get one order (admin view)

| | |
| --- | --- |
| **API name** | Admin get order |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/orders/:id` |
| **Auth** | Admin |

The admin view names the seller behind each line, the customer, the saved address and — for a direct order — the seller who raised it.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 219,
      "orderNumber": "ORD-20260811-00219",
      "userId": 6,
      "subtotal": 12999,
      "productDiscount": 2500,
      "couponDiscount": 0,
      "discount": 2500,
      "deliveryCharge": 0,
      "total": 10499,
      "couponId": null,
      "couponCode": null,
      "paymentMethodId": 1,
      "paymentMethodCode": "cash",
      "paymentMethodName": "Cash on Delivery",
      "paymentStatus": "pending",
      "status": "pending",
      "orderSource": "seller",
      "createdById": 3,
      "addressId": null,
      "shippingFullName": "Neha Kapoor",
      "shippingPhone": "9000000011",
      "shippingAddressLine1": "42 Lakeview Residency",
      "shippingAddressLine2": "Anna Nagar",
      "shippingLandmark": "Opposite the city library",
      "shippingCity": "Chennai",
      "shippingState": "Tamil Nadu",
      "shippingPostalCode": "600040",
      "shippingCountry": "India",
      "customerNote": null,
      "cancelReason": null,
      "placedAt": "2026-08-11T14:22:00.000Z",
      "items": [
        {
          "id": 476,
          "orderId": 219,
          "productId": 22,
          "variantId": null,
          "sellerId": 3,
          "productName": "PeakForm Adjustable Dumbbells",
          "productSlug": "peakform-adjustable-dumbbells",
          "brandName": "PeakForm",
          "variantLabel": null,
          "sku": null,
          "image": "https://picsum.photos/seed/peakform-adjustable-dumbb-0/700/700",
          "originalPrice": 12999,
          "unitPrice": 10499,
          "quantity": 1,
          "lineTotal": 10499,
          "seller": { "id": 3, "name": "Priya Traders" }
        }
      ],
      "statusHistory": [
        {
          "id": 455,
          "status": "pending",
          "note": "Order created by Priya Traders",
          "changedById": 3,
          "createdAt": "2026-08-11T14:22:00.000Z",
          "changedBy": { "id": 3, "name": "Priya Traders", "role": "seller" }
        }
      ],
      "paymentMethod": { "id": 1, "name": "Cash on Delivery", "code": "cash", "icon": null },
      "coupon": null,
      "customer": { "id": 6, "name": "Neha Kapoor", "email": "neha@shop.com", "phone": "9000000011" },
      "address": null,
      "createdBy": { "id": 3, "name": "Priya Traders", "role": "seller" },
      "canBeCancelledByCustomer": true,
      "allowedNextStatuses": ["confirmed", "cancelled"]
    }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Order not found" }
```

---

### 14.4 Advance or cancel an order

| | |
| --- | --- |
| **API name** | Admin update order status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/orders/:id/status` |
| **Auth** | Admin |

Marking an order `delivered` settles a pending cash payment. Cancelling returns the stock and refunds an already-paid order.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `status` | enum | yes | one of the six order statuses, and a legal next step |
| `note` | string | no | recorded on the timeline; used as the cancel reason |

**Request payload**

```json
{
  "status": "confirmed",
  "note": "Stock verified and packed"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Order marked as confirmed",
  "data": {
    "order": {
      "id": 219,
      "orderNumber": "ORD-20260811-00219",
      "status": "confirmed",
      "paymentStatus": "pending",
      "confirmedAt": "2026-08-12T11:20:00.000Z",
      "total": 10499,
      "items": [
        {
          "id": 476,
          "productName": "PeakForm Adjustable Dumbbells",
          "quantity": 1,
          "unitPrice": 10499,
          "lineTotal": 10499
        }
      ],
      "statusHistory": [
        { "id": 455, "status": "pending", "note": "Order created by Priya Traders", "createdAt": "2026-08-11T14:22:00.000Z" },
        {
          "id": 464,
          "status": "confirmed",
          "note": "Stock verified and packed",
          "changedById": 1,
          "createdAt": "2026-08-12T11:20:00.000Z",
          "changedBy": { "id": 1, "name": "Site Admin", "role": "admin" }
        }
      ],
      "paymentMethod": { "id": 1, "name": "Cash on Delivery", "code": "cash", "icon": null },
      "customer": { "id": 6, "name": "Neha Kapoor", "email": "neha@shop.com", "phone": "9000000011" },
      "canBeCancelledByCustomer": true,
      "allowedNextStatuses": ["processing", "cancelled"]
    }
  }
}
```

**Cancel example**

```json
{
  "status": "cancelled",
  "note": "Customer called to cancel"
}
```

**Error — 400** (skipping a step)

```json
{ "success": false, "message": "A pending order can only move to: confirmed, cancelled" }
```

**Error — 400** (terminal status)

```json
{ "success": false, "message": "A delivered order can no longer change status" }
```

**Error — 400** (no change)

```json
{ "success": false, "message": "This order is already confirmed" }
```

**Error — 400** (unknown status)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "status", "message": "Unknown order status" }]
}
```

---

### 14.5 Override payment status

| | |
| --- | --- |
| **API name** | Admin update payment status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/orders/:id/payment-status` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `paymentStatus` | enum | yes | `pending`, `paid`, `failed`, `refunded` |

**Request payload**

```json
{ "paymentStatus": "paid" }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Payment marked as paid",
  "data": {
    "order": {
      "id": 219,
      "orderNumber": "ORD-20260811-00219",
      "status": "confirmed",
      "paymentStatus": "paid",
      "paymentMethodName": "Cash on Delivery",
      "total": 10499,
      "paymentMethod": { "id": 1, "name": "Cash on Delivery", "code": "cash", "icon": null },
      "customer": { "id": 6, "name": "Neha Kapoor", "email": "neha@shop.com", "phone": "9000000011" },
      "allowedNextStatuses": ["processing", "cancelled"]
    }
  }
}
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "paymentStatus", "message": "Unknown payment status" }]
}
```

**Error — 404**

```json
{ "success": false, "message": "Order not found" }
```

---

## 15. Seller panel — `/api/seller`

Every route below is **seller-only** (`Authorization: Bearer {{sellerToken}}`). Admins get a `403` — they have their own console under `/api/admin`. All data is scoped to the signed-in seller: their products, their orders, their revenue. The API enforces this, not just the UI.

---

### 15.1 Seller dashboard

| | |
| --- | --- |
| **API name** | Seller dashboard |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/stats` |
| **Auth** | Seller — `Authorization: Bearer {{sellerToken}}` |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` | enum | `all` (default), `today`, `week`, `month` |
| `from` | `YYYY-MM-DD` | Custom start; overrides `range` |
| `to` | `YYYY-MM-DD` | Custom end |

**Example:** `{{baseUrl}}/api/seller/stats?range=month`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "month",
    "products": {
      "total": 12,
      "active": 10,
      "outOfStock": 1,
      "lowStock": 2
    },
    "orders": {
      "total": 38,
      "pending": 8,
      "shipped": 5,
      "completed": 22,
      "cancelled": 3,
      "byStatus": {
        "pending": 4,
        "confirmed": 2,
        "processing": 2,
        "shipped": 5,
        "delivered": 22,
        "cancelled": 3
      }
    },
    "sales": {
      "revenue": 245680,
      "unitsSold": 87
    },
    "lowStockProducts": [
      {
        "id": 3,
        "name": "Aurora Noise-Cancel Pro",
        "slug": "aurora-noise-cancel-pro",
        "stock": 2,
        "isActive": true
      },
      {
        "id": 4,
        "name": "Vertex Ultrabook 14",
        "slug": "vertex-ultrabook-14",
        "stock": 6,
        "isActive": true
      }
    ],
    "lowStockThreshold": 10
  }
}
```

**Error — 403** (signed in as a customer or admin)

```json
{ "success": false, "message": "This action is restricted to: seller." }
```

---

### 15.2 Seller inventory list

| | |
| --- | --- |
| **API name** | Seller inventory |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/inventory` |
| **Auth** | Seller |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Search by product name |
| `stockLevel` | enum | `in`, `low`, `out` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `20`, capped at `100` |

**Example:** `{{baseUrl}}/api/seller/inventory?stockLevel=low&page=1&limit=20`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 4,
        "name": "Vertex Ultrabook 14",
        "slug": "vertex-ultrabook-14",
        "stock": 6,
        "isActive": true,
        "price": 74999,
        "discountPrice": 69999,
        "brand": { "id": 7, "name": "Vertex" },
        "category": { "id": 3, "name": "Laptops" },
        "variants": [],
        "images": [
          {
            "id": 10,
            "productId": 4,
            "url": "https://picsum.photos/seed/vertex-ultrabook-14-0/700/700",
            "alt": "Vertex Ultrabook 14 image 1",
            "isPrimary": true,
            "sortOrder": 0
          }
        ]
      }
    ],
    "lowStockThreshold": 10,
    "pagination": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

### 15.3 Seller adjust stock

| | |
| --- | --- |
| **API name** | Seller adjust stock |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/seller/inventory/:productId` |
| **Auth** | Seller (own products only) |

**Path parameter:** `productId` — the product id.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `adjustment` | number | conditional | A relative change: `+10`, `-3`. Provide this **or** `stock`, not both. |
| `stock` | number | conditional | An absolute value to set. Must be ≥ 0. |
| `variantId` | number | no | Target a specific variant instead of the parent product |
| `reason` | string | no | Max 255 characters; defaults to `Stock added` / `Stock removed` |

**Request payload — relative adjustment**

```json
{
  "adjustment": 25,
  "reason": "Restocked from supplier"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Stock increased from 6 to 31",
  "data": {
    "productId": 4,
    "variantId": null,
    "productStock": 31,
    "newStock": 31,
    "change": 25
  }
}
```

**Request payload — absolute stock set**

```json
{
  "stock": 50,
  "reason": "Physical count update"
}
```

**Request payload — variant stock**

```json
{
  "variantId": 2,
  "adjustment": -5,
  "reason": "Damaged units removed"
}
```

**Error — 400** (would go negative)

```json
{ "success": false, "message": "Stock cannot go below zero (currently 6)" }
```

**Error — 400** (no adjustment or stock provided)

```json
{ "success": false, "message": "Provide either an adjustment or a new stock value" }
```

**Error — 400** (variant not on this product)

```json
{ "success": false, "message": "That variant does not belong to this product" }
```

**Error — 403** (another seller's product)

```json
{ "success": false, "message": "This product belongs to another seller" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 15.4 Seller stock history

| | |
| --- | --- |
| **API name** | Seller stock history |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/inventory/:productId/history` |
| **Auth** | Seller (own products only) |

Returns the last 100 stock movements for this product — adjustments, order sales, and cancellation restocks.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 4,
      "name": "Vertex Ultrabook 14",
      "stock": 31
    },
    "movements": [
      {
        "id": 42,
        "productId": 4,
        "variantId": null,
        "sellerId": 2,
        "type": "adjustment",
        "quantityChange": 25,
        "resultingStock": 31,
        "reason": "Restocked from supplier",
        "orderId": null,
        "createdAt": "2026-08-12T11:30:00.000Z",
        "createdBy": { "id": 2, "name": "Sam Seller", "role": "seller" },
        "variant": null,
        "order": null
      },
      {
        "id": 38,
        "productId": 4,
        "variantId": null,
        "sellerId": 2,
        "type": "order",
        "quantityChange": -1,
        "resultingStock": 6,
        "reason": "Order ORD-20260812-00221 placed",
        "orderId": 221,
        "createdAt": "2026-08-12T11:02:15.000Z",
        "createdBy": { "id": 4, "name": "Riya Customer", "role": "customer" },
        "variant": null,
        "order": { "id": 221, "orderNumber": "ORD-20260812-00221" }
      }
    ]
  }
}
```

**Error — 403**

```json
{ "success": false, "message": "This product belongs to another seller" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 15.5 Seller customer lookup

| | |
| --- | --- |
| **API name** | Seller customer lookup |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/customers` |
| **Auth** | Seller |

Used when raising a direct order: searches active customers by name, email or phone and returns their saved addresses.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Searches name, email and phone |
| `limit` | number | Defaults to `20`, capped at `50` |

**Example:** `{{baseUrl}}/api/seller/customers?q=riya`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 4,
        "name": "Riya Customer",
        "email": "customer@shop.com",
        "phone": "9000000003",
        "addresses": [
          {
            "id": 1,
            "userId": 4,
            "label": "home",
            "fullName": "Riya Customer",
            "phone": "9000000003",
            "addressLine1": "42 Lakeview Residency",
            "addressLine2": "Anna Nagar",
            "landmark": "Opposite the city library",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "postalCode": "600040",
            "country": "India",
            "isDefault": true
          }
        ]
      }
    ]
  }
}
```

---

### 15.6 Seller list orders

| | |
| --- | --- |
| **API name** | Seller list orders |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/orders` |
| **Auth** | Seller |

Returns orders that contain at least one of this seller's products. Each order is reduced to the seller's own lines with their own subtotal.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Order number, shipping name or phone |
| `status` | enum | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` |
| `paymentStatus` | enum | `pending`, `paid`, `failed`, `refunded` |
| `source` | enum | `customer` or `seller` |
| `from` / `to` | `YYYY-MM-DD` | Date range on `placedAt` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `15`, capped at `100` |

**Example:** `{{baseUrl}}/api/seller/orders?status=pending&source=customer&page=1&limit=15`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "userId": 4,
        "subtotal": 17998,
        "productDiscount": 5000,
        "couponDiscount": 500,
        "discount": 5500,
        "deliveryCharge": 0,
        "total": 12498,
        "paymentMethodCode": "gpay",
        "paymentMethodName": "Google Pay",
        "paymentStatus": "paid",
        "status": "pending",
        "orderSource": "customer",
        "shippingFullName": "Riya Customer",
        "shippingCity": "Chennai",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "items": [
          {
            "id": 480,
            "orderId": 221,
            "productId": 7,
            "sellerId": 2,
            "productName": "Aurora Studio Headphones",
            "brandName": "Aurora",
            "variantLabel": null,
            "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700",
            "originalPrice": 8999,
            "unitPrice": 6499,
            "quantity": 2,
            "lineTotal": 12998
          }
        ],
        "sellerItemCount": 2,
        "sellerSubtotal": 12998,
        "isSoleSeller": true,
        "allowedNextStatuses": ["confirmed", "cancelled"],
        "canUpdateStatus": true,
        "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
        "customer": { "id": 4, "name": "Riya Customer", "email": "customer@shop.com", "phone": "9000000003" }
      }
    ],
    "pagination": { "total": 38, "page": 1, "limit": 15, "totalPages": 3 }
  }
}
```

On a shared order (multi-seller), only this seller's lines appear and `canUpdateStatus` is `false`:

```json
{
  "isSoleSeller": false,
  "allowedNextStatuses": [],
  "canUpdateStatus": false
}
```

---

### 15.7 Seller get order

| | |
| --- | --- |
| **API name** | Seller get order |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/seller/orders/:id` |
| **Auth** | Seller (must own at least one line) |

The full order with status history, reduced to this seller's lines.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 221,
      "orderNumber": "ORD-20260812-00221",
      "userId": 4,
      "subtotal": 17998,
      "productDiscount": 5000,
      "couponDiscount": 500,
      "discount": 5500,
      "deliveryCharge": 0,
      "total": 12498,
      "paymentMethodCode": "gpay",
      "paymentMethodName": "Google Pay",
      "paymentStatus": "paid",
      "status": "pending",
      "orderSource": "customer",
      "shippingFullName": "Riya Customer",
      "shippingPhone": "9000000003",
      "shippingAddressLine1": "42 Lakeview Residency",
      "shippingAddressLine2": "Anna Nagar",
      "shippingCity": "Chennai",
      "shippingState": "Tamil Nadu",
      "shippingPostalCode": "600040",
      "shippingCountry": "India",
      "customerNote": "Please deliver after 6 pm.",
      "placedAt": "2026-08-12T11:02:15.000Z",
      "items": [
        {
          "id": 480,
          "orderId": 221,
          "productId": 7,
          "sellerId": 2,
          "productName": "Aurora Studio Headphones",
          "productSlug": "aurora-studio-headphones",
          "brandName": "Aurora",
          "variantLabel": null,
          "sku": null,
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700",
          "originalPrice": 8999,
          "unitPrice": 6499,
          "quantity": 2,
          "lineTotal": 12998
        }
      ],
      "statusHistory": [
        {
          "id": 460,
          "status": "pending",
          "note": "Order placed",
          "changedById": 4,
          "createdAt": "2026-08-12T11:02:15.000Z",
          "changedBy": { "id": 4, "name": "Riya Customer", "role": "customer" }
        }
      ],
      "sellerItemCount": 2,
      "sellerSubtotal": 12998,
      "isSoleSeller": true,
      "allowedNextStatuses": ["confirmed", "cancelled"],
      "canUpdateStatus": true,
      "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
      "coupon": { "id": 1, "code": "WELCOME10" },
      "customer": { "id": 4, "name": "Riya Customer", "email": "customer@shop.com", "phone": "9000000003" }
    }
  }
}
```

**Error — 403** (order contains none of this seller's products)

```json
{ "success": false, "message": "This order does not contain any of your products" }
```

**Error — 404**

```json
{ "success": false, "message": "Order not found" }
```

---

### 15.8 Seller update order status

| | |
| --- | --- |
| **API name** | Seller update order status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/seller/orders/:id/status` |
| **Auth** | Seller (single-seller orders only) |

The seller can advance or cancel orders where they are the **sole seller**. On a shared order the status is locked to the admin.

**Allowed transitions:** `pending → confirmed → processing → shipped → delivered`, plus `cancelled` from any live status.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `status` | enum | yes | one of the six order statuses, and a legal next step |
| `note` | string | no | recorded on the timeline; used as the cancel reason |

**Request payload**

```json
{
  "status": "confirmed",
  "note": "Stock verified"
}
```

**Success — 200** — the full seller-scoped order including the updated status history.

```json
{
  "success": true,
  "message": "Order marked as confirmed",
  "data": {
    "order": {
      "id": 221,
      "orderNumber": "ORD-20260812-00221",
      "status": "confirmed",
      "paymentStatus": "paid",
      "confirmedAt": "2026-08-12T12:00:00.000Z",
      "total": 12498,
      "items": [
        {
          "id": 480,
          "productName": "Aurora Studio Headphones",
          "quantity": 2,
          "unitPrice": 6499,
          "lineTotal": 12998
        }
      ],
      "statusHistory": [
        { "id": 460, "status": "pending", "note": "Order placed", "createdAt": "2026-08-12T11:02:15.000Z", "changedBy": { "id": 4, "name": "Riya Customer", "role": "customer" } },
        { "id": 465, "status": "confirmed", "note": "Stock verified", "createdAt": "2026-08-12T12:00:00.000Z", "changedBy": { "id": 2, "name": "Sam Seller", "role": "seller" } }
      ],
      "sellerItemCount": 2,
      "sellerSubtotal": 12998,
      "isSoleSeller": true,
      "allowedNextStatuses": ["processing", "cancelled"],
      "canUpdateStatus": true,
      "paymentMethod": { "id": 2, "name": "Google Pay", "code": "gpay", "icon": null },
      "customer": { "id": 4, "name": "Riya Customer", "email": "customer@shop.com", "phone": "9000000003" }
    }
  }
}
```

**Error — 403** (shared order)

```json
{ "success": false, "message": "This order also contains other sellers' products, so only an admin can change its status" }
```

**Error — 400** (skipping a step)

```json
{ "success": false, "message": "A pending order can only move to: confirmed, cancelled" }
```

**Error — 400** (terminal status)

```json
{ "success": false, "message": "A delivered order can no longer change status" }
```

**Error — 400** (already at that status)

```json
{ "success": false, "message": "This order is already confirmed" }
```

---

### 15.9 Seller quote draft order

| | |
| --- | --- |
| **API name** | Seller quote draft order |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/seller/orders/quote` |
| **Auth** | Seller |

Prices a draft before creating it. Only this seller's own products may appear. Used to show a live total as the seller builds the order.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `items` | array | yes | each `{ productId, variantId?, quantity }` |
| `couponCode` | string | no | previewed on the quote |

**Request payload**

```json
{
  "items": [
    { "productId": 7, "quantity": 2 },
    { "productId": 4, "quantity": 1 }
  ],
  "couponCode": "WELCOME10"
}
```

**Success — 200**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": 7,
        "variantId": null,
        "quantity": 2,
        "product": {
          "id": 7,
          "name": "Aurora Studio Headphones",
          "slug": "aurora-studio-headphones",
          "isActive": true,
          "sellerId": 2,
          "brand": { "id": 1, "name": "Aurora", "slug": "aurora" },
          "image": "https://picsum.photos/seed/aurora-studio-headphones-0/700/700"
        },
        "variant": null,
        "variantLabel": null,
        "originalPrice": 8999,
        "effectivePrice": 6499,
        "lineTotal": 12998,
        "availableStock": 58,
        "isAvailable": true,
        "issues": []
      },
      {
        "productId": 4,
        "variantId": null,
        "quantity": 1,
        "product": {
          "id": 4,
          "name": "Vertex Ultrabook 14",
          "slug": "vertex-ultrabook-14",
          "isActive": true,
          "sellerId": 2,
          "brand": { "id": 7, "name": "Vertex", "slug": "vertex" },
          "image": "https://picsum.photos/seed/vertex-ultrabook-14-0/700/700"
        },
        "originalPrice": 74999,
        "effectivePrice": 69999,
        "lineTotal": 69999,
        "availableStock": 31,
        "isAvailable": true,
        "issues": []
      }
    ],
    "summary": {
      "itemCount": 3,
      "subtotal": 92997,
      "productDiscount": 7500,
      "couponDiscount": 500,
      "discount": 8000,
      "itemsTotal": 84997,
      "deliveryCharge": 0,
      "total": 84997,
      "freeDeliveryThreshold": 500
    },
    "coupon": {
      "id": 1,
      "code": "WELCOME10",
      "description": "10% off your order, up to ₹500",
      "discountType": "percent",
      "discountValue": 10
    },
    "couponError": null,
    "hasUnavailableItems": false
  }
}
```

---

### 15.10 Seller create direct order

| | |
| --- | --- |
| **API name** | Seller create direct order |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/seller/orders` |
| **Auth** | Seller |

Creates an order on behalf of a customer. Only this seller's own products may be included. Uses the same stock-locking, pricing, and payment rules as the customer checkout.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `customerId` | number | yes | an active customer account |
| `items` | array | yes | at least one `{ productId, variantId?, quantity }` |
| `addressId` | number | conditional | a saved address belonging to the customer; send this **or** `shippingAddress` |
| `shippingAddress` | object | conditional | `{ fullName, phone, addressLine1, addressLine2?, landmark?, city, state, postalCode, country? }` — typed in when the customer has no saved address |
| `paymentMethodId` | number | conditional | an active payment method; send this or `paymentMethodCode` |
| `paymentMethodCode` | string | conditional | e.g. `cash`, `gpay` |
| `couponCode` | string | no | validated on creation |
| `note` | string | no | customer note |

**Request payload**

```json
{
  "customerId": 6,
  "items": [
    { "productId": 22, "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "Neha Kapoor",
    "phone": "9000000011",
    "addressLine1": "42 Lakeview Residency",
    "addressLine2": "Anna Nagar",
    "landmark": "Opposite the city library",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postalCode": "600040",
    "country": "India"
  },
  "paymentMethodCode": "cash",
  "note": "Walk-in customer order"
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "Order ORD-20260812-00222 created for Neha Kapoor",
  "data": {
    "order": {
      "id": 222,
      "orderNumber": "ORD-20260812-00222",
      "userId": 6,
      "subtotal": 12999,
      "productDiscount": 2500,
      "couponDiscount": 0,
      "discount": 2500,
      "deliveryCharge": 0,
      "total": 10499,
      "couponId": null,
      "couponCode": null,
      "paymentMethodId": 1,
      "paymentMethodCode": "cash",
      "paymentMethodName": "Cash on Delivery",
      "paymentStatus": "pending",
      "status": "pending",
      "orderSource": "seller",
      "createdById": 3,
      "shippingFullName": "Neha Kapoor",
      "shippingPhone": "9000000011",
      "shippingAddressLine1": "42 Lakeview Residency",
      "shippingAddressLine2": "Anna Nagar",
      "shippingLandmark": "Opposite the city library",
      "shippingCity": "Chennai",
      "shippingState": "Tamil Nadu",
      "shippingPostalCode": "600040",
      "shippingCountry": "India",
      "customerNote": "Walk-in customer order",
      "placedAt": "2026-08-12T12:30:00.000Z",
      "items": [
        {
          "id": 481,
          "orderId": 222,
          "productId": 22,
          "sellerId": 3,
          "productName": "PeakForm Adjustable Dumbbells",
          "productSlug": "peakform-adjustable-dumbbells",
          "brandName": "PeakForm",
          "variantLabel": null,
          "sku": null,
          "image": "https://picsum.photos/seed/peakform-adjustable-dumbb-0/700/700",
          "originalPrice": 12999,
          "unitPrice": 10499,
          "quantity": 1,
          "lineTotal": 10499
        }
      ],
      "sellerItemCount": 1,
      "sellerSubtotal": 10499,
      "isSoleSeller": true,
      "allowedNextStatuses": ["confirmed", "cancelled"],
      "canUpdateStatus": true,
      "paymentMethod": { "id": 1, "name": "Cash on Delivery", "code": "cash", "icon": null },
      "customer": { "id": 6, "name": "Neha Kapoor", "email": "neha@shop.com", "phone": "9000000011" }
    }
  }
}
```

**Error — 400** (bad customer)

```json
{ "success": false, "message": "Please select a valid customer" }
```

**Error — 400** (out of stock)

```json
{ "success": false, "message": "PeakForm Adjustable Dumbbells: This product is out of stock" }
```

**Error — 400** (no address)

```json
{ "success": false, "message": "Select a saved address or enter a delivery address" }
```

**Error — 400** (no phone)

```json
{ "success": false, "message": "A contact phone number is required for delivery" }
```

**Error — 400** (validation)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "customerId", "message": "Please select a customer" },
    { "field": "items", "message": "Add at least one product to the order" }
  ]
}
```

---

## 16. Admin console — `/api/admin`

Every route below is **admin-only** (`Authorization: Bearer {{adminToken}}`). Sellers have their own scoped panel at `/api/seller` and cannot reach these routes.

---

### 16.1 Admin dashboard

| | |
| --- | --- |
| **API name** | Admin dashboard |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/stats` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` | enum | `all` (default), `today`, `week`, `month`, `year` |
| `from` | `YYYY-MM-DD` | Custom start; overrides `range` |
| `to` | `YYYY-MM-DD` | Custom end |

**Example:** `{{baseUrl}}/api/admin/stats?range=month`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "month",
    "customers": {
      "total": 12,
      "active": 11,
      "inactive": 1,
      "joinedInRange": 3
    },
    "sellers": {
      "total": 2,
      "active": 2,
      "inactive": 0,
      "joinedInRange": 0
    },
    "admins": { "total": 1 },
    "products": {
      "total": 25,
      "active": 23,
      "disabled": 2,
      "outOfStock": 1,
      "lowStock": 4,
      "inventoryValue": 4875230
    },
    "orders": {
      "total": 220,
      "pending": 27,
      "shipped": 22,
      "completed": 114,
      "cancelled": 22,
      "byStatus": {
        "pending": 27,
        "confirmed": 18,
        "processing": 17,
        "shipped": 22,
        "delivered": 114,
        "cancelled": 22
      }
    },
    "sales": {
      "totalSales": 3874521.5,
      "revenue": 3102450,
      "unitsSold": 1425,
      "averageOrderValue": 19568.29
    },
    "bySource": {
      "customer": { "count": 181, "value": 3405280 },
      "seller": { "count": 39, "value": 469241.5 }
    },
    "byPaymentMethod": [
      { "code": "gpay", "name": "Google Pay", "count": 78, "value": 1542600 },
      { "code": "cash", "name": "Cash on Delivery", "count": 74, "value": 1298700 },
      { "code": "phonepe", "name": "PhonePe", "count": 68, "value": 1033221.5 }
    ],
    "lowStockProducts": [
      { "id": 3, "name": "Aurora Noise-Cancel Pro", "slug": "aurora-noise-cancel-pro", "stock": 2, "isActive": true, "seller": { "id": 2, "name": "Sam Seller" } }
    ],
    "recentOrders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "total": 12498,
        "status": "pending",
        "paymentStatus": "paid",
        "orderSource": "customer",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "shippingFullName": "Riya Customer",
        "customer": { "id": 4, "name": "Riya Customer" }
      }
    ],
    "topProducts": [
      {
        "id": 1,
        "name": "Aurora Bass Pro Headphones",
        "slug": "aurora-bass-pro-headphones",
        "stock": 12,
        "price": 6999,
        "discountPrice": 4999,
        "isActive": true,
        "unitsSold": 156,
        "revenue": 779844,
        "orderCount": 89,
        "seller": { "id": 2, "name": "Sam Seller" },
        "category": { "id": 4, "name": "Headphones" },
        "brand": { "id": 1, "name": "Aurora" }
      }
    ],
    "lowStockThreshold": 10
  }
}
```

---

### 16.2 List customers

| | |
| --- | --- |
| **API name** | Admin list customers |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/customers` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Searches name, email and phone |
| `status` | enum | `active` or `inactive` |
| `sort` | enum | `newest` (default), `name`, `orders_desc`, `spend_desc` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `20`, capped at `100` |

**Example:** `{{baseUrl}}/api/admin/customers?q=riya&sort=spend_desc&page=1&limit=20`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 4,
        "name": "Riya Customer",
        "email": "customer@shop.com",
        "phone": "9000000003",
        "isActive": true,
        "createdAt": "2026-08-12T08:00:00.000Z",
        "orderCount": 14,
        "totalSpent": 124560,
        "cancelledOrders": 2,
        "lastOrderAt": "2026-08-12T11:02:15.000Z"
      }
    ],
    "pagination": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

### 16.3 Get customer detail

| | |
| --- | --- |
| **API name** | Admin get customer |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/customers/:id` |
| **Auth** | Admin |

Returns the customer profile, their addresses, order counts by status, and their top purchased products.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 4,
      "name": "Riya Customer",
      "email": "customer@shop.com",
      "phone": "9000000003",
      "avatar": null,
      "isActive": true,
      "createdAt": "2026-08-12T08:00:00.000Z",
      "orderCount": 14,
      "totalSpent": 124560,
      "cancelledOrders": 2,
      "lastOrderAt": "2026-08-12T11:02:15.000Z",
      "addresses": [
        {
          "id": 1,
          "userId": 4,
          "label": "home",
          "fullName": "Riya Customer",
          "phone": "9000000003",
          "addressLine1": "42 Lakeview Residency",
          "addressLine2": "Anna Nagar",
          "city": "Chennai",
          "state": "Tamil Nadu",
          "postalCode": "600040",
          "country": "India",
          "isDefault": true
        }
      ]
    },
    "ordersByStatus": {
      "pending": 1,
      "confirmed": 0,
      "processing": 1,
      "shipped": 2,
      "delivered": 8,
      "cancelled": 2
    },
    "purchaseHistory": [
      {
        "productId": 7,
        "productName": "Aurora Studio Headphones",
        "quantity": 8,
        "spent": 51992,
        "lastBoughtAt": "2026-08-12T11:02:15.000Z"
      },
      {
        "productId": 4,
        "productName": "Vertex Ultrabook 14",
        "quantity": 2,
        "spent": 139998,
        "lastBoughtAt": "2026-08-10T09:15:00.000Z"
      }
    ]
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Customer not found" }
```

---

### 16.4 Get customer orders

| | |
| --- | --- |
| **API name** | Admin get customer orders |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/customers/:id/orders` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `status` | enum | Filter by order status |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `10`, capped at `100` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "userId": 4,
        "subtotal": 17998,
        "total": 12498,
        "status": "pending",
        "paymentStatus": "paid",
        "orderSource": "customer",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "items": [
          {
            "id": 480,
            "productName": "Aurora Studio Headphones",
            "quantity": 2,
            "unitPrice": 6499,
            "lineTotal": 12998
          }
        ]
      }
    ],
    "pagination": { "total": 14, "page": 1, "limit": 10, "totalPages": 2 }
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Customer not found" }
```

---

### 16.5 Toggle customer status

| | |
| --- | --- |
| **API name** | Admin toggle customer status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/customers/:id/status` |
| **Auth** | Admin |

Deactivating a customer blocks sign-in immediately — `protect` rejects the token on the next request.

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `isActive` | boolean | no | Omit the body to flip the current value |

**Request payload**

```json
{ "isActive": false }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Riya Customer has been deactivated and can no longer sign in",
  "data": { "customer": { "id": 4, "isActive": false } }
}
```

Re-activating returns `"Riya Customer can sign in again"`.

**Error — 404**

```json
{ "success": false, "message": "Customer not found" }
```

---

### 16.6 List sellers

| | |
| --- | --- |
| **API name** | Admin list sellers |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Searches name and email |
| `status` | enum | `active` or `inactive` |
| `sort` | enum | `sales` (default), `revenue`, `orders`, `products`, `newest`, `name` |
| `range` / `from` / `to` | | Date window for the trading figures |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `20`, capped at `100` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "sellers": [
      {
        "id": 2,
        "name": "Sam Seller",
        "email": "seller@shop.com",
        "phone": "9000000002",
        "isActive": true,
        "createdAt": "2026-08-12T08:00:00.000Z",
        "productCount": 12,
        "activeProducts": 11,
        "orderCount": 126,
        "pendingOrders": 18,
        "completedOrders": 82,
        "cancelledOrders": 14,
        "unitsSold": 840,
        "sales": 2180450,
        "revenue": 1890200
      }
    ],
    "pagination": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 },
    "range": "all"
  }
}
```

---

### 16.7 Create seller

| | |
| --- | --- |
| **API name** | Admin create seller |
| **Method** | `POST` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers` |
| **Auth** | Admin |

Sellers cannot self-register — they are created by an admin.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | 2–100 characters |
| `email` | string | yes | valid email, must be unique |
| `password` | string | yes | min 6 characters, must contain a number |
| `phone` | string | no | valid mobile number |
| `isActive` | boolean | no | defaults to `true` |

**Request payload**

```json
{
  "name": "New Seller",
  "email": "newseller@shop.com",
  "password": "Seller@2026",
  "phone": "9876500001"
}
```

**Success — 201**

```json
{
  "success": true,
  "message": "New Seller can now sign in to the seller panel",
  "data": {
    "seller": {
      "id": 14,
      "name": "New Seller",
      "email": "newseller@shop.com",
      "phone": "9876500001",
      "isActive": true,
      "createdAt": "2026-08-12T13:00:00.000Z"
    }
  }
}
```

**Error — 409**

```json
{ "success": false, "message": "An account with this email already exists" }
```

**Error — 400**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "password", "message": "Password must contain at least one number" }
  ]
}
```

---

### 16.8 Update seller

| | |
| --- | --- |
| **API name** | Admin update seller |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers/:id` |
| **Auth** | Admin |

**Body parameters:** any of `name`, `email`, `phone`, `password`, `isActive`. Setting a password resets the seller's login.

**Request payload**

```json
{
  "name": "Sam Seller Updated",
  "phone": "9876500002"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Seller updated",
  "data": {
    "seller": {
      "id": 2,
      "name": "Sam Seller Updated",
      "email": "seller@shop.com",
      "phone": "9876500002",
      "isActive": true
    }
  }
}
```

**Error — 409** (email clash)

```json
{ "success": false, "message": "Another account already uses this email" }
```

**Error — 404**

```json
{ "success": false, "message": "Seller not found" }
```

---

### 16.9 Toggle seller status

| | |
| --- | --- |
| **API name** | Admin toggle seller status |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers/:id/status` |
| **Auth** | Admin |

**Body parameters**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `isActive` | boolean | no | Omit the body to flip the current value |

**Request payload**

```json
{ "isActive": false }
```

**Success — 200**

```json
{
  "success": true,
  "message": "Sam Seller has been deactivated. Their products stay listed until you disable them.",
  "data": { "seller": { "id": 2, "isActive": false } }
}
```

Re-activating returns `"Sam Seller can sign in again"`.

**Error — 404**

```json
{ "success": false, "message": "Seller not found" }
```

---

### 16.10 Get seller detail

| | |
| --- | --- |
| **API name** | Admin get seller |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers/:id` |
| **Auth** | Admin |

Performance, best sellers, product categories, and recent orders for one seller.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "seller": {
      "id": 2,
      "name": "Sam Seller",
      "email": "seller@shop.com",
      "phone": "9000000002",
      "isActive": true,
      "createdAt": "2026-08-12T08:00:00.000Z",
      "productCount": 12,
      "activeProducts": 11,
      "orderCount": 126,
      "pendingOrders": 18,
      "completedOrders": 82,
      "cancelledOrders": 14,
      "unitsSold": 840,
      "sales": 2180450,
      "revenue": 1890200
    },
    "range": "all",
    "topProducts": [
      {
        "id": 1,
        "name": "Aurora Bass Pro Headphones",
        "unitsSold": 156,
        "revenue": 779844,
        "orderCount": 89,
        "seller": { "id": 2, "name": "Sam Seller" },
        "category": { "id": 4, "name": "Headphones" },
        "brand": { "id": 1, "name": "Aurora" }
      }
    ],
    "recentOrders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "total": 12498,
        "status": "pending",
        "paymentStatus": "paid",
        "orderSource": "customer",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "customer": { "id": 4, "name": "Riya Customer" }
      }
    ],
    "byCategory": [
      { "category": { "id": 4, "name": "Headphones" }, "count": 4 },
      { "category": { "id": 3, "name": "Laptops" }, "count": 3 }
    ]
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Seller not found" }
```

---

### 16.11 Get seller products

| | |
| --- | --- |
| **API name** | Admin get seller products |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers/:id/products` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Search by product name |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `10`, capped at `100` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Aurora Bass Pro Headphones",
        "slug": "aurora-bass-pro-headphones",
        "price": 6999,
        "discountPrice": 4999,
        "stock": 12,
        "isActive": true,
        "soldCount": 156,
        "category": { "id": 4, "name": "Headphones" },
        "brand": { "id": 1, "name": "Aurora" }
      }
    ],
    "pagination": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
  }
}
```

---

### 16.12 Get seller orders

| | |
| --- | --- |
| **API name** | Admin get seller orders |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/sellers/:id/orders` |
| **Auth** | Admin |

Orders containing this seller's lines. Each carries the seller's own share (`sellerSubtotal`, `sellerItemCount`).

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `status` | enum | Filter by order status |
| `from` / `to` | `YYYY-MM-DD` | Date range |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `10`, capped at `100` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 221,
        "orderNumber": "ORD-20260812-00221",
        "total": 12498,
        "status": "pending",
        "paymentStatus": "paid",
        "paymentMethodName": "Google Pay",
        "orderSource": "customer",
        "placedAt": "2026-08-12T11:02:15.000Z",
        "shippingFullName": "Riya Customer",
        "customer": { "id": 4, "name": "Riya Customer", "email": "customer@shop.com" },
        "sellerSubtotal": 12998,
        "sellerItemCount": 2
      }
    ],
    "pagination": { "total": 126, "page": 1, "limit": 10, "totalPages": 13 }
  }
}
```

---

### 16.13 Admin inventory overview

| | |
| --- | --- |
| **API name** | Admin inventory |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/inventory` |
| **Auth** | Admin |

Stock across every seller, with a portfolio summary.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `q` | string | Search by product name |
| `sellerId` | number or `none` | Filter to one seller, or `none` for unassigned |
| `categoryId` | number | Filter by category |
| `stockLevel` | enum | `in`, `low`, `out` |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `20`, capped at `100` |

**Example:** `{{baseUrl}}/api/admin/inventory?stockLevel=low&sellerId=2&page=1&limit=20`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 4,
        "name": "Vertex Ultrabook 14",
        "slug": "vertex-ultrabook-14",
        "stock": 6,
        "isActive": true,
        "price": 74999,
        "discountPrice": 69999,
        "soldCount": 121,
        "lastMovementAt": "2026-08-12T11:30:00.000Z",
        "seller": { "id": 2, "name": "Sam Seller" },
        "category": { "id": 3, "name": "Laptops" },
        "brand": { "id": 7, "name": "Vertex" },
        "variants": [],
        "images": [
          { "id": 10, "url": "https://picsum.photos/seed/vertex-ultrabook-14-0/700/700", "isPrimary": true }
        ]
      }
    ],
    "summary": {
      "products": 25,
      "outOfStock": 1,
      "lowStock": 4,
      "units": 1842,
      "inventoryValue": 4875230
    },
    "lowStockThreshold": 10,
    "pagination": { "total": 4, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

### 16.14 Admin stock history

| | |
| --- | --- |
| **API name** | Admin stock history |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/inventory/:productId/history` |
| **Auth** | Admin |

The same ledger as the seller sees (15.4), but without the ownership check.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": 4,
      "name": "Vertex Ultrabook 14",
      "stock": 31,
      "seller": { "id": 2, "name": "Sam Seller" }
    },
    "movements": [
      {
        "id": 42,
        "productId": 4,
        "variantId": null,
        "sellerId": 2,
        "type": "adjustment",
        "quantityChange": 25,
        "resultingStock": 31,
        "reason": "Restocked from supplier",
        "orderId": null,
        "createdAt": "2026-08-12T11:30:00.000Z",
        "createdBy": { "id": 2, "name": "Sam Seller", "role": "seller" },
        "variant": null,
        "order": null
      }
    ]
  }
}
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 16.15 Admin adjust inventory

| | |
| --- | --- |
| **API name** | Admin adjust inventory |
| **Method** | `PATCH` |
| **Endpoint** | `{{baseUrl}}/api/admin/inventory/:productId` |
| **Auth** | Admin |

The same parameters and behaviour as the seller's stock adjustment (15.3), but without the ownership restriction. The movement records which admin made the change.

**Body parameters**

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `adjustment` | number | conditional | Relative change |
| `stock` | number | conditional | Absolute value |
| `variantId` | number | no | Target a variant |
| `reason` | string | no | Max 255 chars; defaults to `Adjusted by admin <name>` |

**Request payload**

```json
{
  "stock": 100,
  "reason": "Warehouse recount"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "Stock increased from 31 to 100",
  "data": {
    "productId": 4,
    "variantId": null,
    "productStock": 100,
    "newStock": 100,
    "change": 69
  }
}
```

**Error — 400**

```json
{ "success": false, "message": "Stock cannot go below zero (currently 6)" }
```

**Error — 404**

```json
{ "success": false, "message": "Product not found" }
```

---

### 16.16 Catalogue attributes

| | |
| --- | --- |
| **API name** | Catalogue attributes |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/attributes` |
| **Auth** | Admin |

The size and colour values in use across the catalogue, with variant and product counts.

**Success — 200**

```json
{
  "success": true,
  "data": {
    "sizes": [
      { "value": "M", "variantCount": 18, "productCount": 6, "stock": 124 },
      { "value": "L", "variantCount": 16, "productCount": 6, "stock": 98 },
      { "value": "S", "variantCount": 15, "productCount": 5, "stock": 87 },
      { "value": "XL", "variantCount": 10, "productCount": 4, "stock": 62 },
      { "value": "UK 8", "variantCount": 4, "productCount": 2, "stock": 30 }
    ],
    "colors": [
      { "value": "Black", "variantCount": 22, "productCount": 8, "stock": 180 },
      { "value": "White", "variantCount": 18, "productCount": 7, "stock": 142 },
      { "value": "Blue", "variantCount": 12, "productCount": 5, "stock": 78 },
      { "value": "Red", "variantCount": 8, "productCount": 3, "stock": 45 },
      { "value": "Grey", "variantCount": 6, "productCount": 2, "stock": 34 }
    ],
    "summary": {
      "products": 25,
      "withVariants": 10,
      "withoutVariants": 15,
      "variants": 90
    }
  }
}
```

---

## 17. Reports — `/api/admin/reports`

Admin-only. Every route accepts the same date window: `range` (`all`, `today`, `week`, `month`, `year`) or `from`/`to`. An explicit `from`/`to` always overrides `range`.

**Two money figures, kept apart**

- **Sales** — value of every order that has not been cancelled (business written)
- **Revenue** — value of the orders whose payment has actually settled (money collected)

Cash orders count toward **sales** the moment they are placed and toward **revenue** only once they are delivered and marked paid.

---

### 17.1 Sales report

| | |
| --- | --- |
| **API name** | Sales report |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/sales` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |
| `groupBy` | enum | `day` (default), `week`, `month`, `year` |
| `sellerId` | number | Narrow to one seller's lines |
| `source` | enum | `customer` or `seller` |

**Example:** `{{baseUrl}}/api/admin/reports/sales?range=month&groupBy=day`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "groupBy": "day",
    "range": "month",
    "rows": [
      { "period": "2026-08-01", "orders": 8, "units": 14, "sales": 125400, "revenue": 98200, "discount": 4500 },
      { "period": "2026-08-02", "orders": 12, "units": 22, "sales": 198600, "revenue": 165300, "discount": 7200 },
      { "period": "2026-08-03", "orders": 0, "units": 0, "sales": 0, "revenue": 0, "discount": 0 }
    ],
    "totals": {
      "orders": 198,
      "units": 1425,
      "sales": 3874521.5,
      "revenue": 3102450,
      "discount": 82450,
      "averageOrderValue": 19568.29
    }
  }
}
```

Quiet days show as zero rows rather than being omitted — sales series fill their gaps.

---

### 17.2 Product report

| | |
| --- | --- |
| **API name** | Product report |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/products` |
| **Auth** | Admin |

Best-selling and low-selling products. Products that sold nothing in the window still appear in the low-sellers list.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |
| `sellerId` | number | Narrow to one seller |
| `categoryId` | number | Narrow to one category |
| `q` | string | Search by product name |
| `limit` | number | Defaults to `15`, capped at `50` |
| `source` | enum | `customer` or `seller` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "all",
    "bestSelling": [
      {
        "id": 1,
        "name": "Aurora Bass Pro Headphones",
        "slug": "aurora-bass-pro-headphones",
        "stock": 12,
        "price": 6999,
        "discountPrice": 4999,
        "isActive": true,
        "unitsSold": 156,
        "revenue": 779844,
        "orderCount": 89,
        "seller": { "id": 2, "name": "Sam Seller" },
        "category": { "id": 4, "name": "Headphones" },
        "brand": { "id": 1, "name": "Aurora" }
      }
    ],
    "lowSelling": [
      {
        "id": 25,
        "name": "CasaLuxe Ceramic Vase Set",
        "slug": "casaluxe-ceramic-vase-set",
        "stock": 45,
        "price": 2499,
        "discountPrice": null,
        "isActive": true,
        "unitsSold": 0,
        "revenue": 0,
        "orderCount": 0,
        "seller": { "id": 3, "name": "Priya Traders" },
        "category": { "id": 11, "name": "Cookware" },
        "brand": { "id": 6, "name": "CasaLuxe" }
      }
    ],
    "totals": {
      "unitsSold": 1425,
      "revenue": 3874521.5
    }
  }
}
```

---

### 17.3 Seller report

| | |
| --- | --- |
| **API name** | Seller report |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/sellers` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |
| `q` | string | Search by seller name or email |
| `status` | enum | `active` or `inactive` |
| `sort` | enum | `sales` (default), `revenue`, `orders`, `products`, `newest`, `name` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "all",
    "sellers": [
      {
        "id": 2,
        "name": "Sam Seller",
        "email": "seller@shop.com",
        "phone": "9000000002",
        "isActive": true,
        "createdAt": "2026-08-12T08:00:00.000Z",
        "productCount": 12,
        "activeProducts": 11,
        "orderCount": 126,
        "pendingOrders": 18,
        "completedOrders": 82,
        "cancelledOrders": 14,
        "unitsSold": 840,
        "sales": 2180450,
        "revenue": 1890200
      },
      {
        "id": 3,
        "name": "Priya Traders",
        "email": "seller2@shop.com",
        "phone": "9000000012",
        "isActive": true,
        "createdAt": "2026-08-12T08:00:00.000Z",
        "productCount": 13,
        "activeProducts": 12,
        "orderCount": 98,
        "pendingOrders": 12,
        "completedOrders": 65,
        "cancelledOrders": 8,
        "unitsSold": 585,
        "sales": 1694071.5,
        "revenue": 1212250
      }
    ],
    "totals": {
      "sellers": 2,
      "orders": 224,
      "unitsSold": 1425,
      "sales": 3874521.5,
      "revenue": 3102450
    }
  }
}
```

---

### 17.4 Payment report

| | |
| --- | --- |
| **API name** | Payment report |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/payments` |
| **Auth** | Admin |

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |
| `source` | enum | `customer` or `seller` |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "all",
    "methods": [
      {
        "code": "gpay",
        "name": "Google Pay",
        "orderCount": 78,
        "sales": 1542600,
        "revenue": 1542600,
        "paidCount": 72,
        "pendingCount": 0,
        "refundedCount": 6,
        "failedCount": 0
      },
      {
        "code": "cash",
        "name": "Cash on Delivery",
        "orderCount": 74,
        "sales": 1298700,
        "revenue": 982400,
        "paidCount": 48,
        "pendingCount": 20,
        "refundedCount": 6,
        "failedCount": 0
      },
      {
        "code": "phonepe",
        "name": "PhonePe",
        "orderCount": 68,
        "sales": 1033221.5,
        "revenue": 1033221.5,
        "paidCount": 60,
        "pendingCount": 0,
        "refundedCount": 8,
        "failedCount": 0
      }
    ],
    "byStatus": {
      "paid": 180,
      "pending": 20,
      "refunded": 20,
      "failed": 0
    },
    "totals": {
      "orders": 220,
      "sales": 3874521.5,
      "revenue": 3558221.5
    }
  }
}
```

---

### 17.5 Order-source report

| | |
| --- | --- |
| **API name** | Order-source report |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/order-source` |
| **Auth** | Admin |

Storefront checkouts against seller-raised direct orders, with each seller's share of the direct ones.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |

**Success — 200**

```json
{
  "success": true,
  "data": {
    "range": "all",
    "sources": [
      {
        "source": "customer",
        "orderCount": 181,
        "sales": 3405280,
        "revenue": 2910400,
        "cancelledCount": 16,
        "share": 82.3
      },
      {
        "source": "seller",
        "orderCount": 39,
        "sales": 469241.5,
        "revenue": 192050,
        "cancelledCount": 6,
        "share": 17.7
      }
    ],
    "totals": {
      "orders": 220,
      "sales": 3874521.5
    },
    "byCreator": [
      { "id": 3, "name": "Priya Traders", "orderCount": 24, "sales": 312400 },
      { "id": 2, "name": "Sam Seller", "orderCount": 15, "sales": 156841.5 }
    ]
  }
}
```

---

### 17.6 Business analytics

| | |
| --- | --- |
| **API name** | Business analytics |
| **Method** | `GET` |
| **Endpoint** | `{{baseUrl}}/api/admin/reports/analytics` |
| **Auth** | Admin |

Sales and order trends, customer and seller growth, order-status distribution, payment-method usage, order-source split, and product performance — everything the charts page needs in one call.

**Query parameters**

| Param | Type | Notes |
| ----- | ---- | ----- |
| `range` / `from` / `to` | | Date window |
| `groupBy` | enum | `day`, `week`, `month`, `year` |
| `source` | enum | `customer` or `seller` |

**Example:** `{{baseUrl}}/api/admin/reports/analytics?range=month&groupBy=day`

**Success — 200**

```json
{
  "success": true,
  "data": {
    "groupBy": "day",
    "range": "month",
    "salesTrend": [
      { "period": "2026-08-01", "orders": 8, "units": 14, "sales": 125400, "revenue": 98200, "discount": 4500 },
      { "period": "2026-08-02", "orders": 12, "units": 22, "sales": 198600, "revenue": 165300, "discount": 7200 }
    ],
    "orderTrend": [
      { "period": "2026-08-01", "orders": 8 },
      { "period": "2026-08-02", "orders": 12 }
    ],
    "statusDistribution": [
      { "status": "pending", "count": 27 },
      { "status": "confirmed", "count": 18 },
      { "status": "processing", "count": 17 },
      { "status": "shipped", "count": 22 },
      { "status": "delivered", "count": 114 },
      { "status": "cancelled", "count": 22 }
    ],
    "paymentUsage": [
      { "code": "gpay", "name": "Google Pay", "orderCount": 78, "sales": 1542600 },
      { "code": "cash", "name": "Cash on Delivery", "orderCount": 74, "sales": 1298700 },
      { "code": "phonepe", "name": "PhonePe", "orderCount": 68, "sales": 1033221.5 }
    ],
    "orderSources": [
      { "source": "customer", "orderCount": 181, "sales": 3405280, "revenue": 2910400, "cancelledCount": 16, "share": 82.3 },
      { "source": "seller", "orderCount": 39, "sales": 469241.5, "revenue": 192050, "cancelledCount": 6, "share": 17.7 }
    ],
    "customerGrowth": [
      { "period": "2026-08-01", "joined": 2, "total": 10 },
      { "period": "2026-08-02", "joined": 1, "total": 11 }
    ],
    "sellerGrowth": [
      { "period": "2026-08-01", "joined": 0, "total": 2 },
      { "period": "2026-08-02", "joined": 0, "total": 2 }
    ],
    "topProducts": [
      { "id": 1, "name": "Aurora Bass Pro Headphones", "unitsSold": 156, "revenue": 779844, "seller": { "id": 2, "name": "Sam Seller" } }
    ],
    "totals": {
      "orders": 198,
      "units": 1425,
      "sales": 3874521.5,
      "revenue": 3102450,
      "discount": 82450
    }
  }
}
```

---

---

# Part II — Complete Application Workflow

A step-by-step, user-facing description of how a user navigates the application across all four phases. These are functional workflows — what the user sees and does on each screen — not code-level flows.

---

## Phase 1 — Customer Shopping

### 1.1 Registration

```
Open ShopKart home page
  ↓
Click "Register" / "Sign Up"
  ↓
Enter name
  ↓
Enter email
  ↓
Enter password (min 6 characters, must contain a number)
  ↓
Enter phone (optional)
  ↓
Click Register
  ↓
Account created → automatically logged in
  ↓
Redirected to Home / Dashboard
```

### 1.2 Login

```
Open ShopKart home page
  ↓
Click "Login"
  ↓
Enter email
  ↓
Enter password
  ↓
Click Login
  ↓
System verifies credentials
  ↓
Success → Dashboard / Home
  OR
Error → "Invalid email or password"
  OR
Error → "This account has been disabled"
```

### 1.3 Home / Dashboard

```
Logged in as Customer
  ↓
Home page displays:
  • Category tiles (Electronics, Fashion, etc.)
  • Featured products carousel
  • Latest arrivals
  ↓
Click a category → Category listing page
  OR
Click a product → Product details page
  OR
Click "Shop Now" → All products listing
```

### 1.4 Category Browsing

```
Home page
  ↓
Click a top-level category (e.g. "Electronics")
  ↓
See subcategories (Smartphones, Laptops, Headphones, etc.)
  ↓
Click a subcategory (e.g. "Smartphones")
  ↓
Product listing page filtered to that category
```

### 1.5 Product Listing — Search & Filter

```
Product listing page
  ↓
Search bar: type product name, brand, or keyword
  ↓
Results update (searches name, description, brand, category)
  ↓
Apply filters from the sidebar:
  • Category
  • Brand (multi-select)
  • Price range (min – max)
  • In stock only
  • Size (multi-select)
  • Colour (multi-select)
  • Minimum rating
  • Featured only
  ↓
Sort by: newest, oldest, price low→high, price high→low, popular, rating, name A→Z
  ↓
Pagination: navigate between pages
  ↓
Click a product card → Product details page
```

### 1.6 Product Details

```
Product listing
  ↓
Click on a product card
  ↓
Product details page shows:
  • Image gallery (click to enlarge)
  • Product name, brand, category
  • Price and discount price (if any)
  • Stock availability label
  • Variant pickers (size, colour) — unavailable combos are greyed out
  • Quantity stepper (bounded by real stock)
  • Specifications table
  • Related products from the same category
  ↓
Click "Add to Wishlist" (heart icon) → saved to wishlist
  OR
Select variant (if any) → Click "Add to Cart" → added to cart
  OR
Click a related product → its detail page
```

### 1.7 Wishlist

```
Click wishlist icon (navbar) or navigate to Wishlist page
  ↓
See all saved products with current price, stock and image
  ↓
Click "Move to Cart" on an item
  ↓
Item removed from wishlist and added to cart
  OR
Click remove (X) → item removed from wishlist
  OR
Click "Clear Wishlist" → all items removed
  OR
Click a product → its detail page
```

### 1.8 Cart

```
Click cart icon (navbar) or navigate to Cart page
  ↓
See all cart items:
  • Product name, image, variant, price
  • Quantity stepper (adjust up/down, bounded by stock)
  • Line total
  • Unavailable items flagged with issues ("Only 2 left in stock")
  ↓
Change quantity → totals recalculate live
  ↓
Remove an item (X) → item removed, totals update
  ↓
Enter coupon code → Click "Apply"
  ↓
Coupon validated → discount reflected in totals
  OR Coupon error shown ("This coupon has expired", etc.)
  ↓
View price breakdown:
  • Subtotal (original prices)
  • Product discount
  • Coupon discount
  • Delivery charge (free above ₹500)
  • Total
  ↓
Click "Clear Cart" → all items removed
  OR
Click "Proceed to Checkout" → Checkout page
```

### 1.9 Address Management

```
Navigate to Addresses page (profile or during checkout)
  ↓
See saved addresses (default first)
  ↓
Click "Add New Address"
  ↓
Enter: full name, phone, address line 1, address line 2, landmark, city, state, postal code, country, label (home/work/other)
  ↓
Optionally mark as default
  ↓
Click Save → address added
  ↓
Edit an existing address → update fields → Save
  ↓
Set a different address as default → old default is cleared
  ↓
Delete an address → if it was the default, another is promoted
```

---

## Phase 2 — Checkout & Orders

### 2.1 Checkout

```
Cart page → Click "Proceed to Checkout"
  ↓
Checkout page loads (server-priced: cart, addresses, payment methods)
  ↓
Step 1: Select delivery address
  • Choose from saved addresses
  • Or add a new address
  ↓
Step 2: Select payment method
  • Cash on Delivery
  • Google Pay
  • PhonePe
  • (any active method the admin has configured)
  ↓
Step 3: Review order
  • Items with quantities, prices, variant labels
  • Full price breakdown (subtotal, product discount, coupon discount, delivery, total)
  • Coupon field (enter and apply, or shows already applied)
  • Customer note (optional, max 500 characters)
  ↓
Click "Place Order"
  ↓
System re-validates stock, address, payment method and coupon from the database
  ↓
Order placed successfully
  ↓
Cart cleared
  ↓
Stock decremented
  ↓
Order confirmation page with order number (e.g. ORD-20260812-00221)
```

### 2.2 Payment Status Behaviour

```
Payment method selected at checkout
  ↓
If Google Pay / PhonePe (settlesImmediately = true):
  → Payment status = "paid" immediately
  ↓
If Cash on Delivery (settlesImmediately = false):
  → Payment status = "pending"
  → Settled automatically when order is marked "delivered"
```

### 2.3 Order History

```
Navigate to "My Orders" page
  ↓
See all orders:
  • Order number, date, total, status, payment status
  • Items with images, names, quantities, prices
  ↓
Filter by status (pending, confirmed, processing, shipped, delivered, cancelled)
  ↓
Pagination through order pages
  ↓
Click an order → Order detail page
```

### 2.4 Order Tracking

```
Order detail page
  ↓
See full order information:
  • Order number, date placed
  • Items with product images, names, variants, quantities, prices
  • Delivery address
  • Payment method and payment status
  • Full price breakdown
  • Customer note
  ↓
Status timeline:
  Order Placed → Confirmed → Processing → Shipped → Delivered
  Each step shows when it happened and who advanced it
  ↓
If cancelled: shows cancel reason instead of remaining steps
```

### 2.5 Order Cancellation

```
Order detail page (order status is "pending" or "confirmed")
  ↓
Click "Cancel Order"
  ↓
Enter cancellation reason (optional, defaults to "Cancelled by customer")
  ↓
Confirm cancellation
  ↓
Order status → "cancelled"
  ↓
Stock returned to inventory
  ↓
If payment was "paid" → payment status → "refunded"
  ↓
Note: Orders that are "processing", "shipped" or "delivered" cannot be cancelled online
```

### 2.6 Profile Management

```
Click avatar / profile icon
  ↓
View profile: name, email, phone, avatar
  ↓
Edit profile: change name, phone, avatar
  ↓
Change password: enter current password → enter new password → Save
  ↓
New token issued (session survives)
```

### 2.7 Logout

```
Click "Logout"
  ↓
Auth cookie cleared
  ↓
Token removed from client
  ↓
Redirected to login page
```

---

## Phase 3 — Seller System

### 3.1 Seller Login

```
Open ShopKart login page
  ↓
Enter seller email (e.g. seller@shop.com)
  ↓
Enter password
  ↓
Click Login
  ↓
System detects role = "seller"
  ↓
Redirected to Seller Dashboard (/seller)
```

### 3.2 Seller Dashboard

```
Seller Dashboard loads
  ↓
Select date range: today, this week, this month, or custom from/to
  ↓
Dashboard displays:
  • Total products (active, out-of-stock, low-stock)
  • Total orders (pending, shipped, completed, cancelled)
  • Revenue and units sold
  • Low-stock watchlist
  ↓
Revenue counts only this seller's order lines
  ↓
Click "View Inventory" → Inventory page
  OR
Click "View Orders" → Orders page
  OR
Click a low-stock product → Inventory adjustment
```

### 3.3 Seller Product Management

```
Navigate to "My Products"
  ↓
See own product listing with search
  ↓
Products show: name, category, brand, price, stock, status (active/disabled)
  ↓
Click "Add Product"
  ↓
Product form:
  • Name, description, price, discount price
  • Category (dropdown), brand (dropdown)
  • Stock quantity
  • Images (URLs)
  • Specifications (key-value pairs)
  • Variants (size, colour, SKU, stock, price override)
  • Active / Featured toggles
  ↓
Save → product created, owned by this seller
  ↓
Edit a product → same form, pre-filled
  ↓
Enable / Disable → product shows/hides from storefront
  ↓
Delete → product removed (past order lines survive)
```

### 3.4 Seller Inventory Management

```
Navigate to "Inventory"
  ↓
See products sorted by stock (lowest first)
  ↓
Filter: search by name, stock level (in stock / low stock / out of stock)
  ↓
Each product shows: name, current stock, variants (if any), image
  ↓
Click "Adjust Stock" on a product
  ↓
Choose: relative adjustment (+10, -3) or absolute value (set to 50)
  ↓
Optionally target a specific variant
  ↓
Enter reason (optional)
  ↓
Save → stock updated, movement recorded in ledger
  ↓
Click "View History" → stock movement timeline
  ↓
History shows: adjustments, order sales, cancellation restocks
  Each entry: change, resulting stock, reason, who, when
```

### 3.5 Seller Customer Orders

```
Navigate to "Orders"
  ↓
See orders containing this seller's products
  ↓
Filter: search (order number, customer name, phone), status, payment status, source (customer/seller), date range
  ↓
Each order shows:
  • Order number, customer, date, status
  • Only this seller's items (not other sellers' lines)
  • Seller's subtotal and item count
  ↓
Click an order → Order detail page
  ↓
Detail shows: items, customer info, delivery address, payment method, status timeline
```

### 3.6 Seller Order Processing

```
Order detail page (seller is the sole seller for this order)
  ↓
See allowed next statuses
  ↓
Click "Confirm" / "Processing" / "Ship" / "Deliver" / "Cancel"
  ↓
Enter optional note
  ↓
Status advanced:
  pending → confirmed → processing → shipped → delivered
  ↓
On delivery: cash orders auto-settle (payment status → "paid")
  ↓
On cancellation: stock returned, payment refunded if applicable
  ↓
Note: Shared orders (multi-seller) → status locked, admin must advance
  → "This order also contains other sellers' products, so only an admin can change its status"
```

### 3.7 Seller Direct Order Creation

```
Navigate to "Create Order"
  ↓
Step 1: Select Customer
  • Search by name, email or phone
  • Select from results (customer with their saved addresses)
  ↓
Step 2: Select Products
  • Search own catalogue
  • Select products, choose variants, set quantities
  • Each change re-prices the draft via the server
  ↓
Step 3: Delivery Address
  • Choose from customer's saved addresses
  • Or enter a new address manually
  ↓
Step 4: Payment Method
  • Select from active methods (Cash, Google Pay, PhonePe, etc.)
  ↓
Step 5: Review
  • All items with prices, quantities
  • Full price breakdown
  • Optionally apply a coupon
  • Enter a customer note
  ↓
Click "Create Order"
  ↓
Order created → stock decremented → order number assigned
  ↓
Order source recorded as "seller" with createdById
```

### 3.8 Seller Sales & Revenue

```
Seller Dashboard
  ↓
View revenue: sum of this seller's order lines (not the whole order total)
  ↓
View units sold
  ↓
Shared orders: each seller sees only their own share
  ↓
Date range filters apply to all figures
```

---

## Phase 4 — Admin & Analytics

### 4.1 Admin Login

```
Open ShopKart login page
  ↓
Enter admin email (admin@shop.com)
  ↓
Enter password
  ↓
Click Login
  ↓
System detects role = "admin"
  ↓
Redirected to Admin Dashboard (/admin)
```

### 4.2 Admin Dashboard

```
Admin Dashboard loads
  ↓
Select date range: today, this week, this month, this year, all time, or custom from/to
  ↓
Dashboard displays:
  • Customers: total, active, inactive, joined in range
  • Sellers: total, active, inactive, joined in range
  • Products: total, active, disabled, out-of-stock, low-stock, inventory value
  • Orders: total, pending, shipped, completed, cancelled, by status
  • Sales: total sales, revenue, units sold, average order value
  • By source: customer vs seller split (count + value)
  • By payment method: orders + value per method
  • Low-stock alerts
  • Recent orders
  • Top-selling products
```

### 4.3 Customer Management

```
Navigate to "Customers"
  ↓
See customer list: name, email, phone, status, order count, total spent, last order
  ↓
Search by name, email, or phone
  ↓
Filter: active / inactive
  ↓
Sort: newest, name, orders (desc), spend (desc)
  ↓
Click a customer → Customer detail page
  ↓
Detail shows:
  • Profile and contact info
  • Saved addresses
  • Order counts by status
  • Purchase history (top products by quantity and spend)
  ↓
Click "View Orders" → customer's order list
  ↓
Toggle status: Activate / Deactivate
  → Deactivated customer cannot sign in (token rejected immediately)
```

### 4.4 Seller Management

```
Navigate to "Sellers"
  ↓
See seller list: name, email, status, products, orders, sales, revenue
  ↓
Search, filter (active/inactive), sort (sales, revenue, orders, products, newest, name)
  ↓
Click "Add Seller"
  ↓
Enter: name, email, password, phone
  ↓
Seller account created (sellers cannot self-register)
  ↓
Click a seller → Seller detail page
  ↓
Detail shows:
  • Full performance metrics (products, orders, units, sales, revenue)
  • Top-selling products
  • Product categories breakdown
  • Recent orders
  ↓
Edit seller details / reset password
  ↓
Toggle status: Activate / Deactivate
  → Deactivated seller cannot sign in; their products stay listed until disabled
  ↓
Click "View Products" → seller's product catalogue
  ↓
Click "View Orders" → seller's orders (with their share of each)
```

### 4.5 Admin Product Management

```
Navigate to "Products"
  ↓
See all products across every seller
  ↓
Search, filter by category/seller, sort
  ↓
Each row shows: name, seller, category, brand, price, stock, status
  ↓
Click "Add Product"
  ↓
Product form (same as seller form) + "Sold by" field to assign the owning seller
  ↓
Edit any product → change details, reassign to another seller
  ↓
Enable / Disable → product shows/hides from storefront
  ↓
Delete → product removed
```

### 4.6 Category, Subcategory & Brand Management

```
Navigate to "Categories"
  ↓
See category tree: top-level categories with their subcategories
  ↓
Add top-level category: name, description, image, sort order
  ↓
Add subcategory: name, parent category, image
  • Categories nest one level deep only
  ↓
Edit a category → change name, description, image, status, sort order
  ↓
Disable a category → products stay but category hidden from navigation
  ↓
Delete a category:
  • Blocked if it has subcategories ("Remove or reassign the subcategories first")
  • Blocked if products use it ("3 product(s) still use this category")
  ↓
Navigate to "Brands"
  ↓
Add / Edit / Delete brands
  • Delete blocked if products reference it
```

### 4.7 Order Management

```
Navigate to "Orders"
  ↓
See every order (customer and seller sourced)
  ↓
Search: order number, customer name, email, phone
  ↓
Filter: status, payment status, payment method, order source, seller, customer, date range
  ↓
Sort: newest, oldest, total (desc/asc)
  ↓
Each order shows: order number, customer, total, status, payment, source, date
  ↓
Click an order → Order detail page
  ↓
Detail shows:
  • Customer info, delivery address
  • Items with seller per line
  • Source (customer checkout vs seller direct) and who created it
  • Payment method, payment status
  • Full price breakdown
  • Status timeline with who advanced each step
  ↓
Advance status: pending → confirmed → processing → shipped → delivered
  ↓
Cancel an order (with reason)
  → Stock returned, payment refunded if applicable
  ↓
Override payment status: mark as paid, pending, failed, or refunded
```

### 4.8 Payment Method Management

```
Navigate to "Payment Methods"
  ↓
See all methods: Cash on Delivery, Google Pay, PhonePe, UPI, etc.
  ↓
Each shows: name, code, description, status, settlesImmediately flag
  ↓
Add new method: name, code, description, instructions, icon, active flag, sort order
  ↓
Edit a method → update details
  ↓
Enable / Disable → disabled methods vanish from checkout
  ↓
Delete → blocked if orders reference it; use disable instead
  ↓
Cash on Delivery is permanent: cannot be disabled or deleted
```

### 4.9 Coupon Management

```
Navigate to "Coupons"
  ↓
See all coupons: code, type (percent/fixed), value, min order, usage count, status
  ↓
Add coupon:
  • Code, description, discount type (percent/fixed), discount value
  • Min order value, max discount cap
  • Start date, expiry date
  • Usage limit, active flag
  ↓
Edit a coupon → update any field
  ↓
Delete → blocked if orders have used it ("Deactivate it instead")
```

### 4.10 Inventory Overview

```
Navigate to "Inventory"
  ↓
See stock across every seller
  ↓
Filter: search, seller, category, stock level (in/low/out)
  ↓
Portfolio summary: total products, out-of-stock, low-stock, total units, inventory value
  ↓
Each product shows: name, seller, category, stock, last movement date
  ↓
Click "Adjust Stock" → same form as seller (relative or absolute)
  → Movement recorded with the admin who made it
  ↓
Click "View History" → full stock ledger for that product
```

### 4.11 Sales Reports

```
Navigate to "Reports" → "Sales"
  ↓
Select date range and grouping (day / week / month / year)
  ↓
See chart/table of: orders, units sold, sales, revenue, discount per period
  ↓
Totals row: overall orders, units, sales, revenue, average order value
  ↓
Optionally narrow to one seller
```

### 4.12 Product Reports

```
Navigate to "Reports" → "Products"
  ↓
Best-selling products: ordered by units sold (desc)
  • Each shows: name, seller, category, units sold, revenue, stock
  ↓
Low-selling products: ordered by units sold (asc)
  • Products that sold nothing in the window still appear
  ↓
Filter by seller, category, search
```

### 4.13 Seller Reports

```
Navigate to "Reports" → "Sellers"
  ↓
See every seller side by side:
  • Products, orders, units sold, sales, revenue
  • Pending, completed, cancelled counts
  ↓
Sort by sales, revenue, orders, products, name
  ↓
Totals row: combined across all sellers
```

### 4.14 Payment Reports

```
Navigate to "Reports" → "Payments"
  ↓
See breakdown by payment method:
  • Orders, sales, revenue per method
  • Split by payment status (paid, pending, refunded, failed)
  ↓
Overall payment status distribution
```

### 4.15 Order-Source Reports

```
Navigate to "Reports" → "Order Source"
  ↓
Customer checkouts vs seller direct orders:
  • Order count, sales, revenue, cancelled count, share (%)
  ↓
Which seller raised the direct orders (name, count, sales)
```

### 4.16 Business Analytics

```
Navigate to "Analytics"
  ↓
Select date range and grouping
  ↓
Charts and tables:
  • Sales trend (line chart: sales/revenue per period)
  • Order trend (bar chart: orders per period)
  • Order status distribution (doughnut/pie)
  • Payment method usage (bar)
  • Order source split (customer vs seller)
  • Customer growth (running total over time)
  • Seller growth (running total over time)
  • Top-selling products (rank)
  ↓
Each chart has a data table that can be toggled open
```

### 4.17 Admin Permissions & Security

```
All admin routes:
  • Protected by restrictTo('admin') middleware
  • Sellers and customers get 403 "This action is restricted to: admin."
  ↓
All seller routes:
  • Protected by restrictTo('seller')
  • Admins and customers get 403
  ↓
Ownership enforcement:
  • Sellers can only access their own products, inventory, orders
  • One seller editing another's product → 403 "This product belongs to another seller"
  ↓
Account deactivation:
  • Deactivated accounts are rejected on the NEXT request (not just at login)
  • "This account has been disabled"
  ↓
Token validation:
  • Expired or invalid token → 401 "Your session is invalid or has expired"
  • No token → 401 "You are not logged in"
```

### 4.18 Logout

```
Any role (customer, seller, admin)
  ↓
Click "Logout"
  ↓
POST /api/auth/logout
  ↓
Auth cookie cleared
  ↓
Client removes stored token
  ↓
Redirected to login page
  ↓
All protected routes now return 401
```

---
