# OrgChart — 1OS Module Specification
**Module:** `orgchart`
**Platform:** 1OS (One Operating System) — Astronic Services & Trading Pte Ltd
**Version:** 1.0
**Author:** Simply Engineering Pte Ltd
**Date:** June 2026

---

## 1. Purpose

OrgChart is a visual organisational hierarchy module within 1OS. It displays the company structure — from Executive Manager down to workers — in an interactive tree diagram. It is maintained in the database and reflects real staffing, roles, and project assignments in real time.

---

## 2. Core Principles

- **Live data** — org chart reflects actual DB records, not a static diagram
- **Role-aware** — manager sees full tree; supervisors see their subtree only
- **Editable** — admin can reassign reporting lines directly in the UI
- **Linked** — clicking a staff card opens their HR profile in 1OS
- **Printable** — export to PNG or PDF for compliance / client submission

---

## 3. User Roles & Access

| Role | Access |
|---|---|
| **Admin / Manager** | View and edit full org chart |
| **Supervisor** | View their own subtree (team only) |
| **Worker** | View their own position and direct supervisor only |

---

## 4. Data Model

### 4.1 Employee (extends existing HR model)

```python
class Employee(models.Model):
    # Core fields
    name            = models.CharField(max_length=150)
    employee_id     = models.CharField(max_length=20, unique=True)
    role            = models.CharField(max_length=100)
    department      = models.CharField(max_length=100)
    photo           = models.ImageField(upload_to='staff/photos/', null=True, blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    date_joined     = models.DateField()
    is_active       = models.BooleanField(default=True)

    # Hierarchy
    manager         = models.ForeignKey(
                        'self',
                        null=True,
                        blank=True,
                        on_delete=models.SET_NULL,
                        related_name='subordinates'
                      )

    # Metadata
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.role})"
```

### 4.2 Hierarchy Logic

- Root node = employee with `manager = NULL` (Executive Manager)
- Each employee points to their direct manager
- Recursive serialization builds the tree JSON for frontend
- `django-mptt` optional for large teams (>100 staff) — not needed at 25

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orgchart/tree/` | Full tree JSON from root |
| GET | `/api/orgchart/tree/{employee_id}/` | Subtree from given employee down |
| GET | `/api/orgchart/employees/` | Flat list of all employees |
| GET | `/api/orgchart/employees/{id}/` | Single employee detail |
| PATCH | `/api/orgchart/employees/{id}/` | Update manager (reassign reporting line) |

### Tree JSON Response Format

```json
{
  "id": 1,
  "name": "Lucus Lim",
  "role": "Executive Manager",
  "department": "Management",
  "photo_url": "/media/staff/photos/lucus.jpg",
  "children": [
    {
      "id": 2,
      "name": "Ravi Kumar",
      "role": "Operations Manager",
      "department": "Operations",
      "photo_url": "/media/staff/photos/ravi.jpg",
      "children": [
        {
          "id": 3,
          "name": "Suresh",
          "role": "Site Supervisor",
          "department": "Installation",
          "photo_url": null,
          "children": [
            { "id": 5, "name": "Worker A", "role": "Lift Technician", "children": [] },
            { "id": 6, "name": "Worker B", "role": "Lift Technician", "children": [] }
          ]
        },
        {
          "id": 4,
          "name": "Muthu",
          "role": "Site Supervisor",
          "department": "Installation",
          "photo_url": null,
          "children": [
            { "id": 7, "name": "Worker C", "role": "Lift Technician", "children": [] }
          ]
        }
      ]
    }
  ]
}
```

---

## 6. Django Serializer (Recursive)

```python
class EmployeeTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ['id', 'name', 'role', 'department', 'photo_url', 'children']

    def get_children(self, obj):
        qs = obj.subordinates.filter(is_active=True)
        return EmployeeTreeSerializer(qs, many=True, context=self.context).data

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None
```

---

## 7. Frontend — React Component Structure

```
OrgChart/
├── OrgChartPage.jsx           # Page wrapper, fetches tree data
├── OrgChartTree.jsx           # Renders react-organizational-chart tree
├── StaffCard.jsx              # Individual node: photo, name, role
├── StaffModal.jsx             # Click → employee profile modal
├── OrgChartControls.jsx       # Zoom in/out, fit to screen, export PNG
├── OrgChartSearch.jsx         # Search by name → highlight node
└── hooks/
    └── useOrgTree.js          # Fetch tree, loading, error states
```

### Library

```bash
npm install react-organizational-chart
```

### Basic Render Pattern

```jsx
import { Tree, TreeNode } from 'react-organizational-chart'
import StaffCard from './StaffCard'

function renderTree(node) {
  return (
    <TreeNode key={node.id} label={<StaffCard employee={node} />}>
      {node.children.map(child => renderTree(child))}
    </TreeNode>
  )
}

export default function OrgChartTree({ data }) {
  return (
    <Tree label={<StaffCard employee={data} />}>
      {data.children.map(child => renderTree(child))}
    </Tree>
  )
}
```

---

## 8. UI / UX Specification

### 8.1 Staff Card (Node)

```
┌──────────────────────┐
│   [Photo / Avatar]   │
│   Lucus Lim          │
│   Executive Manager  │
│   Management         │
└──────────────────────┘
```

- Photo: circular avatar, 56px, fallback to initials
- Name: bold, 14px
- Role: regular, 12px, accent colour
- Department: grey, 11px
- Border: subtle shadow, rounded corners
- Hover: slight lift shadow, cursor pointer
- Click: opens StaffModal with full profile

### 8.2 StaffModal (on click)

```
┌────────────────────────────────────┐
│  [Photo]  Ravi Kumar               │
│           Operations Manager       │
│           Operations Dept          │
│                                    │
│  Reports to:  Lucus Lim            │
│  Direct reports: 2 supervisors     │
│  Phone: +65 9xxx xxxx              │
│  Email: ravi@astronic.com.sg       │
│  Joined: 15 Mar 2022               │
│                                    │
│  [View Full Profile]  [Close]      │
└────────────────────────────────────┘
```

### 8.3 Controls Bar

```
[🔍 Search staff...]   [−] [+]  [Fit]  [📤 Export PNG]
```

- Zoom via CSS transform scale on tree container
- Fit: reset scale + scroll to center
- Export PNG: `html2canvas` capture of tree container

### 8.4 Colour Coding by Level

| Level | Colour |
|---|---|
| Executive | `#1A1A2E` dark navy |
| Manager | `#16213E` mid navy |
| Supervisor | `#0F3460` blue |
| Worker | `#E94560` accent red / or neutral grey |

---

## 9. Django App Structure

```
orgchart/
├── models.py          # Employee model with self-referential FK
├── serializers.py     # EmployeeTreeSerializer (recursive)
├── views.py           # Tree API view, employee CRUD
├── urls.py            # URL patterns
├── admin.py           # Django admin with tree display
└── utils.py           # build_tree() helper if needed
```

---

## 10. Integration with 1OS

| 1OS Module | Integration |
|---|---|
| **HR** | Employee records shared — OrgChart reads HR model |
| **Projects** | Show project assignment on StaffModal |
| **SiteChat** | Link to staff's chat channels from modal |
| **WTS** | Show active job assignments under supervisor node |
| **Attendance** | Show today's attendance status badge on card (🟢 Present / 🔴 Absent) |

---

## 11. Export & Print

- **Export PNG** — `html2canvas` captures visible tree, triggers download
- **Export PDF** — `jsPDF` wraps canvas output
- **Print CSS** — `@media print` hides nav/controls, renders tree full-width

```bash
npm install html2canvas jspdf
```

---

## 12. Implementation Phases

| Phase | Scope | Target |
|---|---|---|
| **v1.0** | Static tree from DB, staff cards, click modal, role-based access | Week 1–2 |
| **v1.1** | Search + highlight, zoom controls, export PNG | Week 3 |
| **v1.2** | Attendance badge on card, project assignment in modal | Week 4 |
| **v2.0** | Drag-and-drop reassignment, dept filter, headcount stats | Phase 2 |

---

## 13. Dependencies

**Backend**
| Package | Purpose |
|---|---|
| `django` | Core |
| `djangorestframework` | REST API |
| `Pillow` | Staff photo handling |
| `django-mptt` *(optional)* | Efficient tree queries for large teams |

**Frontend**
| Package | Purpose |
|---|---|
| `react-organizational-chart` | Tree rendering |
| `html2canvas` | Export to PNG |
| `jspdf` | Export to PDF |
| `axios` | API calls |

---

## 14. Acceptance Criteria

- [ ] Full org tree renders from DB data on page load
- [ ] Each node shows photo (or initials fallback), name, role
- [ ] Clicking a node opens staff detail modal
- [ ] Supervisor sees only their subtree
- [ ] Manager/admin sees full company tree
- [ ] Search by name scrolls to and highlights the matching node
- [ ] Export PNG downloads a clean image of the chart
- [ ] Tree updates immediately when manager reassignment is saved
- [ ] Works on desktop browser; scrollable on mobile

---

*End of OrgChart 1OS Module Specification v1.0*
