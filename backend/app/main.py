from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, games, organizations, players, teams

app = FastAPI(title="BasketStats API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(games.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
