/**
 * Bots that don't run the hash-routed SPA and should get server-rendered HTML instead:
 * search engines, social link-preview fetchers, and AI crawlers / AI agents browsing on a user's behalf.
 * Keep in sync with the `$is_content_crawler` map in nginx.conf.
 */
const SEARCH_AND_SOCIAL =
  'Googlebot|Google-InspectionTool|Google-Structured-Data-Testing-Tool|AdsBot-Google|Mediapartners-Google|GoogleOther|' +
  'bingbot|BingPreview|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|Applebot|' +
  'facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|' +
  'Embedly|Quora Link Preview|outbrain|W3C_Validator'

const AI_AGENTS =
  'GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|Claude-Web|anthropic-ai|' +
  'PerplexityBot|Perplexity-User|Amazonbot|CCBot|meta-externalagent|meta-externalfetcher|cohere-ai|' +
  'DuckAssistBot|MistralAI-User|YouBot|Diffbot|Timpibot|PetalBot'

const CRAWLER_RE = new RegExp(`${SEARCH_AND_SOCIAL}|${AI_AGENTS}`, 'i')
const AI_AGENT_RE = new RegExp(AI_AGENTS, 'i')

/** Detect bots that should receive a server-rendered page instead of the hash-SPA redirect. */
export function isSocialCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return CRAWLER_RE.test(userAgent)
}

/** AI crawlers and agents (subset of isSocialCrawler). */
export function isAiAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return AI_AGENT_RE.test(userAgent)
}
