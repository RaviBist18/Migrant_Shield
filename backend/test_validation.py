import sys

sys.path.insert(0, ".")

from worker import _validate_flag, _min_points_for_severity

test_cases = [
    {
        "name": "info - exactly 1/1 (should PASS)",
        "flag": {
            "severity": "info",
            "description": "यो एक सूचना हो।",
            "mitigation_steps": ["यसलाई हेर्नुहोस्।"],
        },
        "expect_pass": True,
    },
    {
        "name": "warning - only 1/1 (should FAIL, needs 2/2)",
        "flag": {
            "severity": "warning",
            "description": "यो चेतावनी हो।",
            "mitigation_steps": ["यसलाई ठीक गर्नुहोस्।"],
        },
        "expect_pass": False,
    },
    {
        "name": "warning - exactly 2/2 (should PASS)",
        "flag": {
            "severity": "warning",
            "description": "यो चेतावनी हो। यसले जोखिम बढाउँछ।",
            "mitigation_steps": ["पहिलो कदम चाल्नुहोस्।", "दोस्रो कदम चाल्नुहोस्।"],
        },
        "expect_pass": True,
    },
    {
        "name": "critical - only 1/1 (should FAIL, needs 2/2)",
        "flag": {
            "severity": "critical",
            "description": "यो गम्भीर समस्या हो।",
            "mitigation_steps": ["तुरुन्त सम्पर्क गर्नुहोस्।"],
        },
        "expect_pass": False,
    },
    {
        "name": "critical - exactly 2/2 (should PASS)",
        "flag": {
            "severity": "critical",
            "description": "यो गम्भीर समस्या हो। यसले ठूलो हानि पुर्‍याउँछ।",
            "mitigation_steps": ["तुरुन्त सम्पर्क गर्नुहोस्।", "उजुरी दिनुहोस्।"],
        },
        "expect_pass": True,
    },
]

print(f"{'TEST':50} {'EXPECT':10} {'GOT':10} {'RESULT'}")
print("-" * 90)
all_pass = True
for case in test_cases:
    problems = _validate_flag(case["flag"])
    got_pass = len(problems) == 0
    expect_pass = case["expect_pass"]
    ok = got_pass == expect_pass
    all_pass = all_pass and ok
    print(
        f"{case['name']:50} {'PASS' if expect_pass else 'FAIL':10} "
        f"{'PASS' if got_pass else 'FAIL':10} "
        f"{'✓ OK' if ok else '✗ MISMATCH: ' + str(problems)}"
    )

print("-" * 90)
print("ALL TESTS PASSED" if all_pass else "SOME TESTS FAILED — check logic above")
