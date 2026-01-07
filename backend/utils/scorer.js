/**
 * Ported from n8n Workflow
 * Scores and tiers leads based on social proof and contactability
 */

function toStr(v) {
    return (v ?? "").toString().trim();
}

function scoreLead(lead) {
    if (lead.is_closed) return { score: 0, tier: "DROP", reasons: ["closed"] };

    let s = 0;
    const reasons = [];

    const hasEmail = !!toStr(lead.email_primary);
    const hasWebsite = !!toStr(lead.website);
    const hasPhone = !!toStr(lead.phone_primary);

    const reviews = Number(lead.reviewsCount || 0);
    const rating = Number(lead.totalScore || 0);

    // Contactability
    if (hasEmail) {
        s += 35;
        reasons.push("email:+35");
    }
    if (hasWebsite) {
        s += 15;
        reasons.push("website:+15");
    }
    if (hasPhone) {
        s += 5;
        reasons.push("phone:+5");
    }

    // Social proof
    if (reviews >= 500) {
        s += 20;
        reasons.push("reviews>=500:+20");
    } else if (reviews >= 100) {
        s += 15;
        reasons.push("reviews>=100:+15");
    } else if (reviews >= 20) {
        s += 8;
        reasons.push("reviews>=20:+8");
    } else if (reviews >= 1) {
        s += 3;
        reasons.push("reviews>=1:+3");
    }

    if (rating >= 4.8) {
        s += 10;
        reasons.push("rating>=4.8:+10");
    } else if (rating >= 4.5) {
        s += 7;
        reasons.push("rating>=4.5:+7");
    } else if (rating >= 4.0) {
        s += 4;
        reasons.push("rating>=4.0:+4");
    } else if (rating > 0) {
        s += 1;
        reasons.push("rating>0:+1");
    }

    // Ecommerce bonus (generic)
    if (lead.ecommerce && lead.ecommerce.is_ecommerce) {
        s += 8;
        reasons.push("ecommerce:+8");
    }

    // WhatsApp likelihood bonus (ES mobile)
    if (lead.whatsapp_likely) {
        s += 6;
        reasons.push("whatsapp_likely:+6");
    }

    if (s > 100) s = 100;

    const tier = s >= 75 ? "A" : s >= 55 ? "B" : "C";
    return { score: s, tier, reasons };
}

function routeLead(scoring, lead) {
    const channel = {
        email: !!toStr(lead.email_primary),
        whatsapp: !!lead.whatsapp_likely,
        phone_call: !!toStr(lead.phone_primary),
        phone_type: toStr(lead.phone_type) || "unknown",
    };

    let route = "ENRICH";
    if (scoring.tier === "DROP") route = "DROP_CLOSED";
    else if (scoring.tier !== "C" && channel.email) route = "OUTREACH_READY";
    else route = "ENRICH";

    return { route, channel };
}

module.exports = { scoreLead, routeLead };
