# Documents Page Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the `/dashboard/documents` page - a document library where users can upload, manage, and generate presentations from PDF, Word, and PowerPoint files.

**Architecture:** Documents are stored in MinIO (S3-compatible), metadata in PostgreSQL. Text extraction runs on the FastAPI backend using Python libraries. Frontend polls for processing status.

**Tech Stack:** Next.js 15, tRPC, FastAPI, MinIO/S3, pypdf, python-docx, python-pptx

---

## 1. Page Structure & Layout

### Header Section
- Title: "Documents"
- Upload button (primary action) - opens upload modal
- Search/filter bar (for larger libraries)

### Document Grid
Card-based layout showing each document with:
- File icon (PDF/Word/PPT indicator)
- Filename
- Upload date
- Status badge (Processing / Ready / Error)
- File size
- Actions menu (Generate Presentation, Download, Delete)

### Empty State
- Friendly illustration/icon
- "No documents yet" message
- Prominent upload CTA

### Upload Modal
- Drag-and-drop zone
- File picker fallback
- Accepted types: **PDF, DOCX, DOC, PPT, PPTX**
- Max file size: **50MB**
- Upload progress bar

---

## 2. Data Flow

### Upload Flow
```
User drops file → Frontend validates type/size →
Upload to S3 (MinIO) → Create DB record (status: pending) →
Return document ID → Trigger backend processing
```

### Processing Flow (Backend)
```
Backend receives document ID → Download from S3 →
Extract text based on type:
  - PDF → pypdf
  - DOCX/DOC → python-docx
  - PPT/PPTX → python-pptx (extract slide text)
→ Save text_content to DB → Update status: completed
→ On error: Update status: error, save error message
```

### Polling Flow
```
Frontend polls GET /api/documents/{id}/status every 2 seconds →
When status === "completed" → Stop polling, refresh document card →
When status === "error" → Stop polling, show error message
```

### Generate Presentation Flow
```
User clicks "Generate Presentation" on a ready document →
Opens modal: select slide count (3-30), optional focus areas →
Calls existing tRPC generateFromDocument mutation →
Redirects to new presentation in editor
```

---

## 3. API Endpoints

### tRPC Router: `document.ts`

| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | query | Get user's documents (paginated, sorted by date) |
| `getById` | query | Get single document with status |
| `getUploadUrl` | mutation | Generate presigned S3 upload URL |
| `create` | mutation | Create DB record after upload, trigger processing |
| `delete` | mutation | Delete document from S3 and DB |
| `getStatus` | query | Lightweight status check for polling |

### FastAPI Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/documents/{id}/process` | POST | Trigger text extraction |

---

## 4. File Structure

### New Files

```
apps/web/src/
├── app/(dashboard)/dashboard/documents/
│   └── page.tsx                    # Main documents page
├── components/documents/
│   ├── document-grid.tsx           # Grid of document cards
│   ├── document-card.tsx           # Individual document card
│   ├── upload-modal.tsx            # Upload dialog with drag-drop
│   ├── generate-modal.tsx          # Configure & generate presentation
│   └── empty-state.tsx             # Empty state UI
├── lib/trpc/routers/
│   └── document.ts                 # New tRPC router

apps/backend/app/
├── api/v1/
│   └── documents.py                # Processing endpoint
├── services/
│   └── document_processor.py       # Text extraction logic
```

### Modified Files

| File | Change |
|------|--------|
| `lib/trpc/routers/index.ts` | Add document router to appRouter |

---

## 5. Error Handling

### Upload Errors
| Scenario | Handling |
|----------|----------|
| File too large (>50MB) | Client-side validation, show error before upload |
| Invalid file type | Client-side validation, reject with message |
| S3 upload fails | Show toast error, allow retry |
| Network timeout | Show toast error, allow retry |

### Processing Errors
| Scenario | Handling |
|----------|----------|
| Corrupted PDF | Set status: "error", message: "Unable to read file" |
| Password-protected file | Set status: "error", message: "Password-protected files not supported" |
| Empty document | Set status: "error", message: "No text content found" |
| Backend unreachable | 60s timeout → show "Processing failed" |

### UI States
| Document Status | Card Appearance |
|-----------------|-----------------|
| `pending` | Muted card, spinner, "Uploading..." |
| `processing` | Muted card, spinner, "Processing..." |
| `completed` | Normal card, green badge, actions enabled |
| `error` | Red border, error icon, error message, retry/delete options |

### Security
- Presigned URLs expire after 5 minutes
- Documents scoped to user ID (enforced in all queries)
- File type validated server-side, not just client-side

---

## 6. Database Schema (Existing)

The `documents` table already exists with the required columns:

```sql
Table "public.documents"
    Column    |            Type             | Default
--------------+-----------------------------+-------------------
 id           | uuid                        | gen_random_uuid()
 user_id      | uuid                        | NOT NULL
 filename     | text                        | NOT NULL
 mime_type    | text                        | NOT NULL
 size         | integer                     | NOT NULL
 status       | text                        | 'pending'
 error        | text                        |
 text_content | text                        |
 page_count   | integer                     |
 storage_key  | text                        | NOT NULL
 created_at   | timestamp                   | now()
 processed_at | timestamp                   |
```

No schema changes required.

---

## 7. Implementation Order

1. **Backend first**: Document processor service + FastAPI endpoint
2. **tRPC router**: CRUD operations + S3 presigned URLs
3. **Frontend components**: Upload modal, document card, grid
4. **Main page**: Wire everything together
5. **Generate modal**: Connect to existing `generateFromDocument`
6. **Polish**: Error states, loading states, empty state
