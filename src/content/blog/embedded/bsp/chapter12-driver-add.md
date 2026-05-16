---
title: "Ch 12: 드라이버 추가 — 보드별 peripheral 통합"
date: 2026-05-20T12:00:00
description: "BSP에서 새 드라이버 통합 — 기존 드라이버 활용, DT binding, 새 드라이버 작성 결정."
series: "BSP Development"
seriesOrder: 12
tags: [embedded, bsp, driver, peripheral]
draft: true
---

> Outline — *대부분 새 드라이버가 필요 없다* — 기존 드라이버의 DT 노드만 추가하면 됨. *언제 새 드라이버를 써야 하나* — vendor proprietary IP. DT binding 작성 (`Documentation/devicetree/bindings/`에 추가). 보드별 driver 패치 관리 — out-of-tree vs upstream.
