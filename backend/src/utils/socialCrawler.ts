/** Detect bots that fetch link previews (must not redirect them to hash-only SPA URLs). */
export function isSocialCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|Google-Structured-Data-Testing-Tool|bingpreview|Embedly|Quora Link Preview|outbrain|W3C_Validator/i.test(
    userAgent
  )
}
