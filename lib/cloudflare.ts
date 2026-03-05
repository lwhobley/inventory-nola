/**
 * Cloudflare Worker KV, Cache, and Security utilities
 */

export interface CloudflareConfig {
  zoneId: string
  apiToken: string
}

const config: CloudflareConfig = {
  zoneId: process.env.NEXT_PUBLIC_CLOUDFLARE_ZONE_ID || '',
  apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
}

/**
 * Cloudflare API client
 */
export const cloudflareAPI = {
  baseUrl: 'https://api.cloudflare.com/client/v4',

  async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Cloudflare API request error:', error)
      throw error
    }
  },

  /**
   * Purge cache by URL
   */
  async purgeCache(urls: string[]): Promise<any> {
    return this.request('POST', `/zones/${config.zoneId}/purge_cache`, {
      files: urls,
    })
  },

  /**
   * Purge cache by tag
   */
  async purgeCacheByTag(tags: string[]): Promise<any> {
    return this.request('POST', `/zones/${config.zoneId}/purge_cache`, {
      tags,
    })
  },

  /**
   * Create a firewall rule
   */
  async createFirewallRule(expression: string, action: 'block' | 'allow' | 'challenge' = 'challenge'): Promise<any> {
    return this.request('POST', `/zones/${config.zoneId}/firewall/rules`, {
      actions: [{ id: action.toUpperCase() }],
      filter: { expression },
    })
  },

  /**
   * Set page rule
   */
  async setPageRule(target: string, actions: any[]): Promise<any> {
    return this.request('POST', `/zones/${config.zoneId}/pagerules`, {
      targets: [{ target, constraint: { operator: 'matches' } }],
      actions,
      priority: 1,
      status: 'active',
    })
  },

  /**
   * Get zone analytics
   */
  async getAnalytics(since: string, until: string): Promise<any> {
    return this.request(
      'GET',
      `/zones/${config.zoneId}/analytics/dashboard?since=${since}&until=${until}`
    )
  },
}

/**
 * Rate limiting with Cloudflare
 */
export const cloudflareRateLimit = {
  /**
   * Create rate limiting rule
   */
  async createRule(
    expression: string,
    threshold: number,
    period: number,
    action: 'block' | 'challenge' = 'challenge'
  ): Promise<any> {
    return cloudflareAPI.request('POST', `/zones/${config.zoneId}/rate_limit`, {
      match: { request: { url: { path: { matches: expression } } } },
      threshold,
      period,
      action: { mode: action },
    })
  },
}

/**
 * DDoS protection with Cloudflare
 */
export const cloudflareDDosProtection = {
  /**
   * Enable advanced DDoS protection
   */
  async enableAdvancedProtection(): Promise<any> {
    return cloudflareAPI.request('PATCH', `/zones/${config.zoneId}/settings/security_level`, {
      value: 'under_attack',
    })
  },

  /**
   * Set challenge level
   */
  async setChallengeLevel(level: 'off' | 'essentially_off' | 'low' | 'medium' | 'high' | 'under_attack'): Promise<any> {
    return cloudflareAPI.request('PATCH', `/zones/${config.zoneId}/settings/challenge_ttl`, {
      value: level,
    })
  },
}

/**
 * WAF (Web Application Firewall) with Cloudflare
 */
export const cloudflareWAF = {
  /**
   * Create WAF rule group
   */
  async createRuleGroup(name: string, rules: any[]): Promise<any> {
    return cloudflareAPI.request('POST', `/zones/${config.zoneId}/waf/rules`, {
      group: { id: name },
      rules,
    })
  },

  /**
   * Enable OWASP ModSecurity Core Rule Set
   */
  async enableOWASP(): Promise<any> {
    return cloudflareAPI.request('PATCH', `/zones/${config.zoneId}/waf/groups/de677dc8760666f4e3e30045abae66e5`, {
      mode: 'on',
    })
  },

  /**
   * Create custom WAF rule
   */
  async createCustomRule(expression: string, action: 'block' | 'allow' | 'log'): Promise<any> {
    return cloudflareAPI.request('POST', `/zones/${config.zoneId}/firewall/rules`, {
      actions: [{ id: action.toUpperCase() }],
      filter: { expression },
      enabled: true,
    })
  },
}

/**
 * Cloudflare KV (Key-Value) storage
 * Used for distributed caching and configuration
 */
export const cloudflareKV = {
  /**
   * Simulate KV storage using Cloudflare API
   * In production, use Cloudflare Workers KV
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    // This would use Cloudflare Workers KV API
    console.log(`KV Set: ${key} = ${value}`)
  },

  async get(key: string): Promise<string | null> {
    // This would use Cloudflare Workers KV API
    console.log(`KV Get: ${key}`)
    return null
  },

  async delete(key: string): Promise<void> {
    // This would use Cloudflare Workers KV API
    console.log(`KV Delete: ${key}`)
  },
}

/**
 * Cloudflare Page Rules for performance and security
 */
export const cloudflarePageRules = {
  /**
   * Enable caching for API responses
   */
  async cacheAPIResponses(): Promise<any> {
    return cloudflareAPI.setPageRule('/api/*', [
      {
        id: 'cache_level',
        value: 'cache_everything',
      },
      {
        id: 'browser_cache_ttl',
        value: 3600, // 1 hour
      },
    ])
  },

  /**
   * Redirect HTTP to HTTPS
   */
  async redirectHttpToHttps(): Promise<any> {
    return cloudflareAPI.setPageRule('*', [
      {
        id: 'always_use_https',
        value: 'on',
      },
    ])
  },

  /**
   * Set cache TTL
   */
  async setCacheTTL(pattern: string, ttl: number): Promise<any> {
    return cloudflareAPI.setPageRule(pattern, [
      {
        id: 'browser_cache_ttl',
        value: ttl,
      },
    ])
  },
}

/**
 * Cloudflare Analytics and Logging
 */
export const cloudflareAnalytics = {
  /**
   * Get request logs
   */
  async getRequestLogs(since: string, until: string): Promise<any> {
    return cloudflareAPI.getAnalytics(since, until)
  },

  /**
   * Log security events
   */
  async logSecurityEvent(
    type: string,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    // Send to Cloudflare Logpush
    console.log(`Security Event: ${type} for user ${userId}`, details)
  },
}

/**
 * Cloudflare configuration helper
 */
export const cloudflareSetup = {
  /**
   * Initialize Cloudflare security for production
   */
  async initializeProduction(): Promise<void> {
    try {
      console.log('Initializing Cloudflare for production...')

      // Enable HTTPS
      await cloudflarePageRules.redirectHttpToHttps()

      // Enable OWASP protection
      await cloudflareWAF.enableOWASP()

      // Set security level
      await cloudflareDDosProtection.setChallengeLevel('medium')

      // Create rate limiting
      await cloudflareRateLimit.createRule('/api/*', 100, 60)

      console.log('Cloudflare production setup complete')
    } catch (error) {
      console.error('Cloudflare setup error:', error)
    }
  },
}

export default cloudflareAPI
