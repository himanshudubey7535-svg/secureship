from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import auth, images, policies, reports, scans, vulnerabilities

app = FastAPI(title="SecureShip API", version="1.0.0")

from app.models import User, DockerImage, ScanResult, Vulnerability, SecurityPolicy, Report
from app.database import engine, Base, SessionLocal

Base.metadata.create_all(bind=engine)
with SessionLocal() as _db:
    if not _db.query(User).filter_by(username="admin").first():
        _admin = User(username="admin", email="admin@secureship.local", hashed_password="not-used", is_active=True)
        _db.add(_admin)
        _db.commit()
        _db.refresh(_admin)
        _db.add(SecurityPolicy(user_id=_admin.id))
        _db.commit()

# Auth uses a Bearer header (no cookies), so credentialed CORS is not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def limits_and_headers(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > settings.MAX_REQUEST_BYTES:
        return JSONResponse({"detail": "Request body too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    # Never leak stack traces or internal paths to clients.
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(scans.router, prefix="/api/scans", tags=["scans"])
app.include_router(vulnerabilities.router, prefix="/api/scans", tags=["vulnerabilities"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(policies.router, prefix="/api/policies", tags=["policies"])


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
