from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router, users_router
from app.api.routes.invitations import router as invitations_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.public import router as public_router

app = FastAPI(title="Nodi API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes: POST /auth/login
app.include_router(auth_router, prefix="/auth", tags=["auth"])
# GET /me
app.include_router(users_router, tags=["auth"])
app.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
app.include_router(invitations_router, tags=["invitations"])
app.include_router(public_router, prefix="/public", tags=["public"])


@app.get("/health")
def health():
    return {"status": "ok"}
