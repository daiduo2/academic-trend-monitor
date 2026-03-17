import tempfile
import os
from git import Repo


def test_create_branch():
    from pipeline.evolution_state_manager import StateManager

    # Create temp git repo
    with tempfile.TemporaryDirectory() as tmpdir:
        repo = Repo.init(tmpdir)
        # Create initial commit
        with open(os.path.join(tmpdir, "init.txt"), "w") as f:
            f.write("init")
        repo.index.add(["init.txt"])
        repo.index.commit("Initial commit")

        sm = StateManager(tmpdir)
        branch_name = sm.create_branch("math", 1)

        assert branch_name == "evolution/math-001"
        assert branch_name in [b.name for b in repo.branches]


def test_commit_and_reset():
    from pipeline.evolution_state_manager import StateManager

    with tempfile.TemporaryDirectory() as tmpdir:
        repo = Repo.init(tmpdir)
        with open(os.path.join(tmpdir, "init.txt"), "w") as f:
            f.write("init")
        repo.index.add(["init.txt"])
        initial_commit = repo.index.commit("Initial commit")

        sm = StateManager(tmpdir)
        sm.create_branch("math", 1)

        # Make a change
        with open(os.path.join(tmpdir, "test.txt"), "w") as f:
            f.write("test content")

        # Commit
        commit_hash = sm.commit("Test commit", ["test.txt"])
        assert commit_hash is not None
        assert "test.txt" in repo.head.commit.stats.files

        # Reset
        sm.reset(initial_commit.hexsha)
        assert repo.head.commit == initial_commit
