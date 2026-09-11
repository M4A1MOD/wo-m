from fastapi import FastAPI

from app.api.router import router

app = FastAPI(title="Smart Teaching AI Service", version="0.2.0")
app.include_router(router, prefix="/api/v1")

