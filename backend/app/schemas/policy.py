from pydantic import BaseModel, ConfigDict, Field


class PolicyUpdate(BaseModel):
    max_critical: int = Field(ge=0, le=100000)
    max_high: int = Field(ge=0, le=100000)
    block_on_critical: bool
    block_on_high: bool


class PolicyOut(PolicyUpdate):
    model_config = ConfigDict(from_attributes=True)


class PolicyResult(BaseModel):
    passed: bool
    violations: list[str] = []
    warnings: list[str] = []
