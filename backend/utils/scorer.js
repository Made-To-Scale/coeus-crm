/**
 * Ported from n8n Workflow
 * Scores and tiers leads based on social proof and contactability
 */

function toStr(v) {
    return (v ?? "").toString().trim();
}

function scoreLead(lead) {
    if (lead.is_closed) return { score: 0, tier: "DROP", reasons: [{ reason: "Negocio cerrado", points: 0 }] };

    let s = 0;
    const reasons = [];

    // 1. Email & Verification (Total 35)
    if (lead.email_primary || lead.email) {
        if (lead.email_verified || lead.meta?.email_verified) {
            s += 35;
            reasons.push({ reason: "Email Verificado", points: 35 });
        } else {
            s += 15;
            reasons.push({ reason: "Email detectado", points: 15 });
        }
    }

    // 2. Website & Health (Total 10)
    if (lead.website && lead.website.trim() !== "") {
        const isSocial = /instagram\.com|facebook\.com|twitter\.com|linkedin\.com|tiktok\.com|youtube\.com/i.test(lead.website);
        if (isSocial) {
            s += 3;
            reasons.push({ reason: "Redes Sociales", points: 3 });
        } else {
            s += 10;
            reasons.push({ reason: "Website propia", points: 10 });
        }
    }

    // 3. Phone & WhatsApp (Total 15)
    if (lead.phone_primary || lead.phone_number) {
        if (lead.phone_type === 'mobile' || lead.whatsapp_likely || lead.meta?.whatsapp_likely) {
            s += 15;
            reasons.push({ reason: "WhatsApp (Móvil ES)", points: 15 });
        } else {
            s += 5;
            reasons.push({ reason: "Teléfono fijo", points: 5 });
        }
    }

    // 4. Social Proof: Reviews (Total 15)
    const reviews = Number(lead.reviewsCount || lead.reviews_count || 0);
    if (reviews >= 100) {
        s += 15;
        reasons.push({ reason: "Popularidad (>100 reseñas)", points: 15 });
    } else if (reviews >= 50) {
        s += 10;
        reasons.push({ reason: "Popularidad (>50 reseñas)", points: 10 });
    } else if (reviews >= 10) {
        s += 5;
        reasons.push({ reason: "Popularidad (>10 reseñas)", points: 5 });
    }

    // 5. Social Proof: Rating (Total 10)
    const rating = Number(lead.totalScore || lead.rating || 0);
    if (rating >= 4.5) {
        s += 10;
        reasons.push({ reason: "Excelente Rating (>=4.5)", points: 10 });
    } else if (rating >= 4.0) {
        s += 5;
        reasons.push({ reason: "Buen Rating (>=4.0)", points: 5 });
    }

    // 6. Business Info / Tech (Total 15)
    if (lead.meta?.ai_summary_deep || lead.personalization_summary) {
        s += 10;
        reasons.push({ reason: "Business Intelligence", points: 10 });
    }
    if (lead.meta?.is_ecommerce || lead.ecommerce?.is_ecommerce) {
        s += 5;
        reasons.push({ reason: "E-commerce detectado", points: 5 });
    }

    if (s > 100) s = 100;

    // Calculate Tier based on Premium Logic
    const tier = calculateTier(lead);

    return { score: s, tier, reasons };
}

function calculateTier(lead) {
    const hasVerifiedEmail = !!(lead.email_verified || lead.email_primary); // If we are at scraping, email exists but not verified yet
    const isMobile = lead.phone_type === 'mobile';
    const isLandline = lead.phone_type === 'landline';
    const hasPhone = isMobile || isLandline;

    // 1. GOLD: Verified Email + WhatsApp (Mobile)
    if (hasVerifiedEmail && isMobile) return 'GOLD';

    // 2. SILVER: Verified Email + (Fijo o Nada)
    if (hasVerifiedEmail) return 'SILVER';

    // 3. WHATSAPP: No Email + WhatsApp (Mobile)
    if (isMobile) return 'WHATSAPP';

    // 4. COLDCALL: No Email + Solo Fijo
    if (isLandline) return 'COLDCALL';

    // 5. TRASH: Nothing
    return 'TRASH';
}

function routeLead(scoring, lead) {
    const channel = {
        email: !!toStr(lead.email_primary),
        whatsapp: !!lead.whatsapp_likely,
        phone_call: !!toStr(lead.phone_primary),
        phone_type: toStr(lead.phone_type) || "unknown",
    };

    let route = "ENRICH";

    // TRASH logic
    if (scoring.tier === "TRASH" || scoring.tier === "DROP") {
        route = "DISCARDED";
    }
    // If it has email, it's ready for enrichment/verification
    else if (channel.email) {
        route = "OUTREACH_READY";
    }
    // If it has phone only, it's ready for manual outreach or enrichment
    else if (channel.whatsapp || channel.phone_call) {
        route = "OUTREACH_READY";
    }

    return { route, channel };
}

module.exports = { scoreLead, routeLead, calculateTier };

