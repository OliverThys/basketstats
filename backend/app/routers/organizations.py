from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_owner
from app.database import get_db
from app.models import Organization
from app.schemas.backup import OrganizationBackup, RestoreResult
from app.schemas.organization import OrganizationRead
from app.services.backup import export_organization, restore_organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _get_current_org(db: Session, current_user: CurrentUser) -> Organization:
    org = db.get(Organization, current_user.org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/me", response_model=OrganizationRead)
def read_my_organization(
    db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
) -> Organization:
    return _get_current_org(db, current_user)


@router.get("/me/backup", response_model=OrganizationBackup)
def backup_my_organization(
    db: Session = Depends(get_db), current_user: CurrentUser = Depends(require_owner)
) -> OrganizationBackup:
    org = _get_current_org(db, current_user)
    return export_organization(db, org)


@router.post("/restore", response_model=RestoreResult)
def restore_my_organization(
    payload: OrganizationBackup,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_owner),
) -> RestoreResult:
    if payload.org_id != current_user.org_id:
        raise HTTPException(
            status_code=400, detail="Backup can only be restored into the organization it came from"
        )
    org = _get_current_org(db, current_user)
    return restore_organization(db, org, payload)
