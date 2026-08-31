import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Gen Money renders every authenticated route per-request, so no incremental
 * cache is required for a correct deployment.
 *
 * To add KV-backed ISR caching later:
 *   1. wrangler kv namespace create NEXT_INC_CACHE_KV
 *   2. add the returned id to `kv_namespaces` in wrangler.jsonc
 *   3. uncomment the two lines below
 */
// import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // incrementalCache: kvIncrementalCache,
});
