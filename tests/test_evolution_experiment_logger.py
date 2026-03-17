"""Tests for evolution experiment logger.

This module tests the logging of experiment records to TSV files,
including append operations and data loading.
"""

import os
import tempfile
import pytest
from datetime import datetime

from pipeline.evolution_models import ExperimentRecord
from pipeline.evolution_experiment_logger import log_experiment, load_experiments


def test_log_experiment_creates_file():
    """Test that logging creates the file if it doesn't exist."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        os.unlink(temp_path)  # Delete the file

        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        log_experiment(temp_path, record)

        assert os.path.exists(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def test_log_experiment_appends_to_existing_file():
    """Test that logging appends to existing file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        # Write first record
        record1 = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )
        log_experiment(temp_path, record1)

        # Write second record
        record2 = ExperimentRecord(
            timestamp="2026-03-16T11:00:00Z",
            domain="physics",
            git_branch="evolution/physics-001",
            git_commit="def5678",
            hypothesis_id="HYP-002",
            rule_changed="temporal_window",
            change_summary="expand from 1 to 3 months",
            new_events_count=3,
            precision_change=-0.01,
            recall_change=0.08,
            f1_score=0.68,
            decision="discard",
            reason="Precision dropped below threshold"
        )
        log_experiment(temp_path, record2)

        # Load and verify both records exist
        records = load_experiments(temp_path)
        assert len(records) == 2
        assert records[0].domain == "math"
        assert records[1].domain == "physics"
    finally:
        os.unlink(temp_path)


def test_log_experiment_creates_header():
    """Test that logging creates header for new file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        os.unlink(temp_path)  # Delete the file

        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        log_experiment(temp_path, record)

        with open(temp_path, 'r') as f:
            content = f.read()
            assert "timestamp" in content
            assert "domain" in content
            assert "git_branch" in content
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def test_log_experiment_handles_special_characters():
    """Test that logging handles special characters in fields."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03\twith tab\nand newline"  # Special chars
        )

        log_experiment(temp_path, record)

        records = load_experiments(temp_path)
        assert len(records) == 1
        # Special characters should be escaped or handled
        assert "F1 improved" in records[0].reason
    finally:
        os.unlink(temp_path)


def test_load_experiments_returns_list():
    """Test that load_experiments returns a list of ExperimentRecords."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        log_experiment(temp_path, record)

        records = load_experiments(temp_path)
        assert isinstance(records, list)
        assert len(records) == 1
        assert isinstance(records[0], ExperimentRecord)
    finally:
        os.unlink(temp_path)


def test_load_experiments_empty_file():
    """Test loading from an empty or non-existent file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        os.unlink(temp_path)  # Delete the file

        records = load_experiments(temp_path)
        assert records == []
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def test_load_experiments_preserves_all_fields():
    """Test that all fields are preserved when loading."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        log_experiment(temp_path, record)

        records = load_experiments(temp_path)
        loaded = records[0]

        assert loaded.timestamp == "2026-03-16T10:00:00Z"
        assert loaded.domain == "math"
        assert loaded.git_branch == "evolution/math-001"
        assert loaded.git_commit == "abc1234"
        assert loaded.hypothesis_id == "HYP-001"
        assert loaded.rule_changed == "similarity_threshold"
        assert loaded.change_summary == "lower from 0.8 to 0.6"
        assert loaded.new_events_count == 5
        assert loaded.precision_change == 0.02
        assert loaded.recall_change == 0.05
        assert loaded.f1_score == 0.72
        assert loaded.decision == "keep"
        assert loaded.reason == "F1 improved by 0.03"
    finally:
        os.unlink(temp_path)


def test_log_experiment_numeric_fields():
    """Test that numeric fields are properly formatted."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.tsv', delete=False) as f:
        temp_path = f.name

    try:
        record = ExperimentRecord(
            timestamp="2026-03-16T10:00:00Z",
            domain="math",
            git_branch="evolution/math-001",
            git_commit="abc1234",
            hypothesis_id="HYP-001",
            rule_changed="similarity_threshold",
            change_summary="lower from 0.8 to 0.6",
            new_events_count=5,
            precision_change=0.02,
            recall_change=0.05,
            f1_score=0.72,
            decision="keep",
            reason="F1 improved by 0.03"
        )

        log_experiment(temp_path, record)

        with open(temp_path, 'r') as f:
            content = f.read()
            # Check numeric values are in the file
            assert "0.72" in content
            assert "0.02" in content
            assert "0.05" in content
            assert "5" in content
    finally:
        os.unlink(temp_path)
