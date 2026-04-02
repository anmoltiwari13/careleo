from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Domain
from app.models.hospital import Hospital


@dataclass
class TenantContext:
    hospital_id: int | None = None
    domain: str | None = None


async def resolve_tenant(db: AsyncSession, host: str, base_domain: str) -> TenantContext:
    plain_host = host.split(":")[0].lower()

    domain_match = await db.scalar(select(Domain).where(Domain.domain_name == plain_host))
    if domain_match:
        return TenantContext(hospital_id=domain_match.hospital_id, domain=plain_host)

    if plain_host.endswith(base_domain) and plain_host != base_domain:
        subdomain = plain_host[: -len(base_domain)].rstrip(".")
        hospital = await db.scalar(select(Hospital).where(Hospital.name.ilike(subdomain.replace("-", "%"))))
        if hospital:
            return TenantContext(hospital_id=hospital.id, domain=plain_host)

    return TenantContext(domain=plain_host)
