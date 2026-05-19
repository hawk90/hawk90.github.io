---
title: "Ch 6: 부동소수점과 문자열 assertions"
date: 2026-05-10T06:00:00
description: "EXPECT_NEAR·EXPECT_FLOAT_EQ·StrEq·StrCaseEq — 비교의 특수 케이스."
series: "gtest 심화"
seriesOrder: 6
tags: [gtest, float, string, near-equal]
draft: true
---

> Outline — 부동소수점 *4 ULP 허용* 비교(`EXPECT_FLOAT_EQ`)와 *절대 오차 허용*(`EXPECT_NEAR`)의 차이. `EXPECT_DOUBLE_EQ`. 문자열 — `StrEq`/`StrCaseEq`/`StrNe`/`HasSubstr`/`StartsWith`/`EndsWith`. `wchar_t`·`std::string_view` 처리.
