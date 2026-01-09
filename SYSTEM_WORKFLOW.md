# System Workflow: Coeus Lead Enrichment Engine

This document explains the step-by-step lifecycle of a lead within the Coeus CRM system, from the initial discovery to final enrichment with decision-makers.

## 1. Discovery & Ingestion
The process starts with a search query (e.g., "Pizzerías en Valencia").
- **Endpoint**: `POST /api/ingest`
- **Actor**: Apify Google Maps Scraper.
- **Data Extracted**: Business Name, Google Place ID, Address, Phone, Website, Rating, and Review Count.
- **UI status**: `SCRAPING`

## 2. Ingestion & Scoring
Once the scraper finishes, the results are processed in the backend.
- **Cleaning**: Normalizes URLs and formats phone numbers.
- **Scoring**: Assigns a score (0-100) and a Tier (A, B, C) based on social proof (reviews/rating) and contactability.
- **Routing**: Decisions are made on how to handle the lead based on its quality.
- **UI status**: `PROCESSING`

## 3. The Enrichment Pipeline (Deep Intel)
Every viable lead (Tiers A and B, or those manually selected) enters the enrichment engine.

### Stage 1: Website Health Check
The system checks if the website is a valid domain or just a social media profile (Instagram/Facebook).
- If it's a social profile, it flags it for **AI Extraction** via fallback search.

### Stage 2: Deep Scraping
If a website exists, the engine launches a multi-page crawl (up to 4 pages).
- Targets: `about-us`, `contact`, `team`, `nosotros`, `equipo`.
- Goal: Extract full body text from pages most likely to contain personnel information.

### Stage 3: AI Contact Extraction
The scraped text is sent to the LLM (Large Language Model).
- **Goal**: Identify Names, Roles (Owner, Manager, Director), and Emails.
- **JSON Hardening**: Filters are applied to ensure only valid JSON is returned even if the AI adds chatter.

### Stage 4: Email Verification
Any discovered email is sent to **MillionVerifier**.
- Only high-quality, non-bouncing emails are promoted to the CRM contact list.

## 4. Automatic Search Fallback
If the website doesn't yield decision-makers, the system automatically pivots.
- **Google Search**: Performs a targeted search for "Dueños de [Negocio] en [Ciudad]".
- **Snippet Extraction**: The LLM analyzes the search results (snippets) to find names that appear in news or local directories.
- **UI status**: `ENRICHING`

## 5. Final Result in CRM
The lead is updated with:
- **Decision Makers**: Full list of discovered personnel saved in `contacts` table.
- **AI Summary**: A quick overview of the business.
- **Status**: Run marked as **COMPLETED**.

---

### Monitoring & Maintenance
- **Logs**: Monitor `backend/logs.log` to see real-time steps (`[STEP 1/4]`, etc.).
- **Re-trigger**: If a lead failure occurs, use `POST /api/reenrich` to retry the process for an entire batch.
