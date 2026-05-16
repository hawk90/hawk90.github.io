---
title: "Ch 7: Parameterized tests"
date: 2026-05-21T07:00:00
description: "TEST_P, INSTANTIATE_TEST_SUITE_P — 같은 로직을 다른 입력으로 자동 반복."
series: "gtest 심화"
seriesOrder: 7
tags: [gtest, parameterized, test-p, instantiate]
draft: true
---

> Outline — `class FooTest : public testing::TestWithParam<T>`. `TEST_P` 안에서 `GetParam()`. `INSTANTIATE_TEST_SUITE_P`로 `Values`·`Range`·`Combine`·`ValuesIn(container)` 주입. *generator 이름이 test 이름에 박히는* 방식. custom name generator.
