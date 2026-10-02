"""SQLite persistence for PRISM simulation state."""
from pathlib import Path
import sqlite3
from typing import Dict, Tuple


class SimulationStateRepository:
    """Stores the latest simulation cursor and scenario for each machine."""

    def __init__(self, database_path: str = "prism.db"):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS simulation_state (
                    machine_id TEXT PRIMARY KEY,
                    scenario TEXT NOT NULL,
                    cursor_position INTEGER NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def load_all(self) -> Dict[str, Tuple[str, int]]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT machine_id, scenario, cursor_position FROM simulation_state"
            ).fetchall()
        return {
            row["machine_id"]: (row["scenario"], row["cursor_position"])
            for row in rows
        }

    def save(self, machine_id: str, scenario: str, cursor_position: int) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO simulation_state (machine_id, scenario, cursor_position)
                VALUES (?, ?, ?)
                ON CONFLICT(machine_id) DO UPDATE SET
                    scenario = excluded.scenario,
                    cursor_position = excluded.cursor_position,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (machine_id, scenario, cursor_position),
            )

    def status(self) -> dict:
        with self._connect() as connection:
            count = connection.execute(
                "SELECT COUNT(*) FROM simulation_state"
            ).fetchone()[0]
        return {"path": str(self.database_path), "saved_machine_states": count}
