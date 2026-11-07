# Public analytics and consent — v0.5.4

The landing page offers **Accept** and **Decline** for optional analytics when a valid GA4 measurement ID is configured. The choice is stored locally with a versioned key and can be changed from **Analytics choices** in the landing footer. Keyboard users can reach every control, and no analytics script is loaded before acceptance. A blank `SENATLA_GA4_MEASUREMENT_ID` disables the script and the consent prompt.

Application code emits only `landing_view`, `sign_in_click`, and `apk_download` from the public landing page. The event API accepts no identity, amount, operational record, or arbitrary payload. Protected workspace routes do not emit application analytics events. GA4 may collect its own automatic events after consent; disable unwanted automatic or enhanced measurement in the GA4 property and verify its live event stream before enabling the production ID.

To configure a property, set `SENATLA_GA4_MEASUREMENT_ID` to a `G-` measurement ID in the approved Vercel environment and redeploy. Do not put a GA4 API secret or service-role credential in the browser runtime configuration. Use the [GA4 import workbook](analytics-workbook-v0.5.4.md) only for actual aggregate event counts.
