from pipeline.math_lo_benchmark import evaluate_expected


def test_evaluate_expected_accepts_exact_match():
    passed, reason = evaluate_expected("math_lo_modal_continuity", "math_lo_modal_continuity")
    assert passed is True
    assert reason == "ok"


def test_evaluate_expected_accepts_forbidden_relation_when_different():
    passed, reason = evaluate_expected("math_lo_set_theory_continuity", "not math_lo_forcing_continuity")
    assert passed is True
    assert reason == "ok"


def test_evaluate_expected_rejects_forbidden_relation_when_equal():
    passed, reason = evaluate_expected("math_lo_forcing_continuity", "not math_lo_forcing_continuity")
    assert passed is False
    assert reason == "forbidden_relation"


def test_evaluate_expected_marks_review_needed_as_pass():
    passed, reason = evaluate_expected("none", "review-needed")
    assert passed is True
    assert reason == "review_only"
