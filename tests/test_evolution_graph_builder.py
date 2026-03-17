import json
import tempfile
import os
from pathlib import Path


def test_load_evolution_cases():
    from pipeline.evolution_graph_builder import load_evolution_cases

    # Create temp file with test data
    test_cases = {
        "version": "1.0",
        "cases": [
            {
                "case_id": "test-001",
                "anchor_topic_id": "global_1",
                "anchor_topic_name": "Test Topic",
                "category": "math",
                "start_period": "2025-02",
                "event_types": ["emerged"]
            }
        ]
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_cases, f)
        temp_path = f.name

    try:
        cases = load_evolution_cases(temp_path)
        assert len(cases) == 1
        assert cases[0]["case_id"] == "test-001"
    finally:
        os.unlink(temp_path)


def test_build_topic_nodes():
    from pipeline.evolution_graph_builder import build_topic_nodes
    from pipeline.evolution_models import TopicMode

    cases = [
        {
            "anchor_topic_id": "global_1",
            "anchor_topic_name": "Topic A",
            "category": "math",
            "start_period": "2025-02",
            "anchor_topic_mode": "theory",
            "anchor_topic_profile": {
                "primary_mode": "theory",
                "method_score": 0,
                "problem_score": 0,
                "theory_score": 3
            }
        }
    ]

    nodes = build_topic_nodes(cases, ["2025-02"])
    assert len(nodes) == 1
    assert nodes[0].topic_id == "global_1"
    assert nodes[0].mode == TopicMode.theory
