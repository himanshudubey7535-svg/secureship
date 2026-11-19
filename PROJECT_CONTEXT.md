# SECURESHIP - Complete Project Context

> **Use this file to resume development with a new agent if the current conversation runs out of tokens.**
> Tell the new agent: "Read /Users/asthachauhan/Documents/secureship/PROJECT_CONTEXT.md and continue building from where it left off."

---

## 1. PROJECT IDENTITY

- **Name**: SECURESHIP
- **Tagline**: "Secure Every Container Before Deployment."
- **Type**: Container Vulnerability Scanning & Security Automation Platform
- **Purpose**: B.Tech CS major project + technical interview demo
- **Location**: `/Users/asthachauhan/Documents/secureship/`

---

## 2. TECHNOLOGY STACK (STRICT - NO SUBSTITUTIONS)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React.js + Vite + JavaScript + Plain CSS | NO Tailwind/Bootstrap/MUI/Chart.js/Axios/React Router |
| Backend | Python + FastAPI + SQLAlchemy + Pydantic | ALL backend logic here |
| Database | MySQL | Via SQLAlchemy ORM + Alembic migrations |
| Security | Docker + Trivy scanner | Real scanning, no fakes |
| CI/CD | GitHub Actions | Real security gate enforcement |
| Testing | Pytest (backend) + basic React tests | Mocked Trivy for unit tests |
| Auth | JWT + bcrypt password hashing | |

**BANNED**: AWS, Kubernetes, Terraform, Node.js backend, TypeScript, Tailwind, Bootstrap, Material UI, Chart.js, Axios, React Router

---

## 3. COMPLETE FILE STRUCTURE

```
secureship/
├── PROJECT_CONTEXT.md          (this file)
├── README.md
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── .gitignore
│
├── .github/
│   └── workflows/
│       └── security-scan.yml
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, CORS, router mounting
│   │   ├── database.py          # SQLAlchemy engine, session, Base
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py        # Pydantic Settings (env vars)
│   │   │   └── security.py      # JWT create/verify, password hash/verify
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── image.py
│   │   │   ├── scan.py
│   │   │   ├── vulnerability.py
│   │   │   ├── policy.py
│   │   │   └── report.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── image.py
│   │   │   ├── scan.py
│   │   │   ├── vulnerability.py
│   │   │   └── policy.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # POST /api/auth/register, /api/auth/login
│   │   │   ├── images.py         # POST /api/images, GET /api/images
│   │   │   ├── scans.py          # POST /api/scans, GET /api/scans, GET /api/scans/{id}
│   │   │   ├── vulnerabilities.py # GET /api/scans/{id}/vulnerabilities
│   │   │   ├── reports.py        # GET /api/reports/{id}/json, GET /api/reports/{id}/pdf
│   │   │   └── policies.py       # GET /api/policies, PUT /api/policies
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── trivy_service.py   # Execute trivy via subprocess, parse JSON
│   │   │   ├── risk_engine.py     # Calculate security scores
│   │   │   ├── policy_engine.py   # Evaluate policies against scan results
│   │   │   └── report_service.py  # Generate JSON and PDF reports
│   │   │
│   │   └── utils/
│   │       └── __init__.py
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_scans.py
│       ├── test_risk_engine.py
│       ├── test_policy_engine.py
│       └── test_trivy_service.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── style.css
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── StatCard.jsx
        │   ├── VulnerabilityTable.jsx
        │   └── ScanStatus.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── ScanImage.jsx
        │   ├── ScanHistory.jsx
        │   └── SecuritySettings.jsx
        └── services/
            └── api.js
```

---

## 4. DATABASE SCHEMA

### Table: users
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
username        VARCHAR(50) UNIQUE NOT NULL
email           VARCHAR(100) UNIQUE NOT NULL
hashed_password VARCHAR(255) NOT NULL
is_active       BOOLEAN DEFAULT TRUE
created_at      DATETIME DEFAULT NOW()
updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW()
```

### Table: docker_images
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
user_id         INT FK -> users.id
image_name      VARCHAR(255) NOT NULL
image_tag       VARCHAR(100) DEFAULT 'latest'
full_reference  VARCHAR(500) NOT NULL
created_at      DATETIME DEFAULT NOW()
INDEX(user_id)
```

### Table: scan_results
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
image_id        INT FK -> docker_images.id
user_id         INT FK -> users.id
status          ENUM('pending','scanning','completed','failed') DEFAULT 'pending'
security_score  FLOAT DEFAULT NULL
risk_category   VARCHAR(50) DEFAULT NULL
total_vulns     INT DEFAULT 0
critical_count  INT DEFAULT 0
high_count      INT DEFAULT 0
medium_count    INT DEFAULT 0
low_count       INT DEFAULT 0
unknown_count   INT DEFAULT 0
trivy_output    JSON DEFAULT NULL
error_message   TEXT DEFAULT NULL
started_at      DATETIME DEFAULT NULL
completed_at    DATETIME DEFAULT NULL
created_at      DATETIME DEFAULT NOW()
INDEX(user_id), INDEX(image_id)
```

### Table: vulnerabilities
```sql
id                INT PRIMARY KEY AUTO_INCREMENT
scan_id           INT FK -> scan_results.id
cve_id            VARCHAR(50)
package_name      VARCHAR(255)
installed_version VARCHAR(100)
fixed_version     VARCHAR(100)
severity          ENUM('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')
title             TEXT
description       TEXT
references        JSON
created_at        DATETIME DEFAULT NOW()
INDEX(scan_id), INDEX(severity)
```

### Table: security_policies
```sql
id                      INT PRIMARY KEY AUTO_INCREMENT
user_id                 INT FK -> users.id UNIQUE
max_critical            INT DEFAULT 0
max_high                INT DEFAULT 5
block_on_critical       BOOLEAN DEFAULT TRUE
block_on_high           BOOLEAN DEFAULT FALSE
created_at              DATETIME DEFAULT NOW()
updated_at              DATETIME DEFAULT NOW() ON UPDATE NOW()
```

### Table: reports
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
scan_id         INT FK -> scan_results.id
user_id         INT FK -> users.id
report_type     ENUM('json','pdf') NOT NULL
file_path       VARCHAR(500)
created_at      DATETIME DEFAULT NOW()
```

---

## 5. API SPECIFICATION

Base URL: `http://localhost:8000/api`

### Auth
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/auth/register | {username, email, password} | {id, username, email, token} | No |
| POST | /api/auth/login | {email, password} | {token, token_type} | No |

### Images
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/images | {image_name, image_tag} | Image object | Yes |
| GET | /api/images | - | List of user's images | Yes |

### Scans
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/scans | {image_name, image_tag} | Scan result (triggers Trivy) | Yes |
| GET | /api/scans | - | List of user's scans | Yes |
| GET | /api/scans/{scan_id} | - | Single scan with details | Yes |

### Vulnerabilities
| Method | Endpoint | Query | Response | Auth |
|--------|----------|-------|----------|------|
| GET | /api/scans/{scan_id}/vulnerabilities | ?severity=CRITICAL | List of vulnerabilities | Yes |

### Reports
| Method | Endpoint | Response | Auth |
|--------|----------|----------|------|
| GET | /api/reports/{scan_id}/json | JSON file download | Yes |
| GET | /api/reports/{scan_id}/pdf | PDF file download | Yes |

### Policies
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| GET | /api/policies | - | Current policy | Yes |
| PUT | /api/policies | {max_critical, max_high, block_on_critical, block_on_high} | Updated policy | Yes |

---

## 6. RISK ASSESSMENT ENGINE

### Weights
- CRITICAL = 10
- HIGH = 6
- MEDIUM = 3
- LOW = 1

### Formula
```
total_risk = (critical × 10) + (high × 6) + (medium × 3) + (low × 1)
max_possible = max(total_risk, 1)  # avoid division by zero
security_score = max(0, 100 - (total_risk / max_normalization_factor * 100))
```

Normalization: Use a reference maximum (e.g., if 50+ total weighted risk → score approaches 0):
```python
security_score = max(0, 100 * math.exp(-total_risk / 50))
```

### Categories
| Score | Category |
|-------|----------|
| 90-100 | Excellent |
| 70-89 | Good |
| 40-69 | Needs Attention |
| 0-39 | Critical Risk |

---

## 7. TRIVY INTEGRATION

### Command
```python
result = subprocess.run(
    ["trivy", "image", "--format", "json", "--timeout", "5m", image_reference],
    capture_output=True, text=True, timeout=600
)
```

### JSON Output Parsing
Trivy JSON has structure:
```json
{
  "Results": [
    {
      "Target": "package-name (type)",
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-XXXX-XXXX",
          "PkgName": "package",
          "InstalledVersion": "1.0.0",
          "FixedVersion": "1.0.1",
          "Severity": "CRITICAL",
          "Title": "...",
          "Description": "...",
          "References": ["..."]
        }
      ]
    }
  ]
}
```

### Error Handling
- Trivy not installed → informative error
- Docker not running → informative error
- Invalid image → informative error
- Network failure → informative error
- Timeout → informative error
- Malformed JSON → informative error
- No vulnerabilities found → valid result with score 100

---

## 8. FRONTEND DESIGN SPECIFICATION

### Color Palette
```css
--bg-primary: #0d1117;
--bg-secondary: #161b22;
--bg-surface: #1c2333;
--bg-card: #21262d;
--border-color: #30363d;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--accent-blue: #2563eb;
--accent-blue-hover: #3b82f6;
--success-green: #22c55e;
--warning-yellow: #f59e0b;
--danger-red: #ef4444;
--critical-purple: #a855f7;
```

### Navigation (Conditional Rendering, NOT React Router)
```jsx
// In App.jsx
const [currentPage, setCurrentPage] = useState('dashboard');
// Render page based on currentPage state
// Auth state: [isAuthenticated, setIsAuthenticated]
// If not authenticated → show Login/Register
// If authenticated → show Sidebar + Header + current page
```

### Font
Google Fonts: Inter (400, 500, 600, 700)

### Four Sections
1. **Dashboard**: StatCards (total scans, total vulns, critical vulns, avg score), recent scans table, quick scan button
2. **Scan Image**: Form (image name + tag), scan button, ScanStatus component, VulnerabilityTable with severity filter, JSON/PDF download buttons
3. **Scan History**: Table of all past scans, click to view details (shows scan in ScanImage-like view)
4. **Security Settings**: Form for policy configuration, save button, current policy display

---

## 9. DOCKER COMPOSE CONFIGURATION

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: secureship
    ports: ["3306:3306"]
    volumes: [mysql_data:/var/lib/mysql]
    healthcheck: mysqladmin ping -h localhost

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: mysql+pymysql://root:${MYSQL_ROOT_PASSWORD}@db:3306/secureship
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db: { condition: service_healthy }
    volumes: [/var/run/docker.sock:/var/run/docker.sock]  # For Trivy/Docker access

  frontend:
    build: ./frontend
    ports: ["5173:80"]
    depends_on: [backend]
```

---

## 10. GITHUB ACTIONS WORKFLOW

File: `.github/workflows/security-scan.yml`

Steps:
1. Checkout code
2. Set up Docker Buildx
3. Build application Docker image
4. Install Trivy (aquasecurity/trivy-action or manual install)
5. Scan the built image with Trivy
6. Generate JSON report
7. Parse vulnerability counts
8. Evaluate against thresholds (configurable via env vars)
9. Upload report as artifact
10. FAIL the workflow if critical vulns exceed threshold

**The security gate must genuinely fail the pipeline** - not simulated.

---

## 11. ENVIRONMENT VARIABLES (.env.example)

```env
# Database
MYSQL_ROOT_PASSWORD=secureship_dev_password
DATABASE_URL=mysql+pymysql://root:secureship_dev_password@localhost:3306/secureship

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Trivy
TRIVY_TIMEOUT=300

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## 12. KEY IMPLEMENTATION DETAILS

### Backend main.py Pattern
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, images, scans, vulnerabilities, reports, policies

app = FastAPI(title="SecureShip API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(scans.router, prefix="/api/scans", tags=["scans"])
app.include_router(vulnerabilities.router, prefix="/api/scans", tags=["vulnerabilities"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(policies.router, prefix="/api/policies", tags=["policies"])
```

### Security.py Pattern
```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...
def create_access_token(data: dict) -> str: ...
def get_current_user(token, db) -> User: ...  # FastAPI Depends
```

### Frontend api.js Pattern
```javascript
const API_URL = 'http://localhost:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  login: (email, password) => fetch(`${API_URL}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({email, password}) }).then(r => r.json()),
  // ... etc
};
```

---

## 13. PROGRESS TRACKER

### Completed
- [x] Project directory structure created
- [x] Project context document created (this file)
- [x] Backend implementation (all files); 69 pytest tests passing, 2 real-Trivy tests skipped (no trivy in build sandbox)
- [x] Frontend implementation (all files); 10 vitest tests passing, production build OK
- [x] Infrastructure files (Docker, docker-compose, CI/CD gate, README)
- [x] Alembic migration 001 (verified to generate valid MySQL DDL)

- [x] Score explanation, fix recommendations, /api/scans/stats, rate limit + concurrency cap, request-size limit
- [x] CI gate as testable script `ci/security_gate.py` (subprocess exit-code tests)

### Deviations from the spec (intentional)
- bcrypt used directly instead of passlib (passlib breaks on bcrypt >= 4.1)
- Added `pages/Auth.jsx` (login/register screen) and `GET /api/health`
- CORS uses an explicit origin list (`CORS_ORIGINS`) instead of `*` with credentials
- Policy semantics: `max_*` is the limit, `block_on_*` decides whether exceeding it fails (else warning)
- Failed scans return HTTP 200 with `status: "failed"` and `error_message`

### Not yet verified
- [ ] End-to-end run against real MySQL + real Trivy + Docker (needs `docker compose up --build`)
- [ ] GitHub Actions run on a real repository

## 14. HOW TO RESUME WITH A NEW AGENT

Tell the new agent:

> "Read the file at `/Users/asthachauhan/Documents/secureship/PROJECT_CONTEXT.md`. It contains the complete specification for the SecureShip project. Check which files already exist and continue building from where the previous agent left off. Check the Progress Tracker section at the bottom to see what's been completed."

The new agent should:
1. `ls -R /Users/asthachauhan/Documents/secureship/` to see existing files
2. Read this context file
3. Check which files have actual content vs empty/missing
4. Continue implementing from where things left off
5. Update the Progress Tracker section as work is completed
