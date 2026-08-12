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
