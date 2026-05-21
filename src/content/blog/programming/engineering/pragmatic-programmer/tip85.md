---
title: "Tip 85: Organize Fully Functional Teams"
date: 2026-05-12T13:00:00
description: "완전한 기능을 갖춘 팀을 구성하라. 기능 전체를 전달할 수 있는 팀이 효율적이다."
series: "The Pragmatic Programmer"
seriesOrder: 85
tags: [pragmatic-programmer, team, organization]
draft: false
---

## 이 팁의 메시지

> **Tip 85: Organize Fully Functional Teams.** Organize around functionality, not job functions.

직무 기능이 아니라 기능 중심으로 조직하라.

## 기능 팀 vs 직무 팀

![Function vs feature-based team organization](/images/blog/pragmatic-programmer/diagrams/tip85-team-org.svg)

## 직무 중심의 문제

**기능 하나를 전달하려면:**


**1. 프론트 팀에 요청 → 큐에서 대기**


**2. 백엔드 팀에 요청 → 큐에서 대기**


**3. DBA 팀에 요청 → 큐에서 대기**


**4. QA 팀에 요청 → 큐에서 대기**


**5. 각 팀 사이 조율 필요**


**6. 책임 소재 불명확**

팀 간 핸드오프가 지연과 오해를 만든다.

## 기능 팀의 장점

| 직무 팀 | 기능 팀 |
|---------|---------|
| 팀 간 핸드오프 | 팀 내 협업 |
| 부분 책임 | 전체 책임 |
| 긴 리드 타임 | 짧은 리드 타임 |
| 팀 간 조율 필요 | 자체 조율 |
| 기능 이해 분산 | 기능 이해 집중 |

## 기능 팀 구성

**이상적인 기능 팀:**

- 프론트엔드 개발자 1-2명
- 백엔드 개발자 2-3명
- QA 엔지니어 1명
- 제품 담당자/디자이너 (파트타임 가능)

**팀이 할 수 있어야 하는 것:**

- 요구사항 분석
- 설계
- 구현 (프론트 + 백엔드)
- 테스트
- 배포
- 운영

## 팀의 자율성

기능 팀은 자율적으로 결정한다.

**팀이 결정하는 것:**

- 기술 스택 선택 (가이드라인 내)
- 작업 방식
- 일정 조율
- 우선순위 세부 조정
- 코드 리뷰 프로세스

**조직이 결정하는 것:**

- 전략적 방향
- 팀 간 조율
- 전사 표준
- 자원 배분

## 팀과 시스템 경계

콘웨이 법칙에 따르면 시스템 구조가 조직 구조를 반영한다.

```text
직무 팀:
→ 계층화된 아키텍처 (프론트/백엔드/DB 분리)
→ 팀 간 API 경계

기능 팀:
→ 마이크로서비스 / 모듈러 모놀리스
→ 기능별 경계
```

팀 구조를 바꾸면 시스템 구조도 바뀐다.

## 전문성 유지

기능 팀이라고 전문성을 포기하는 게 아니다.

**전문성 유지 방법:**

- 길드/챕터: 같은 직무끼리 정기 모임
- 기술 리드: 전사 기술 방향 조율
- 코드 리뷰: 교차 팀 리뷰
- 스터디 그룹: 기술별 학습 모임
- 멘토링: 경험자-신입 연결

## 전환 시 주의점

**점진적 전환:**


**1. 작은 파일럿 팀으로 시작**


**2. 성공 사례 만들기**


**3. 점진적 확대**


**4. 기존 조직과 병행**


**5. 성과 측정 및 조정**

**실패 원인:**

- 급격한 전환
- 지원 없는 변화
- 기존 문화 무시
- 명확하지 않은 목표

## 정리

- 직무가 아니라 기능 중심으로 팀을 구성한다.
- 기능 팀은 기능 전체를 전달할 수 있다.
- 팀 간 핸드오프가 줄어 속도가 빨라진다.
- 팀이 자율적으로 결정하고 책임진다.
- 길드, 챕터로 전문성을 유지한다.
- 점진적으로 전환하고 성과를 측정한다.

## 다음 장 예고

[Tip 86: Do What Works, Not What's Fashionable](/blog/programming/engineering/pragmatic-programmer/tip86)에서는 유행이 아닌 효과를 따르는 방법을 다룬다.

## 관련 항목

- [Tip 83: Maintain Small, Stable Teams](/blog/programming/engineering/pragmatic-programmer/tip83)
- [Tip 82: Agile Is Not a Noun; Agile Is How You Do Things](/blog/programming/engineering/pragmatic-programmer/tip82)
