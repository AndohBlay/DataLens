# AI-Driven Image-to-Item Master Data Tool (IMDB Auto-Fill)
### GDSS-Maverick Hackathon Prototype (Team: DataLens)

An intelligent, full-stack image-analysis pipeline that automates the transcription of product images into a standardized **Item Master Database (IMDB)**. This tool eliminates manual data entry errors, slashes cataloging time for field teams, enforces centralized naming conventions, and flags potential duplicates or low-confidence extractions automatically.

---

##  Table of Contents
1. [Problem Statement & Context](#-problem-statement--context)
2. [Proposed Solution](#-proposed-solution)
3. [Key Features](#-key-features)
4. [System Architecture](#%EF%B8%8F-system-architecture)
5. [Database & Target Columns](#-database--target-columns)
6. [Tech Stack](#-tech-stack)
7. [System Startup & Installation Guide](#-system-startup--installation-guide)

---

##  Problem Statement & Context

### The Problem
> Retail teams currently fill the Item Master Database (IMDB) manually by transcribing data from product images or labels. This causes inconsistencies, duplication, and slow cataloging, especially for field teams, data scientists, and customer-service staff.

### The Operational Impact
* **Field Teams:** Suffer from exhausting cataloging bottlenecks, spending critical minutes typing out intricate text and long manufacturer strings on mobile devices rather than executing store audits.
* **Data Scientists:** Waste up to 80% of their pipeline setup time writing complex data-cleaning scripts to reconcile variations (e.g., mixing up `430g`, `430 G`, and `0.43 KG`) and stripping duplicate entries out of the dataset.
* **Customer-Service Staff:** Struggle with broken search indexes and unretrievable product files when handling stock validations, customer inquiries, or return orders due to typo-ridden indexing.

---

##  Proposed Solution

**DataLens** addresses this operational friction point directly by building an intelligent image-to-IMDB pipeline. The system accepts product images captured from web or mobile, runs an image-analysis workflow to extract the 10 core IMDB attributes, and exports a standardized file structure or syncs with a live cloud master table.

The system is method-agnostic: it uniquely balances cutting-edge **Vision-Language Models (Gemini Pro Vision VLM)** for holistic label understanding with **localized OCR patterns and robust Regex normalization engines** to map images cleanly onto required column constraints.

---

##  Key Features

* **Multi-Model Extraction & Aggregation:** Orchestrates VLMs and traditional OCR engines to pull product attributes, with multi-image batching support to aggregate evidence across multiple sides/angles of a single product.
* **Intelligent Duplicate Detection:** Evaluates incoming records against current memory based on absolute barcode matching or a bigram similarity calculation (Sørensen-Dice coefficient > 0.8) on Brand and Weight/Unit combinations.
* **Dual-Layer Storage Architecture:** Utilizes a thread-safe in-memory session cache paired with real-time, bi-directional persistence to **Google Sheets** via the `gspread` integration.
* **Granular Curation UI Actions:** Exposes high-fidelity endpoints allowing reviewers to perform line-by-line single row deletions (`DELETE`) or partial modifications (`PATCH`) to fix typos or adjust fields easily inside the application before final export.
* **Low-Confidence Flagging:** Explicitly markers fields dropping below acceptable extraction probabilities to route them directly for human review.

---

##  System Architecture

1. **Ingestion:** UI accepts high-resolution images, optimizing dimensions, color space, and bounding constraints for label and barcode areas.
2. **Extraction Engine:** Images pass to the asynchronous processing pipeline, invoking Gemini Vision models alongside deterministic OCR routines.
3. **Validation & Normalization:** Strict regex normalization cleans raw string fields, converting weights (e.g., `430g` -> `430G`) and verifying barcode integrity.
4. **Session & Cloud Synchronization:** Clean records pass through thread-locked criteria filters to assess duplicate states, after which rows are safely appended to Google Sheets.

---

##  Database & Target Columns

The pipeline extracts and structures precisely the 13 required catalog attributes mapping directly to the authoritative ground-truth schema:

| Column Name | Type | Description / Constraints | Example |
| :--- | :--- | :--- | :--- |
| **record_id** | `Integer` | Unique primary tracking key within the session. | `1` |
| **ITEM_NAME** | `String` | Full descriptive product name for the catalog. | `Ideal Milk` |
| **BARCODE** | `String` | Numeric string printed on packaging (no dashes). | `50115464` |
| **MANUFACTURER** | `String` | Company responsible for manufacturing the good. | `Nestlé` |
| **BRAND** | `String` | Primary brand identity mark. | `Nestlé` |
| **WEIGHT** | `String` | Net weight or net volume containing standardized unit. | `390G` / `1.5 KG` |
| **PACKAGING_TYPE**| `String` | Structural packaging format factor. | `CAN`, `BOTTLE`, `SACHET` |
| **COUNTRY** | `String` | Explicit country of manufacture or packing origin. | `Ghana` |
| **VARIANT** | `String` | Specific product variation formulation (or Empty). | `ORIGINAL`, `LOW FAT` |
| **TYPE** | `String` | Short categorical domain type classification. | `MILK`, `MAYONNAISE` |
| **FRAGRANCE_FLAVOR**| `String`| Flavor or fragrance profile notes (or Empty). | `RICH`, `VANILLA` |
| **PROMOTION** | `String` | Active on-pack marketing promotions (or Empty). | `50% OFF` |
| **ADDONS** | `String` | Special package content enhancements (or Empty). | `SPOON INCLUDED` |
| **TAGLINE** | `String` | Short branding text or marketing phrase (or Empty).| `Your Everyday Choice` |

---

##  Tech Stack

* **Backend Framework:** FastAPI (Python 3.10+) with Pydantic v2 data validation engines.
* **Asynchronous Tasks & Concurrency:** Python Native Threading Locks (`threading.Lock`) for safe state operations.
* **Cloud Integrations:** Google Sheets API (`gspread`) & Google Service Account OAuth2 Authentication.
* **AI/Vision Modules:** Google Gemini Pro Vision API & Advanced Pattern Matching Regex.
* **Frontend UI:** React with Tailwind CSS.

---

##  System Startup & Installation Guide

Follow these steps to spin up the system. Ensure your backend is running on **Port 8000** and your frontend on **Port 3000** (or **5173**).

### Step 1: Clone the Project
```bash
git clone [https://github.com/AndohBlay/DataLens-IMDB-Tool.git](https://github.com/AndohBlay/DataLens.git)
cd DataLens

```

### Step 2: Configure & Start the Backend (Port 8000)

1. Create a `.env` file in the backend root directory:
```env
PORT=8000
HOST=127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CREDENTIALS_FILE=google_credentials.json
GOOGLE_SHEET_NAME=IMDB_Predictions

```


*(Optional: Drop your Google Service Account `google_credentials.json` into the root directory to sync with Google Sheets. If missing, the app defaults to local in-memory storage automatically).*
2. Create a virtual environment, activate it, and install requirements:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

```


3. Run the FastAPI server:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000

```


* **API Docs / Swagger UI:** Access `http://127.0.0.1:8000/docs` to view and test all endpoints directly.



### Step 3: Start the Frontend UI (Port 3000 / 5173)

Open a **new terminal window** and run the following commands:

1. Navigate to the frontend folder and install dependencies:
```bash
cd frontend
npm install

```


2. Start the web application development server:
```bash
npm start
# OR if using Vite:
npm run dev

```


3. Open your browser and navigate to **`http://localhost:3000`** (or `http://localhost:5173`).

You are all set! Drop product images into the UI dashboard to run the image-to-IMDB extraction pipeline.

```

```
