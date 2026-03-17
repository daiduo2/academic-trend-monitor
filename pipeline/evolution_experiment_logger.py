"""Experiment logger for evolution experiments.

This module handles logging of experiment records to TSV files,
including append operations and data loading. It provides a simple
interface for tracking experiment history.
"""

import csv
import os
from typing import List

from pipeline.evolution_models import ExperimentRecord


# TSV column headers
TSV_HEADERS = [
    "timestamp",
    "domain",
    "git_branch",
    "git_commit",
    "hypothesis_id",
    "rule_changed",
    "change_summary",
    "new_events_count",
    "precision_change",
    "recall_change",
    "f1_score",
    "decision",
    "reason"
]


def _escape_field(value: str) -> str:
    """Escape special characters in a field value.

    Replaces tabs and newlines with spaces to ensure TSV format integrity.

    Args:
        value: The field value to escape.

    Returns:
        Escaped field value safe for TSV.
    """
    return value.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ')


def _record_to_row(record: ExperimentRecord) -> List[str]:
    """Convert an ExperimentRecord to a TSV row.

    Args:
        record: The experiment record to convert.

    Returns:
        List of string values for TSV row.
    """
    return [
        record.timestamp,
        record.domain,
        record.git_branch,
        record.git_commit,
        record.hypothesis_id,
        record.rule_changed,
        _escape_field(record.change_summary),
        str(record.new_events_count),
        str(record.precision_change),
        str(record.recall_change),
        str(record.f1_score),
        record.decision,
        _escape_field(record.reason)
    ]


def _row_to_record(row: List[str]) -> ExperimentRecord:
    """Convert a TSV row to an ExperimentRecord.

    Args:
        row: List of string values from TSV.

    Returns:
        ExperimentRecord populated from the row.
    """
    return ExperimentRecord(
        timestamp=row[0],
        domain=row[1],
        git_branch=row[2],
        git_commit=row[3],
        hypothesis_id=row[4],
        rule_changed=row[5],
        change_summary=row[6],
        new_events_count=int(row[7]),
        precision_change=float(row[8]),
        recall_change=float(row[9]),
        f1_score=float(row[10]),
        decision=row[11],
        reason=row[12]
    )


def log_experiment(
    log_path: str,
    record: ExperimentRecord
) -> None:
    """Append experiment record to TSV log file.

    Creates the file with headers if it doesn't exist, otherwise appends
to the existing file.

    TSV Format:
    timestamp\tdomain\tgit_branch\tgit_commit\thypothesis_id\trule_changed\tchange_summary\tnew_events_count\tprecision_change\trecall_change\tf1_score\tdecision\treason

    Args:
        log_path: Path to the TSV log file.
        record: The experiment record to log.
    """
    file_exists = os.path.exists(log_path)
    file_is_empty = not file_exists or os.path.getsize(log_path) == 0

    with open(log_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter='\t', lineterminator='\n')

        # Write header if file is new or empty
        if file_is_empty:
            writer.writerow(TSV_HEADERS)

        # Write the record
        writer.writerow(_record_to_row(record))


def load_experiments(log_path: str) -> List[ExperimentRecord]:
    """Load all experiment records from TSV.

    Args:
        log_path: Path to the TSV log file.

    Returns:
        List of ExperimentRecord objects. Returns empty list if file
        doesn't exist or is empty.
    """
    if not os.path.exists(log_path):
        return []

    if os.path.getsize(log_path) == 0:
        return []

    records = []

    with open(log_path, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')

        # Skip header row
        try:
            next(reader)
        except StopIteration:
            return []

        for row in reader:
            if len(row) >= len(TSV_HEADERS):
                try:
                    record = _row_to_record(row)
                    records.append(record)
                except (ValueError, IndexError):
                    # Skip malformed rows
                    continue

    return records
