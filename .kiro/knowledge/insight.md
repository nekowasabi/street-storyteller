# Phase 5 — External API Integration & Caching Foundations

This architecture note captures the baseline plan for introducing external
story-data providers and a reusable caching layer. The goal is to deliver
pluggable interfaces and cache primitives without binding to specific vendors
yet, preserving the existing layered architecture.

---

## 1. Scope and Objectives

- **Targets**: shared abstractions for external data access, application-level
  orchestration and policy, infrastructure adapters (HTTP + cache stores).
- **Out of Scope**: concrete provider features (e.g., specific SaaS
  integrations), CLI UX, long-term persistence, distributed caching.
- **Key Outcomes**:
  - Consistent interface for fetching story metadata (characters, settings,
    prompts) from remote APIs.
  - Cache foundation (memory/file) with policy hooks to control TTL and stale
    handling.
  - Configurable provider registry enabling future plugin expansion.

---

## 2. Layered Components

### 2.1 Shared Layer (`src/shared`)

- **external/types.ts**
  - `ExternalDataSource` interface with cancellable methods (`fetchCharacters`,
    `fetchSetting`, `searchPrompts`, etc.).
  - `ExternalRequestContext` (locale, pagination, correlationId) passed through
    calls.
  - `ExternalDataError` discriminated union (`network_error`, `rate_limited`,
    `auth_failed`, `invalid_request`, `unexpected`).
- **cache/types.ts**
  - `CacheStore` contract (`get`, `set`, `delete`, `purge`, `withScope`)
    accepting `CacheEntryOptions` (TTL, staleWhileRevalidate).
  - `CacheEntryMetadata` tracking timestamps, hit counts, validator digests.
  - `CacheKeyBuilder` helper to compose stable keys
    (`provider/resource/arg-hash`).

### 2.2 Application Layer (`src/application`)

- **external/external_data_service.ts**
  - Primary facade coordinating cache lookups, provider selection, retries, and
    normalization.
  - Accepts `CachePolicyRegistry`, `CacheStore`, and `ExternalProviderRegistry`.
- **external/provider_registry.ts**
  - Maps provider id → `ExternalDataSource` instance, resolves defaults from
    configuration.
- **cache/cache_policy_registry.ts**
  - Declarative policies per operation (`default`, `characters`, `settings`),
    storing TTL, stale rules, retry hints.
- **cache/cache_metrics.ts** (optional stretch)
  - Collects hit/miss counters for diagnostics; initial version can stub out
    metrics.

### 2.3 Infrastructure Layer (`src/infrastructure`)

- **external/http_external_data_source.ts**
  - Generic HTTP adapter using injected `fetch` implementation, configurable
    base URL, headers, auth token resolver.
  - Emits structured logs; maps HTTP failures to `ExternalDataError`.
- **cache/in_memory_cache_store.ts**
  - Least-recently-used map with TTL eviction and scoped namespaces.
- **cache/file_cache_store.ts**
  - JSON-serialized cache with versioned metadata; persists under configured
    directory.
- **cache/composite_cache_store.ts**
  - Chains multiple stores (memory → file) for layered caching.
- **external/index.ts**
  - Factory creating provider instances from config (e.g., `type: "http"`,
    `options.baseUrl`).

---

## 3. Configuration Additions

- Extend `AppConfig`:
  ```ts
  export interface ExternalProviderConfig {
    id: string;
    type: "http" | "mock";
    baseUrl?: string;
    headers?: Record<string, string>;
    apiKeyEnv?: string;
    timeoutMs?: number;
  }

  export interface CacheConfig {
    directory?: string;
    defaultTtlSeconds: number;
    staleWhileRevalidateSeconds?: number;
    maxEntries?: number;
  }
  ```
- New sections: `config.external.providers`, `config.external.defaultProvider`,
  `config.cache`.
- CLI flags for later phases (`--provider`, `--no-cache`, `--cache-ttl`) planned
  but not yet implemented.

---

## 4. Control Flow & Policies

1. CLI/UseCase requests data →
   `ExternalDataService.getCharacters(query, context)`.
2. Service consults `CachePolicyRegistry` for TTL & stale handling.
3. `CacheStore` checked for fresh entry (memory first, then file).
4. On miss/stale:
   - Acquire provider via registry.
   - Execute request with retry/backoff (policy-driven).
   - Normalize response to shared DTOs.
   - Persist to cache (respecting TTL) and return to caller.
5. On provider failure + stale entry available → return stale data with warning
   metadata if policy allows (`allowStaleOnError`).

---

## 5. Testing Strategy

- **Shared**: Unit tests verifying `CacheKeyBuilder` determinism, `CacheStore`
  compliance (using fake store), error type guards.
- **Application**: Tests for cache hit/miss behavior, stale fallback, provider
  selection, retry logic (mock providers + fake timers).
- **Infrastructure**:
  - HTTP adapter tests with mocked `fetch` to validate header injection, error
    mapping.
  - Cache stores ensuring TTL expiration, persistence, namespace isolation.
- **Integration Smoke**: Use `stubby` server or manual mock to exercise
  service + cache + adapter end-to-end (future once CLI ties in).

---

## 6. Sequencing (Suggested)

1. Implement shared contracts (`external/types.ts`, `cache/types.ts`, key
   builder).
2. Build `InMemoryCacheStore` + tests.
3. Draft `ExternalDataService` with policy registry + minimal
   `CompositeCacheStore`.
4. Introduce HTTP adapter skeleton and config wiring.
5. Add file cache store and persistence tests.
6. Document configuration and extend CLI context (Phase 5 follow-up).

---

## 7. Risks & Mitigations

- **Cache Invalidation Complexity**: Start with TTL-only policies; plan for
  explicit purge hooks before multi-writer scenarios.
- **Credential Handling**: Config uses env references (`apiKeyEnv`); enforce
  that secrets never land in logs.
- **Concurrency**: Cache store must handle concurrent refresh (consider promise
  memoization in service for same key).
- **Extensibility**: Keep provider interface minimal but future-proof (e.g.,
  optional streaming); rely on discriminated errors for cross-provider
  consistency.

---

## 8. Follow-Up Deliverables

- `docs/runtime/external_apis.md` describing configuration, cache behavior,
  troubleshooting.
- Update `@PLAN.md` Process 5 with actionable sub-steps matching this
  architecture.
- Prepare mock provider (infrastructure/mock) for integration testing and
  offline CI runs.
