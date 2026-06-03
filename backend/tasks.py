# =============================================================================
# MigrantShield — Phase 5 Task Queue (No ARQ)
# File: backend/tasks.py
# Description: Thin wrapper that triggers the background analysis job.
#              Uses FastAPI BackgroundTasks — no Redis, no ARQ, no persistent
#              connections. Works reliably on Windows and all platforms.
# =============================================================================

from __future__ import annotations

import logging
from fastapi import BackgroundTasks
from worker import analyze_contract

logger = logging.getLogger("migrantshield.tasks")


async def enqueue_analyze_contract(
    background_tasks: BackgroundTasks,
    contract_id: str,
    file_key: str,
) -> None:
    """
    Schedule the contract analysis job as a FastAPI background task.
    Returns immediately — analysis runs after HTTP response is sent.

    Args:
        background_tasks: FastAPI BackgroundTasks instance from the route.
        contract_id:      UUID string — primary key of the contracts row.
        file_key:         Supabase Storage path.
    """
    background_tasks.add_task(analyze_contract, {}, contract_id, file_key)
    logger.info(
        "Background task scheduled — contract_id=%s file_key=%s",
        contract_id,
        file_key,
    )