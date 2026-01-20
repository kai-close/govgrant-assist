# Agency Template Guidelines System

**Date:** 2026-01-21
**Status:** Design Complete
**Author:** Brainstorming session with Claude

## Overview

Government agencies need branded templates with strict style enforcement. This design introduces a schema-based rules engine that validates presentations against agency guidelines in real-time, warns users of violations, and gates export/sharing behind a review workflow for non-compliant content.

### Key Decisions

- **Enforcement model:** Soft - allow changes but warn and flag for review before export/sharing
- **Admin model:** Hierarchical - central admins set base government guidelines, agency admins add stricter rules on top
- **Scope (Phase 1):** Visual identity - logos, colors, fonts, header/footer placement
- **User experience:** Mixed mode - agency users default to compliant, can switch to personal/draft
- **Template creation:** Direct import OR upload existing PPTX to extract formatting with 100% accuracy

---

## Data Model

### AgencyGuideline Schema

```typescript
AgencyGuideline {
  id: uuid
  name: string                    // "Ministry of Health Guidelines"
  agencyCode: string              // "MOH"
  parentGuidelineId: uuid | null  // For hierarchy (null = central govt)

  // Visual Identity Rules
  colorPalette: {
    primary: { required: "#hex", locked: boolean }
    secondary: { allowed: ["#hex", ...], locked: boolean }
    background: { allowed: ["#hex", ...], locked: boolean }
  }

  fonts: {
    heading: { required: "Inter", locked: boolean }
    body: { required: "Inter", fallback: ["Arial"] }
  }

  // Layout Positions (from slide master extraction)
  layoutRules: {
    logo: { x, y, width, height, required: boolean, assetId: uuid }
    header: { x, y, width, height }
    footer: { x, y, width, height, requiredText: string }
  }

  // Required assets (logos, etc.)
  requiredAssets: [{ id, name, url, placement }]

  createdBy: uuid
  version: number
  effectiveDate: timestamp
}
```

The `locked: boolean` flag distinguishes between "this is the default" vs "this cannot be changed." Child guidelines can only make rules stricter but never loosen parent rules.

---

## PPTX Extraction Pipeline

### Flow

```
Upload Flow:
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Upload PPTX │ ──▶ │ Parse XML    │ ──▶ │ Generate        │
│ (agency PPT)│     │ (python-pptx)│     │ Guideline Draft │
└─────────────┘     └──────────────┘     └─────────────────┘
```

### Extraction Targets

| PPTX Location | What We Extract | Maps To |
|---------------|-----------------|---------|
| `theme1.xml` → `<a:clrScheme>` | Color palette (dk1, lt1, accent1-6) | `colorPalette.*` |
| `theme1.xml` → `<a:fontScheme>` | Heading + body fonts | `fonts.*` |
| `slideMaster1.xml` → `<p:sp>` shapes | Position coordinates (EMUs → pixels) | `layoutRules.*` |
| `slideMaster1.xml` → `<p:pic>` | Logo images with exact placement | `requiredAssets[]` |
| `/ppt/media/*` | Embedded logo files | Stored in S3 |

### Endpoint

```python
POST /api/v1/guidelines/extract-from-pptx
Content-Type: multipart/form-data
Body: { file: pptx, agencyCode: string }

Response: { guidelineDraft: AgencyGuideline, preview: {...} }
```

The admin reviews the extracted draft before activating - no auto-publish.

---

## Compliance Checking System

### Validation Models

```typescript
// Validation result for each element
ComplianceCheck {
  elementId: string           // Card or slide ID
  field: string               // "backgroundColor", "fontFamily", etc.
  status: "compliant" | "warning" | "violation"
  currentValue: any
  allowedValues: any[]
  message: string             // "Background color #ff0000 not in agency palette"
  canOverride: boolean        // false if parent guideline locked it
}

// Presentation-level compliance summary
PresentationCompliance {
  presentationId: uuid
  guidelineId: uuid
  mode: "compliant" | "personal"
  overallStatus: "compliant" | "has_warnings" | "non_compliant"
  violations: ComplianceCheck[]
  checkedAt: timestamp
  reviewRequired: boolean     // true if violations exist at export time
}
```

### UI Behavior

| User Action | System Response |
|-------------|-----------------|
| Changes color to non-allowed value | Yellow warning badge on element, sidebar shows violation |
| Moves logo from required position | Warning: "Logo placement doesn't match agency guidelines" |
| Tries to export with violations | Modal: "This presentation has 3 compliance issues. Submit for review or fix now?" |
| Switches to "Personal" mode | All warnings hidden, presentation flagged as non-compliant in list view |

Violations don't block editing - they inform. The gate is at export/share time.

---

## Review Workflow

### Export Flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ User clicks  │ ──▶ │ Compliance      │ ──▶ │ Compliant?       │
│ "Export"     │     │ Check runs      │     │                  │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                            ┌─────────────────────────┴─────────────────────────┐
                            ▼                                                   ▼
                     ┌──────────────┐                                 ┌─────────────────┐
                     │ Yes: Export  │                                 │ No: Show modal  │
                     │ immediately  │                                 │ with options    │
                     └──────────────┘                                 └────────┬────────┘
                                                                               │
                                              ┌────────────────┬───────────────┼───────────────┐
                                              ▼                ▼               ▼               ▼
                                        ┌──────────┐    ┌───────────┐   ┌───────────┐   ┌──────────┐
                                        │ Fix Now  │    │ Submit    │   │ Export as │   │ Cancel   │
                                        │ (editor) │    │ for Review│   │ Draft     │   │          │
                                        └──────────┘    └───────────┘   └───────────┘   └──────────┘
```

### Review Request Model

```typescript
ReviewRequest {
  id: uuid
  presentationId: uuid
  requesterId: uuid
  agencyCode: string
  violations: ComplianceCheck[]    // Snapshot at request time
  justification: string            // User explains why they need exception
  status: "pending" | "approved" | "rejected"
  reviewerId: uuid | null
  reviewedAt: timestamp | null
  reviewNotes: string | null
}
```

### Admin Review Dashboard

- Pending reviews with violation summaries
- One-click approve (allows export) or reject (sends back to user)
- Option to grant permanent exception for specific presentation

---

## Admin Interface

### Two-Tier Admin System

```
Central Admin (GovTech/Platform level)
├── Create base government guidelines
├── Manage agency list and assign agency admins
├── View compliance reports across all agencies
└── Cannot edit agency-specific rules

Agency Admin (per agency)
├── Create agency guidelines (inherits from central)
├── Upload PPTX to extract formatting
├── Add stricter rules (can't loosen central rules)
├── Review non-compliant export requests
└── Manage agency-specific assets (logos)
```

### Guideline Editor UI

```
┌─────────────────────────────────────────────────────────────┐
│ Create Agency Guideline                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Start from:     │  │ [Upload PPTX]  [Start Blank]    │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│                                                             │
│  Parent Guideline: [Central Government Base ▼] (required)   │
│                                                             │
│  ─── Colors ───────────────────────────────────────────     │
│  Primary:    [#0047AB] 🔒 Inherited, locked                 │
│  Secondary:  [#FFD700] [+ Add allowed color]                │
│  Background: [#FFFFFF] [#F5F5F5] ☑ Lock for agency         │
│                                                             │
│  ─── Fonts ────────────────────────────────────────────     │
│  Heading: [Public Sans ▼] 🔒 Inherited                      │
│  Body:    [Public Sans ▼]   ☑ Lock for agency              │
│                                                             │
│  ─── Layout Rules ─────────────────────────────────────     │
│  [Visual slide master preview with draggable zones]         │
│  Logo:   ✓ Required  Position: Top-left (32, 32)           │
│  Footer: ✓ Required  Text: "© Ministry of Health 2026"     │
│                                                             │
│  [Preview] [Save Draft] [Activate]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## User Experience

### New Presentation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ New Presentation                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You're creating as: Ministry of Health                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● Official MOH Presentation (Recommended)           │   │
│  │   Uses agency brand guidelines, ready for sharing   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ Personal Draft                                    │   │
│  │   No brand restrictions, cannot be shared publicly  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Template: [MOH Standard ▼] [MOH Report ▼] [Blank ▼]       │
│                                                             │
│  [Create Presentation]                                      │
└─────────────────────────────────────────────────────────────┘
```

### In-Editor Compliance Indicators

```
┌──────────────────────────────────────────────────────────────────┐
│ Editor Header                                          [Export ▼]│
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────┐                                                     │
│ │ MOH Logo │  Q3 Budget Presentation          ⚠ 2 warnings      │
│ │ (locked) │                                  [View Issues]      │
│ └──────────┘                                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────────────────────────────────────┐                      │
│    │                                     │                      │
│    │   ┌─────────────────────────────┐   │                      │
│    │   │ Revenue Overview      ⚠     │◀──┼── Yellow border =    │
│    │   │ #FF5733 (not in palette)    │   │   compliance warning │
│    │   └─────────────────────────────┘   │                      │
│    │                                     │                      │
│    └─────────────────────────────────────┘                      │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ Footer: © Ministry of Health 2026              (locked)         │
└──────────────────────────────────────────────────────────────────┘
```

### Mode Toggle

- Switch between "Official" and "Personal" mode anytime
- Switching to Personal clears warnings but flags presentation in dashboard
- Switching back to Official re-validates everything

---

## Technical Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                              │
├─────────────────────────────────────────────────────────────────┤
│ New components:                                                 │
│ • /dashboard/admin/guidelines/* - Admin guideline editor        │
│ • /dashboard/admin/reviews/* - Review queue                     │
│ • useComplianceChecker hook - Real-time validation in editor    │
│ • ComplianceIndicator - Warning badges on cards                 │
│ • ExportComplianceModal - Gate at export time                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ tRPC / REST
┌──────────────────────────▼──────────────────────────────────────┐
│ Backend (FastAPI)                                               │
├─────────────────────────────────────────────────────────────────┤
│ New modules:                                                    │
│ • app/api/v1/guidelines.py - CRUD for guidelines                │
│ • app/api/v1/reviews.py - Review workflow endpoints             │
│ • app/services/pptx_extractor.py - PPTX parsing (python-pptx)   │
│ • app/services/compliance_checker.py - Validation engine        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ Database (PostgreSQL)                                           │
├─────────────────────────────────────────────────────────────────┤
│ New tables:                                                     │
│ • agency_guidelines - Stores guideline schemas                  │
│ • guideline_assets - Logos and required images (refs S3)        │
│ • review_requests - Export approval queue                       │
│ • presentation_compliance - Cached compliance status            │
│                                                                 │
│ Modified tables:                                                │
│ • presentations - Add: guideline_id, compliance_mode            │
│ • users - Add: agency_code, is_agency_admin                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key dependency:** `python-pptx` library for PPTX XML extraction.

---

## API Endpoints

### Guidelines Management

```python
# CRUD for guidelines
GET    /api/v1/guidelines                    # List (filtered by agency)
GET    /api/v1/guidelines/{id}               # Get single guideline
POST   /api/v1/guidelines                    # Create new guideline
PUT    /api/v1/guidelines/{id}               # Update guideline
DELETE /api/v1/guidelines/{id}               # Archive (soft delete)

# PPTX extraction
POST   /api/v1/guidelines/extract-from-pptx  # Upload PPTX, return draft
  Request:  multipart/form-data { file, agencyCode, parentGuidelineId }
  Response: { draft: AgencyGuideline, extractedAssets: Asset[] }

# Activation
POST   /api/v1/guidelines/{id}/activate      # Make guideline live
POST   /api/v1/guidelines/{id}/deactivate    # Revert to previous version
```

### Compliance Checking

```python
# Real-time validation (called by editor)
POST   /api/v1/compliance/check
  Request:  { presentationId, changes: CardUpdate[] }
  Response: { violations: ComplianceCheck[], overallStatus }

# Full presentation scan
GET    /api/v1/compliance/presentation/{id}
  Response: { status, violations[], guidelineId, checkedAt }
```

### Review Workflow

```python
# User submits for review
POST   /api/v1/reviews
  Request:  { presentationId, justification }
  Response: { reviewRequest }

# Admin actions
GET    /api/v1/reviews                       # List pending (agency-filtered)
POST   /api/v1/reviews/{id}/approve          # Allow export
POST   /api/v1/reviews/{id}/reject           # Send back with notes
  Request:  { notes }
```

---

## Error Handling & Edge Cases

| Scenario | System Behavior |
|----------|-----------------|
| PPTX upload has corrupted XML | Return clear error: "Could not parse PPTX. Please ensure file is valid." Don't create partial guideline. |
| PPTX has no theme defined | Extract what exists, warn admin: "No color theme found - defaults will be used for missing values." |
| User's agency guideline is deactivated mid-edit | Graceful degradation: show banner "Agency guidelines updated", re-validate on next save. |
| Parent guideline changes after child created | Child inherits new parent rules automatically. Notify agency admin of stricter inherited rules. |
| Circular guideline hierarchy attempted | Reject at API level: "Cannot set parent - would create circular dependency." |
| User loses agency membership | Existing presentations keep their compliance status. New presentations default to personal mode. |
| Reviewer approves then guideline changes | Approval is point-in-time. Re-export requires new review if violations exist under new rules. |

### Validation Safeguards

```python
def validate_guideline(guideline, parent):
    errors = []

    # Can't loosen parent rules
    if parent and guideline.is_less_strict_than(parent):
        errors.append("Agency rules cannot be less strict than parent")

    # Required fields
    if not guideline.colorPalette.primary:
        errors.append("Primary color is required")

    # Asset references valid
    for asset in guideline.requiredAssets:
        if not asset_exists(asset.id):
            errors.append(f"Asset {asset.name} not found")

    return errors
```

---

## Testing Strategy

### Backend Tests (pytest)

```
tests/
├── test_pptx_extractor.py
│   ├── test_extracts_color_palette_accurately
│   ├── test_extracts_fonts_from_theme
│   ├── test_extracts_logo_position_in_pixels
│   ├── test_handles_missing_theme_gracefully
│   └── test_rejects_corrupted_pptx
│
├── test_compliance_checker.py
│   ├── test_detects_color_violation
│   ├── test_detects_font_violation
│   ├── test_detects_logo_position_violation
│   ├── test_respects_locked_vs_unlocked_rules
│   ├── test_child_cannot_loosen_parent_rules
│   └── test_returns_compliant_for_valid_presentation
│
└── test_review_workflow.py
    ├── test_creates_review_request
    ├── test_admin_can_approve
    ├── test_admin_can_reject_with_notes
    └── test_approved_presentation_can_export
```

### Frontend Tests (Vitest)

```
__tests__/
├── compliance/
│   ├── useComplianceChecker.test.ts
│   │   ├── shows warning when color violates guideline
│   │   ├── clears warning when violation fixed
│   │   └── ignores violations in personal mode
│   │
│   └── ExportComplianceModal.test.tsx
│       ├── allows export when compliant
│       ├── shows violations and options when non-compliant
│       └── submits review request with justification
```

### PPTX Extraction Accuracy

- Use 5 real government PPTX templates as fixtures
- Assert extracted values match manually documented expected values
- Run on CI to catch regressions

---

## Implementation Phases

### Phase 1: Foundation (Backend)

- Database schema: agency_guidelines, guideline_assets tables
- PPTX extractor service using python-pptx
- Guidelines CRUD API endpoints
- Basic compliance checker (colors + fonts only)
- Tests for extractor accuracy

### Phase 2: Admin Interface (Frontend)

- Guideline editor page with color/font pickers
- PPTX upload with extraction preview
- Guideline activation/versioning
- Agency admin role checks

### Phase 3: Editor Integration (Frontend)

- useComplianceChecker hook
- Warning indicators on non-compliant cards
- Compliance summary in editor header
- Mode toggle (Official/Personal)

### Phase 4: Export Gate & Review (Full Stack)

- ExportComplianceModal component
- Review request submission
- Admin review queue dashboard
- Approve/reject workflow

### Phase 5: Polish & Hierarchy

- Central admin dashboard
- Parent-child guideline inheritance enforcement
- Compliance reports/analytics
- Layout position rules (logo/header/footer zones)

**Phase 1 is the critical path** - extraction accuracy must be proven before building UI around it.

---

## Future Expansion (Out of Scope)

- Content structure rules (required sections, slide order)
- Accessibility rules (contrast ratios, alt text)
- Template marketplace
- Agency-to-agency template sharing
