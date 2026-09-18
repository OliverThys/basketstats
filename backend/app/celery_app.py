from celery import Celery

from app.config import settings

celery_app = Celery("basketstats", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    broker_connection_retry_on_startup=True,
    broker_transport_options={"connect_timeout": 2},
)


@celery_app.task(name="basketstats.compute_season_stats")
def compute_season_stats_task(team_id: str) -> dict:
    """Heavy season aggregation off the request thread when a worker is running."""
    from app.database import SessionLocal
    from app.schemas.season import SeasonReportOut
    from app.services.stats_queries import build_season_report

    db = SessionLocal()
    try:
        report = build_season_report(db, team_id)
        return SeasonReportOut.from_domain(report).model_dump()
    finally:
        db.close()
