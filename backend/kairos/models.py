from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

Text = Annotated[str, Field(min_length=1, max_length=200)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Profile(Input):
    name: Text
    target_roles: list[Text] = Field(min_length=1, max_length=10)
    skills: list[Text] = Field(default_factory=list, max_length=40)
    interests: list[Text] = Field(min_length=1, max_length=20)
    background: str = Field(default="", max_length=5000)
    location_preferences: list[Text] = Field(default_factory=list, max_length=10)
    linkedin_url: HttpUrl | None = None
    import_id: str | None = None

    @field_validator("skills", "interests")
    @classmethod
    def normalize(cls, values):
        return list(dict.fromkeys(v.strip().lower() for v in values))

    @field_validator("linkedin_url")
    @classmethod
    def linkedin_only(cls, value):
        if value and (value.scheme != "https" or value.host not in {"linkedin.com", "www.linkedin.com"}):
            raise ValueError("Use an https LinkedIn profile URL")
        return value


class TextImport(Input):
    source: Literal["manual", "assistant_summary", "resume_text"]
    text: str = Field(min_length=1, max_length=30000)


class ConferenceInput(Input):
    url: HttpUrl
    name: Text | None = None
    data_mode: Literal["fixture", "live"] = "fixture"


class TriageInput(Input):
    conference_id: str
    person_id: str
    decision: Literal["interesting", "not_interesting"] | None


class NoteInput(Input):
    conference_id: str
    person_id: str
    note: str = Field(min_length=1, max_length=4000)


class DraftInput(Input):
    conference_id: str
    kind: Literal["introduction", "follow_up", "referral"] = "follow_up"
    job_url: HttpUrl | None = None
    job_description: str = Field(default="", max_length=10000)


class DraftEdit(Input):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    linkedin_message: str = Field(min_length=1, max_length=3000)


class Source(Input):
    url: HttpUrl
    collected_at: str
