/** Detect bots that should receive a server-rendered meta page instead of the hash-SPA redirect.
 *  Includes search engine crawlers (Google, Bing, etc.) and social link-preview fetchers. */
export function isSocialCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return /Googlebot|Google-InspectionTool|Google-Structured-Data-Testing-Tool|AdsBot-Google|Mediapartners-Google|bingbot|BingPreview|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|Embedly|Quora Link Preview|outbrain|W3C_Validator/i.test(
    userAgent
  )
}
