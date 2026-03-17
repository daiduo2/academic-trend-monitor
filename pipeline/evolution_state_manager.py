import json
import os
from pathlib import Path
from git import Repo
from typing import Dict, List, Optional


class StateManager:
    """Git-based state management for evolution experiments."""

    def __init__(self, repo_path: str):
        self.repo = Repo(repo_path)
        self.repo_path = Path(repo_path)
        self.sequence_file = self.repo_path / ".evolution" / "sequence.json"

    def _load_sequence(self) -> Dict[str, int]:
        """Load domain sequence counters."""
        if self.sequence_file.exists():
            with open(self.sequence_file, 'r') as f:
                return json.load(f)
        return {}

    def _save_sequence(self, sequence: Dict[str, int]):
        """Save domain sequence counters."""
        self.sequence_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.sequence_file, 'w') as f:
            json.dump(sequence, f)

    def create_branch(self, domain: str, sequence: Optional[int] = None) -> str:
        """Create a new experiment branch."""
        sequences = self._load_sequence()

        if sequence is None:
            sequence = sequences.get(domain, 0) + 1

        branch_name = f"evolution/{domain}-{sequence:03d}"

        # Create branch from current HEAD
        current = self.repo.head.reference
        new_branch = self.repo.create_head(branch_name, current)
        new_branch.checkout()

        # Update sequence
        sequences[domain] = sequence
        self._save_sequence(sequences)

        return branch_name

    def commit(self, message: str, files: List[str]) -> str:
        """Commit changes to current branch."""
        for file in files:
            file_path = self.repo_path / file
            if file_path.exists():
                self.repo.index.add([file])

        commit = self.repo.index.commit(message)
        return commit.hexsha[:7]

    def reset(self, to_ref: str):
        """Hard reset to reference."""
        self.repo.head.reset(to_ref, index=True, working_tree=True)
