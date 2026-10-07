import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Integer, String, JSON, ForeignKey, update, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .schemas import State
from .demo import demo_state


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    settings: Mapped[dict] = mapped_column(JSON)


class EmployeeRecord(Base):
    __tablename__ = "employees"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    data: Mapped[dict] = mapped_column(JSON)


class PortfolioRecord(Base):
    __tablename__ = "portfolios"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    assigned_to: Mapped[str] = mapped_column(ForeignKey("employees.id"))
    data: Mapped[dict] = mapped_column(JSON)


class RunRecord(Base):
    __tablename__ = "analysis_runs"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    kind: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[str] = mapped_column(String(40))
    data: Mapped[dict] = mapped_column(JSON)


class Conflict(Exception):
    pass


class Repository:
    def __init__(self, url=None):
        url = url or os.getenv("DATABASE_URL", "sqlite:///./workforce.db")
        self.engine = create_engine(
            url,
            connect_args={"check_same_thread": False}
            if url.startswith("sqlite")
            else {},
        )
        self.session = sessionmaker(self.engine, expire_on_commit=False)

    def initialize(self):
        Base.metadata.create_all(self.engine)
        with self.session.begin() as db:
            if db.get(Company, "demo"):
                return
            s = demo_state()
            db.add(
                Company(id="demo", version=s.version, settings=s.settings.model_dump())
            )
            db.flush()
            for e in s.employees:
                db.add(EmployeeRecord(id=e.id, company_id="demo", data=e.model_dump()))
            db.flush()
            for p in s.portfolios:
                db.add(
                    PortfolioRecord(
                        id=p.id,
                        company_id="demo",
                        assigned_to=p.assigned_to,
                        data=p.model_dump(),
                    )
                )

    def load(self):
        with self.session() as db:
            company = db.get(Company, "demo")
            return State(
                version=company.version,
                settings=company.settings,
                employees=[
                    e.data
                    for e in db.scalars(
                        select(EmployeeRecord).order_by(EmployeeRecord.id)
                    )
                ],
                portfolios=[
                    {**p.data, "assigned_to": p.assigned_to}
                    for p in db.scalars(
                        select(PortfolioRecord).order_by(PortfolioRecord.id)
                    )
                ],
            )

    def save(self, state: State):
        with self.session.begin() as db:
            changed = db.execute(
                update(Company)
                .where(Company.id == "demo", Company.version == state.version)
                .values(version=state.version + 1, settings=state.settings.model_dump())
            )
            if changed.rowcount != 1:
                raise Conflict(
                    "Data changed since this view was loaded. Refresh and try again."
                )
            # Upserts preserve foreign keys; this API deliberately does not remove records.
            existing_e = set(db.scalars(select(EmployeeRecord.id)))
            existing_p = set(db.scalars(select(PortfolioRecord.id)))
            if not existing_e.issubset(
                {e.id for e in state.employees}
            ) or not existing_p.issubset({p.id for p in state.portfolios}):
                raise ValueError("Record deletion is not supported")
            for e in state.employees:
                db.merge(
                    EmployeeRecord(id=e.id, company_id="demo", data=e.model_dump())
                )
            db.flush()
            for p in state.portfolios:
                db.merge(
                    PortfolioRecord(
                        id=p.id,
                        company_id="demo",
                        assigned_to=p.assigned_to,
                        data=p.model_dump(),
                    )
                )
        return state.model_copy(update={"version": state.version + 1})

    def record(self, id, kind, data):
        with self.session.begin() as db:
            db.add(
                RunRecord(
                    id=id,
                    company_id="demo",
                    kind=kind,
                    created_at=datetime.now(timezone.utc).isoformat(),
                    data=data,
                )
            )

    def runs(self):
        with self.session() as db:
            return [
                {"id": r.id, "kind": r.kind, "created_at": r.created_at, "data": r.data}
                for r in db.scalars(
                    select(RunRecord).order_by(RunRecord.created_at.desc()).limit(30)
                )
            ]
