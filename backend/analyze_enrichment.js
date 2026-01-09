const fs = require('fs');
const readline = require('readline');

async function analyzeLogs(logPath) {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const categories = {
        scrapeOnly: [], // Had emails in scrape, none new in enrichment
        enrichmentOnly: [], // No emails in scrape, found in enrichment
        both: [], // Emails in both
        none: [] // No emails in either
    };

    let totalLeads = 0;
    let currentLeadName = "";
    let currentScrapeEmails = 0;
    let currentVerifiedOk = 0;
    let currentEnrichedFound = false;

    for await (const line of rl) {
        if (line.includes('[PROCESS] Lead processed:')) {
            const match = line.match(/processed: (.*) \(/);
            if (match) {
                currentLeadName = match[1];
                totalLeads++;
            }
        }

        if (line.includes('[CLEANER] Final result - Emails:')) {
            const match = line.match(/Emails: (\d+)/);
            if (match) currentScrapeEmails = parseInt(match[1]);
        }

        if (line.includes('[ENRICH] AI discovered') && !line.includes('discovered 0')) {
            currentEnrichedFound = true;
        }

        if (line.includes('[MILLION_VERIFIER] Result for') && line.includes(': ok')) {
            currentVerifiedOk++;
        }

        if (line.includes('[ENRICH] COMPLETED:')) {
            const match = line.match(/COMPLETED: (.*) ->/);
            const name = match ? match[1] : currentLeadName;

            if (currentScrapeEmails > 0 && currentVerifiedOk > currentScrapeEmails) {
                categories.both.push(name);
            } else if (currentScrapeEmails === 0 && currentVerifiedOk > 0) {
                categories.enrichmentOnly.push(name);
            } else if (currentScrapeEmails > 0) {
                categories.scrapeOnly.push(name);
            } else {
                categories.none.push(name);
            }

            // Reset
            currentLeadName = "";
            currentScrapeEmails = 0;
            currentVerifiedOk = 0;
            currentEnrichedFound = false;
        }
    }

    console.log('\n--- DETAILED DATA ANALYSIS ---');
    console.log(`Total leads analyzed: ${totalLeads}\n`);

    console.log(`✅ EXCLUSIVELY ENRICHED (${categories.enrichmentOnly.length}): (No scrapers found email, but AI did)`);
    categories.enrichmentOnly.forEach(l => console.log(`   - ${l}`));

    console.log(`\n🔄 BOTH FOUND (${categories.both.length}): (Scraper and AI both found verified emails)`);
    categories.both.forEach(l => console.log(`   - ${l}`));

    console.log(`\n📡 SCRAPE ONLY (${categories.scrapeOnly.length}): (Scraper found emails, AI didn't add new verified ones)`);
    categories.scrapeOnly.forEach(l => console.log(`   - ${l}`));

    console.log(`\n❌ NO CONTACTS FOUND (${categories.none.length}):`);
    categories.none.forEach(l => console.log(`   - ${l}`));

    console.log('\n--- SUMMARY STATISTICS ---');
    const totalWithEmail = categories.enrichmentOnly.length + categories.both.length + categories.scrapeOnly.length;
    console.log(`Success Rate: ${((totalWithEmail / totalLeads) * 100).toFixed(1)}%`);
    console.log(`Enrichment impact (Leads saved from 0): ${((categories.enrichmentOnly.length / totalLeads) * 100).toFixed(1)}%`);
    console.log('------------------------------\n');
}

analyzeLogs('/Users/alvaropescadorruiz/Documents/coeus-web/backend/logs.log');
