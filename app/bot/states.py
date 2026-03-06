"""
FSM states for BriefBot conversations.
"""

from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class BriefState(StatesGroup):
    """States for text-based brief collection."""

    collecting_info = State()
    reviewing_draft = State()
    editing_draft = State()
    filling_missing_info = State()  # Feature 7: interactive missing info
    uploading_logo = State()  # Feature 9: logo upload
