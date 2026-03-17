from pipeline.backfill_recent_range import merge_by_key


def test_merge_by_key_prefers_incoming_records():
    existing = [{"id": "a", "value": 1}, {"id": "b", "value": 2}]
    incoming = [{"id": "b", "value": 3}, {"id": "c", "value": 4}]

    merged = merge_by_key(existing, incoming, "id")

    assert merged == [
        {"id": "a", "value": 1},
        {"id": "b", "value": 3},
        {"id": "c", "value": 4},
    ]
