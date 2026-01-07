/**
 * Ported from n8n Workflow
 * Cleans and normalizes lead data from Apify
 */

function toStr(v) {
    return (v ?? "").toString().trim();
}

function uniq(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
}

function normEmail(e) {
    return toStr(e).toLowerCase();
}

function extractDomainFromUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return "";
    }
}

function normalizePhone(raw) {
    const s = toStr(raw);
    if (!s) return "";
    const cleaned = s.replace(/[^\d+]/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("+")) return cleaned;

    const digits = cleaned.replace(/[^\d]/g, "");
    // ES convenience normalization when local 9 digits
    if (digits.length === 9) return `+34${digits}`;
    if (digits.length === 11 && digits.startsWith("34")) return `+${digits}`;
    return digits ? `+${digits}` : "";
}

function pickPrimaryEmail(emails, domain) {
    const normalized = uniq((emails || []).map(normEmail));

    const match = normalized.find((e) => domain && e.endsWith(`@${domain}`));
    if (match) return match;

    return normalized[0] || "";
}

function pickPrimaryPhone(phone, phones) {
    const candidates = uniq([
        normalizePhone(phone),
        ...(phones || []).map(normalizePhone),
    ]).filter(Boolean);

    return candidates[0] || "";
}

function detectEcommerce(scrapedUrls) {
    const urls = (scrapedUrls || []).map((u) => toStr(u).toLowerCase());
    const re = /\/(shop|tienda|store|carrito|checkout|producto|productos)\b/;

    const matched = urls.filter((u) => re.test(u));
    return {
        is_ecommerce: matched.length > 0,
        matched_urls: matched,
    };
}

function phoneTypeES(e164) {
    const p = toStr(e164).replace(/[^\d+]/g, "");
    if (!p) return "unknown";

    const digits = p.startsWith("+") ? p.slice(1) : p;

    // remove ES country code if present
    const es = digits.startsWith("34") ? digits.slice(2) : digits;

    if (es.startsWith("6") || es.startsWith("7")) return "mobile";
    if (es.startsWith("8") || es.startsWith("9")) return "landline";
    return "unknown";
}

function whatsappLikely(lead) {
    const cc = toStr(lead.countryCode).toUpperCase();
    if (cc !== "ES") return false;
    return lead.phone_type === "mobile";
}

function cleanLead(r) {
    const website = toStr(r.website);
    const domain = toStr(r.domain) || extractDomainFromUrl(website);

    const emails_all = uniq((r.emails || []).map(normEmail));
    const email_primary = pickPrimaryEmail(emails_all, domain);

    const phone_primary = pickPrimaryPhone(r.phone, r.phones || []);
    const phones_all = uniq([
        phone_primary,
        ...(r.phones || []).map(normalizePhone),
    ]).filter(Boolean);

    const categories = uniq((r.categories || []).map((c) => toStr(c)));
    const scrapedUrls = uniq((r.scrapedUrls || []).map((u) => toStr(u)));

    const ecommerce = detectEcommerce(scrapedUrls);

    const placeId = toStr(r.placeId);

    const phone_type = phoneTypeES(phone_primary);

    const dedupe_key_primary = placeId ? `place:${placeId}` : "";
    const dedupe_key_secondary =
        domain && toStr(r.city)
            ? `domcity:${domain}:${toStr(r.city).toLowerCase()}`
            : "";
    const dedupe_key_tertiary =
        toStr(r.title) && toStr(r.address)
            ? `nameaddr:${toStr(r.title).toLowerCase()}:${toStr(r.address).toLowerCase()}`
            : "";

    const lead_clean = {
        // core identity
        name: toStr(r.title),
        gmb_category: toStr(r.categoryName),
        categories,

        // contact
        website,
        domain,
        email_primary,
        emails_all,
        phone_primary,
        phones_all,
        phone_type, // mobile | landline | unknown
        whatsapp_likely: false, // set below

        // location
        address: toStr(r.address),
        street: toStr(r.street),
        neighborhood: toStr(r.neighborhood),
        city: toStr(r.city),
        postalCode: toStr(r.postalCode),
        state: toStr(r.state),
        countryCode: toStr(r.countryCode),

        // proof
        totalScore: Number(r.totalScore || 0),
        reviewsCount: Number(r.reviewsCount || 0),
        imagesCount: Number(r.imagesCount || 0),

        // status
        permanentlyClosed: !!r.permanentlyClosed,
        temporarilyClosed: !!r.temporarilyClosed,
        is_closed: !!r.permanentlyClosed || !!r.temporarilyClosed,

        // signals
        ecommerce,

        // traceability
        placeId,
        cid: toStr(r.cid),
        fid: toStr(r.fid),
        scrapedAt: toStr(r.scrapedAt),
        source: "google_maps_apify",
        scrapedUrls,

        // dedupe keys
        dedupe_key_primary,
        dedupe_key_secondary,
        dedupe_key_tertiary,
    };

    lead_clean.whatsapp_likely = whatsappLikely(lead_clean);

    const enrichment_needed = {
        missing_email: !lead_clean.email_primary,
        missing_website: !lead_clean.website,
        missing_domain: !lead_clean.domain,
        missing_contact_person: true,
    };

    return { lead_clean, enrichment_needed };
}

module.exports = { cleanLead };
