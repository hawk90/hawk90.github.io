---
title: "Ch 15: Custom printers와 traits"
date: 2026-05-10T15:00:00
description: "PrintTo·value-printer 커스터마이즈로 사용자 타입의 가독성 있는 실패 메시지."
series: "gtest 심화"
seriesOrder: 15
tags: [gtest, printto, printer, customization]
draft: true
---

> Outline — gtest는 사용자 타입을 *byte dump*로 출력하는데, `void PrintTo(const MyType&, std::ostream*)`를 *같은 namespace에* 두면 가져다 씀(ADL). `operator<<` 정의보다 *분리 권장* (production 코드 오염 회피). enum class의 string 변환 패턴.
