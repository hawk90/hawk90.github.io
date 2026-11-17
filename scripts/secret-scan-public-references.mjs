// Exact reviewed public citations whose URL slugs resemble credential prefixes.
// Do not allow arbitrary sk-hynix tokens, domains, query strings, or suffixes.
const reviewedUrls = new Set([
  'https://news.skhynix.com/en/sk-hynix-partners-with-tsmc-to-strengthen-hbm-technological-leadership/',
  'https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/',
  'https://news.skhynix.com/sk-hynix-starts-mass-production-of-high-speed-dram-hbm2e/',
  'https://news.skhynix.com/sk-hynix-to-supply-industrys-first-hbm3-dram-to-nvidia/',
  'https://www.storagenewsletter.com/2025/04/23/sk-hynix-completes-customer-validation-of-cxl-2-0-based-ddr5/',
]);

export function isReviewedPublicReference(content, credentialMatch) {
  for (const url of content.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
    if (reviewedUrls.has(url[0]) && credentialMatch.index >= url.index &&
        credentialMatch.index + credentialMatch[0].length <= url.index + url[0].length) return true;
  }
  return false;
}
