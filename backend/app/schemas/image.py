import re
from datetime import datetime

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# First character must be alphanumeric so a name can never be parsed as a CLI flag.
_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._\-/:@]*$")
_TAG_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.\-]{0,99}$")


class ImageCreate(BaseModel):
    image_name: str = Field(min_length=1, max_length=255)
    image_tag: str = Field(default="latest", max_length=100)

    @model_validator(mode="before")
    @classmethod
    def _split_embedded_tag(cls, data: Any) -> Any:
        if isinstance(data, dict):
            name = str(data.get("image_name") or "").strip()
            tag = str(data.get("image_tag") or "").strip()
            if "@" not in name:
                last_slash = name.rfind("/")
                colon = name.rfind(":")
                if colon > last_slash:
                    # User provided "image:tag" in the image_name input
                    embedded_tag = name[colon + 1:]
                    clean_name = name[:colon]
                    if not tag or tag == "latest":
                        tag = embedded_tag
                    name = clean_name
            data["image_name"] = name
            data["image_tag"] = tag or "latest"
        return data

    @field_validator("image_name")
    @classmethod
    def _check_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Invalid image name (example: nginx or ghcr.io/org/app)")
        return v

    @field_validator("image_tag")
    @classmethod
    def _check_tag(cls, v: str) -> str:
        v = (v or "latest").strip() or "latest"
        if not _TAG_RE.match(v):
            raise ValueError("Invalid image tag (example: latest or 1.25-alpine)")
        return v

    @property
    def full_reference(self) -> str:
        # A digest reference (name@sha256:...) already pins the image; don't append a tag.
        if "@" in self.image_name:
            return self.image_name
        return f"{self.image_name}:{self.image_tag}"


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_name: str
    image_tag: str | None
    full_reference: str
    created_at: datetime | None = None
