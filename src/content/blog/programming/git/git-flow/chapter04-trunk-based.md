---
title: "Ch 4: Trunk-based Development"
date: 2026-05-17T04:00:00
description: "단일 trunk + 짧은 feature 브랜치 (또는 직접 커밋). 매우 빠른 통합."
tags: [Git, Trunk-based, Continuous Integration]
series: "Git Flow"
seriesOrder: 4
draft: true
---

## 작성 중

### 예정 내용
- Trunk = main, 모든 개발자가 직접 또는 짧은 브랜치
- 짧은 브랜치 (수 시간 ~ 1일)
- feature flag — 미완성 코드를 main에 (런타임 토글)
- 장점 — 빠른 통합 / merge 충돌 최소
- 단점 — 강한 CI / 테스트 문화 필요
- Google / Meta 등 대규모 모노레포 사용 사례
- 적합한 팀 — 강한 CI, 빠른 배포, 작은 팀 또는 대규모
