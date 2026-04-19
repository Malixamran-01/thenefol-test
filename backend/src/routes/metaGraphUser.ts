/**
 * Re-export handlers for Graph **user** token routes mounted at /api/admin/meta/graph/*
 * Implementation lives in metaBusinessSuite.ts (same handlers as /api/admin/meta-business/*).
 *
 * Do not add Page-token endpoints here — use metaPageAccess.ts and /api/admin/meta/page/*.
 */
export {
  suiteOverview as graphOverview,
  suiteMe as graphMe,
  suiteBusinesses as graphBusinesses,
  suitePages as graphPages,
  suitePageDetail as graphPageDetail,
  suiteIgMedia as graphIgMedia,
  suiteIgInsights as graphIgInsights,
  suiteAdAccount as graphAdAccount,
  suiteAdPixels as graphAdPixels,
  suiteProductCatalogs as graphProductCatalogs,
  suiteBusinessOwnedAdAccounts as graphBusinessOwnedAdAccounts,
} from './metaBusinessSuite'
