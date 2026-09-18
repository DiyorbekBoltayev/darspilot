"""Asosiy zanjir testlari: masala generatori, skaner (OMR), baholash."""
import random

import pytest

from app import grading, omr, problems, simulate

LEVELS = ["B1", "B2", "B3", "B4"]


@pytest.mark.parametrize("template", list(problems.TEMPLATES))
@pytest.mark.parametrize("level", LEVELS)
def test_generator_valid(template, level):
    for seed in range(200):
        spec = problems.generate(template, level, seed)
        for q in spec["questions"]:
            if q["key"] == "q5":
                assert problems.fits_grid(problems.parse_num(q["answer"]))
                continue
            texts = [o["text"] for o in q["options"]]
            assert len(texts) == 4 and len(set(texts)) == 4
            assert sum(o["correct"] for o in q["options"]) == 1
            assert all(o["error"] for o in q["options"] if not o["correct"])
        for n in spec["numbers_required"]:
            assert n in spec["story"]


def test_grading_detects_interpretation_root_cause():
    spec = problems.generate("qarama_qarshi", "B2", 7)
    rng = random.Random(0)
    marks = simulate.simulate_answers(spec, "tayanch", rng)
    res = grading.grade(spec, marks)
    assert res["correct"] == 5
    assert res["primary_error"].startswith("talqin")
    assert res["root_cause_note"]


def test_grading_direction_error():
    spec = problems.generate("qarama_qarshi", "B2", 3)
    marks = simulate.simulate_answers(spec, "model", random.Random(1))
    res = grading.grade(spec, marks)
    assert res["primary_error"].startswith("model")


def test_omr_roundtrip_ten_cards():
    """Bitta suratdagi 10 ta kartochka javob bloki xatosiz o'qilishi kerak."""
    rng = random.Random(5)
    specs = {lvl: problems.generate("amallar_tartibi", lvl, 11) for lvl in LEVELS}
    cards = [{"journal_no": j, "code": f"5B-{j:02d}", "name": f"O'quvchi {j}", "level": rng.choice(LEVELS)} for j in range(1, 11)]
    for c in cards:
        c["spec"] = specs[c["level"]]
    answers = {c["journal_no"]: simulate.simulate_answers(c["spec"], rng.choice(simulate.PROFILES), rng) for c in cards}
    img = simulate.make_photo(cards, answers, "18.09.2026", "Test", "5-B", seed=9)
    reads, _ = omr.scan_image(img)
    assert {r.journal_no for r in reads} == set(answers)
    for r in reads:
        assert r.marks == answers[r.journal_no], (r.journal_no, r.marks, answers[r.journal_no])
