# Testing Guide: Coeus Backend & MVP

To verify that everything is working correctly, follow these steps to perform a "Golden Path" test.

## 1. Start the Backend
If you haven't deployed the backend to a permanent server yet, run it locally:
```bash
cd backend
npm install
node server.js
```
> [!NOTE]
> Make sure your `.env` has the `SUPABASE_SERVICE_ROLE_KEY`, `HUNTER_API_KEY`, and `OPENROUTER_API_KEY`.

## 2. Trigger a New Search
1. Go to the **Search** tab in your UI.
2. Enter a niche (e.g., "Dentist") and a city (e.g., "Madrid").
3. Set a small limit (e.g., 5) to test quickly.
4. Click **Search**.

**What to check:**
- Open your Supabase Dashboard.
- Look at the `coeus.scrape_runs` table. A new row should appear with your query.
- The browser console should show a successful call to the ingestion endpoint.

## 3. Observe the Lead Processing
Process (Apify -> Enrichment) takes 2-5 minutes.
1. Go to the **Leads** tab.
2. You should see new leads appearing with status `new`.
3. After a few minutes, refresh or wait for the update:
   - Status should change to `enriching` then `enriched`.
   - The `Routing Status` should change to `OUTREACH_READY` if an email was found.

## 4. Verify AI Personalization
1. Click on one of the new leads to open the **Detail Modal**.
2. Look for the **AI Personalization** section.
3. You should see:
   - **Business Summary**: A 1-2 sentence description of the business.
   - **Draft Icebreaker**: A personalized intro line for an email.
   - **Unified Timeline**: An entry saying "Ingested via google_maps_apify".

## 5. Mock an Outreach Event (Webhook Test)
To see the Timeline in action without sending a real email:
Run this command from your terminal (replace `LEAD_EMAIL` with an email from one of your leads):
```bash
curl -X POST http://localhost:3000/api/webhooks/instantly \
-H "Content-Type: application/json" \
-d '{
  "event_type": "opened",
  "lead_email": "LEAD_EMAIL",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "id": "test_event_123"
}'
```
**Result:** Refresh the lead detail in the UI. You should now see an "Opened" event in the **Unified Timeline**.

## 6. Manual Task Test
1. In the Lead Detail modal (once I add the button), or by calling the API:
```bash
curl -X POST http://localhost:3000/api/tasks/handoff \
-H "Content-Type: application/json" \
-d '{"lead_id": "YOUR_LEAD_UUID"}'
```
**Result:** A "Manual Task" event appears in the Timeline.
