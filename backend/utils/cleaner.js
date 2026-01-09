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
        let target = url;
        if (url.includes('/url?q=') || url.includes('google.com/url?q=')) {
            // It's a google redirect
            const parts = url.split('q=')[1];
            if (parts) {
                target = decodeURIComponent(parts.split('&')[0]);
            }
        }
        const u = new URL(target.startsWith('http') ? target : `https://${target}`);
        return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return "";
    }
}

function cleanWebsiteUrl(url) {
    if (!url) return "";
    if (url.includes('/url?q=') || url.includes('google.com/url?q=')) {
        const parts = url.split('q=')[1];
        if (parts) {
            return decodeURIComponent(parts.split('&')[0]);
        }
    }
    return url;
}

function normalizePhone(raw) {
    const s = toStr(raw);
    if (!s) return "";
    // Remove all non-numeric except '+'
    const cleaned = s.replace(/[^\d+]/g, "");
    if (!cleaned) return "";

    // If it already has +34 or similar, keep it but ensure '+'
    if (cleaned.startsWith("+")) return cleaned;

    const digits = cleaned.replace(/[^\d]/g, "");

    // Spanish normalization
    if (digits.length === 9) {
        // Starts with 6,7,8,9?
        if (/^[6789]/.test(digits)) return `+34${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("34")) {
        return `+${digits}`;
    }

    // Fallback: just add '+' if missing and looks like it has CC, 
    // or return as is if unsure
    return digits.length > 6 ? `+${digits}` : digits;
}

function isSocialMedia(url) {
    const s = toStr(url).toLowerCase();
    return s.includes('instagram.com') ||
        s.includes('facebook.com') ||
        s.includes('linkedin.com') ||
        s.includes('twitter.com') ||
        s.includes('tiktok.com') ||
        s.includes('t.me');
}

function isProviderDomain(domain) {
    if (!domain) return false;
    const providers = [
        'wixsite.com', 'myshopify.com', 'squarespace.com', 'wordpress.com',
        'weebly.com', 'jimdo.com', 'strikingly.com', 'webflow.io',
        'google.com', 'site123.me', 'bit.ly', 'linktr.ee'
    ];
    return providers.some(p => domain.endsWith(p));
}

function pickPrimaryEmail(emails, domain) {
    const normalized = uniq((emails || []).map(normEmail));

    // Priority 1: Matches domain
    const domainMatch = normalized.find((e) => domain && e.endsWith(`@${domain}`));
    if (domainMatch) return domainMatch;

    // Priority 2: Not info@ or general if possible
    const specific = normalized.find(e => !e.startsWith('info@') && !e.startsWith('contacto@') && !e.startsWith('admin@'));
    if (specific) return specific;

    return normalized[0] || "";
}

function pickPrimaryPhone(phone, phones) {
    const candidates = uniq([
        normalizePhone(phone),
        ...(phones || []).map(normalizePhone),
    ]).filter(Boolean);

    // Priority: Mobile first for outreach?
    const mobile = candidates.find(p => {
        const d = p.replace(/\D/g, '');
        const es = d.startsWith('34') ? d.slice(2) : d;
        return es.startsWith('6') || es.startsWith('7');
    });

    return mobile || candidates[0] || "";
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
    if (!e164) return "unknown";
    const digits = e164.replace(/\D/g, "");
    const es = digits.startsWith("34") ? digits.slice(2) : digits;

    if (es.startsWith("6") || es.startsWith("7")) return "mobile";
    if (es.startsWith("8") || es.startsWith("9")) return "landline";
    return "unknown";
}

function whatsappLikely(lead) {
    // Current assumption: any Spanish mobile has WhatsApp
    return lead.phone_type === "mobile";
}

function cleanLead(r) {
    const website = cleanWebsiteUrl(toStr(r.website));
    const domain = toStr(r.domain) || extractDomainFromUrl(website);

    // Extract emails from ALL possible fields
    const emailSources = [
        r.email,
        r.emails,
        r.verifiedEmails,
        r.emailAddresses,
        r.contactEmail
    ].filter(Boolean).flat();

    const emails_all = uniq(emailSources.map(normEmail)).filter(e => e && e.includes('@'));
    const email_primary = pickPrimaryEmail(emails_all, domain);

    // Extract phones from ALL possible fields
    const phoneSources = [
        r.phone,
        r.phoneNumber,
        r.phones,
        r.phoneNumbers,
        r.contactPhone
    ].filter(Boolean).flat();

    const phones_all = uniq(phoneSources.map(normalizePhone)).filter(p => p && p.length > 6);
    const phone_primary = pickPrimaryPhone(phones_all[0], phones_all.slice(1));


    console.log(`[CLEANER] Extracted ${phones_all.length} phones:`, phones_all);

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

    const isSocial = isSocialMedia(lead_clean.website);
    const isProvider = isProviderDomain(lead_clean.domain);

    const enrichment_needed = {
        missing_email: !lead_clean.email_primary,
        missing_website: !lead_clean.website,
        missing_domain: !lead_clean.domain,
        is_social_media: isSocial,
        is_provider_domain: isProvider,
        warning: isSocial ? 'LA WEB DETECTADA ES UNA RED SOCIAL. SE REQUIERE BUSCAR WEB REAL.' :
            isProvider ? 'DOMINIO DE PROVEEDOR (WIX/SHOPIFY). POSIBLE FALTA DE DATOS PROPIOS.' : null,
        missing_contact_person: true,
    };

    console.log(`[CLEANER] Final result - Emails: ${emails_all.length}, Phones: ${phones_all.length}, Website: ${website ? 'YES' : 'NO'}`);

    return { lead_clean, enrichment_needed };
}

module.exports = { cleanLead, isProviderDomain };
