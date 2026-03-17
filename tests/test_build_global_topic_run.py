from pipeline.build_global_topic_run import parse_global_topic_id


def test_parse_global_topic_id_extracts_integer_suffix():
    assert parse_global_topic_id("global_1675") == 1675
