import os
import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MigrantShield API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    message: str


@app.get("/", response_model=HealthResponse)
def health_check():
    database_url = os.getenv("DATABASE_URL")
    database_connected = False
    message = "Backend running. Database unreachable."

    if database_url:
        try:
            conn = psycopg2.connect(database_url, connect_timeout=5)
            conn.close()
            database_connected = True
            message = "Backend running. Database connection successful."
        except psycopg2.OperationalError as e:
            database_connected = False
            message = f"Backend running. Database error: {str(e)}"
    else:
        message = "Backend running. DATABASE_URL not set in environment."

    return HealthResponse(
        status="ok",
        database_connected=database_connected,
        message=message,
    )
