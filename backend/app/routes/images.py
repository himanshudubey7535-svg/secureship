from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_default_user
from app.database import get_db
from app.models.image import DockerImage
from app.models.user import User
from app.schemas.image import ImageCreate, ImageOut

router = APIRouter()


def get_or_create_image(db: Session, user: User, payload: ImageCreate) -> DockerImage:
    ref = payload.full_reference
    image = db.query(DockerImage).filter_by(user_id=user.id, full_reference=ref).first()
    if image is None:
        image = DockerImage(
            user_id=user.id, image_name=payload.image_name,
            image_tag=payload.image_tag, full_reference=ref,
        )
        db.add(image)
        db.flush()
    return image


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
def create_image(payload: ImageCreate, db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    image = get_or_create_image(db, user, payload)
    db.commit()
    db.refresh(image)
    return image


@router.get("", response_model=list[ImageOut])
def list_images(db: Session = Depends(get_db), user: User = Depends(get_default_user)):
    return db.query(DockerImage).filter_by(user_id=user.id).order_by(DockerImage.id.desc()).all()
