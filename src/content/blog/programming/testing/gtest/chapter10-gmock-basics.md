---
title: "Ch 10: gMock 기초"
date: 2026-05-10T10:00:00
description: "mock class 작성, EXPECT_CALL과 .Times/.WillOnce/.WillRepeatedly."
series: "gtest 심화"
seriesOrder: 10
tags: [gtest, gmock, mock, expect-call]
draft: true
---

> Outline — `MOCK_METHOD(ReturnT, Name, (Args...), (qualifiers))` 매크로. `EXPECT_CALL(mock, Method(matchers))`의 4가지 절 — `.Times`/`.WillOnce`/`.WillRepeatedly`/`.InSequence`. mock 객체 *수명*과 *expectation 검증 시점*(소멸 시). NiceMock vs StrictMock vs NaggyMock.
