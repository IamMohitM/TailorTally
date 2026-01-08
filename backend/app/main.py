from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import master_data, orders, schools
# from . import seed # Will implement seed trigger later or via script

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tailor Tally API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local tool
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Tailor Tally API is running"}

# Include Routers
app.include_router(master_data.router)
app.include_router(orders.router)
app.include_router(schools.router)
