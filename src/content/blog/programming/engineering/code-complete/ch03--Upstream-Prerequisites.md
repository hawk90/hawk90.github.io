---
title: "Chapter 3: Measure Twice, Cut Once — Upstream Prerequisites"
date: 2025-06-20T03:00:00
description: "construction 시작 전 준비 — 문제 정의·요구사항·아키텍처. 잘 운영되는 프로젝트는 노력의 10~20%, 일정의 20~30%를 사전 작업에."
series: "Code Complete"
seriesOrder: 3
tags: [code-complete, requirements, architecture, McConnell]
draft: true
---

## 이 챕터의 메시지

> "Measure twice, cut once." — construction은 — 프로젝트 총 비용의 **최대 65%**. 가장 비싼 부분을 두세 번 하는 것은 — 소프트웨어에서도 안 좋다.

집을 짓기 전에 — 청사진 검토·허가 확인·기초 측량. McConnell은 — construction 시작 전 **세 가지 준비**를 강조: **문제 정의 → 요구사항 → 아키텍처**.

## 핵심 내용

- **목표 = 위험 감소** (§3.1 KEY POINT). 가장 큰 위험 = 부실한 요구사항·계획.
- 잘 운영되는 프로젝트 = **노력 10~20%, 일정 20~30%**가 — requirements + architecture + up-front planning (McConnell 1998, Kruchten 2000).
- **요구사항 오류 비용** — 단계가 늦어질수록 기하급수. 출시 후 발견 = **10~100배**.
- **요구사항은 변한다** — 25% 변경이 일반적, 재작업의 **70~85%**.
- 프로젝트 종류에 따라 — sequential / iterative 접근 선택.

## §3.1 Importance of Prerequisites

### 품질의 위치

품질을 — 어디서 강조하느냐.

- **끝**에서 강조 = 시스템 테스트. 그러나 — 테스트는 "wrong product" 또는 "right product, wrong way"를 — 감지 못한다.
- **중간**에서 강조 = construction 관행 (이 책의 대부분).
- **시작**에서 강조 = **고품질 제품 계획·요구·설계**.

> Pontiac Aztek을 — Rolls-Royce로 — 테스트만으로 만들 수 없다. 처음부터 Rolls-Royce로 설계해야.

### 위험 감소 (KEY POINT)

> 준비의 핵심 목표 = **위험 감소**. 가장 큰 두 위험 = **부실한 요구사항**과 **부실한 프로젝트 계획**.

### Causes of Incomplete Preparation

- 개발자가 — upstream 작업의 기법 훈련을 못 받음.
- "코딩을 빨리 시작"하고픈 — 충동.
- 매니저 무관심 — 25년 동안 Boehm, Booch, Wiegers가 외쳐 왔지만.
- **WISCA / WIMP 신드롬** — "Why isn't Sam Coding Anything?" / "Why isn't Mary Programming?"

### "Utterly Compelling and Foolproof Argument"

McConnell의 추천 — 매니저에게 4가지 응답:

1. **거부** — 잘못된 순서로 작업하지 않겠다고.
2. **코딩하는 척** — 책상에 옛 프로그램 리스팅을 두고, 실제론 요구사항·아키텍처.
3. **교육** — 매니저에게 — 기술 프로젝트의 본질 설명.
4. **이직** — 깨인 매니저가 — 다른 곳에 있다.

## §3.2 Determine the Kind of Software You're Working On

### Table 3-2 — 시스템 종류별 권장 관행

| | Business Systems | Mission-Critical | Embedded Life-Critical |
|---|---|---|---|
| **예** | 인터넷 사이트, 게임, 재고관리, 페이롤 | 임베디드, 게임, 패키지 SW | 항공전자, 의료, OS, 패키지 |
| **생명주기** | Agile(XP·Scrum·timebox), Evolutionary prototyping | Staged delivery, Evolutionary, Spiral | Staged, Spiral, Evolutionary |
| **계획·관리** | Incremental, as-needed | Basic up-front, Formal change | **Extensive** up-front, Rigorous change |
| **요구사항** | Informal spec | Semi-formal + reviews | **Formal spec + inspections** |
| **설계** | Design+coding 결합 | Architectural + informal detailed | Formal architecture + detailed inspections |
| **Construction** | Pair/individual, informal check-in | Pair/individual, as-needed reviews | Pair/individual, **formal code inspections** |
| **QA** | Devs test own, test-first | + separate test group | + separate QA group |
| **배포** | Informal | Formal | Formal |

### Sequential vs Iterative

Sequential 적합:
- 요구사항이 — 안정.
- 설계가 — 직관적이고 익숙.
- 팀이 — 응용 분야에 익숙.
- 위험 낮음.
- 장기 예측 가능성이 중요.
- 다운스트림 변경 비용 — 높을 것.

Iterative 적합:
- 요구사항이 — 잘 이해 안 됨, 또는 불안정 예상.
- 설계가 — 복잡·도전적.
- 팀이 — 응용 분야에 낯섬.
- 위험 높음.
- 장기 예측 가능성이 덜 중요.
- 다운스트림 변경 비용 — 낮을 것.

### Table 3-3·3-4 비교 (요지)

- 순차적 + 사전준비 X = **$2M** 총 비용 (반복 비용이 끝에 몰림).
- 반복적 + 사전준비 X = **$1.75M**.
- 순차적 + 사전준비 = **$1.2M**.
- **반복적 + 사전준비 = $1.1M** ← 최저.

> **KEY POINT** — 대부분 프로젝트는 — 완전 순차적도, 완전 반복적도 아니다. **요구사항 80% 사전 정의 + 변경 통제**가 — 현실적.

또는 — **20%만 사전 정의 + 작은 증분으로 발전**.

## §3.3 Problem-Definition Prerequisite

> *"If the 'box' is the boundary of constraints and conditions, then the trick is to find the box.... Don't think outside the box—find the box."* — Andy Hunt and Dave Thomas

- 시스템이 — 무엇을 푸는가의 — 명확한 진술.
- "product vision", "mission statement", "product definition" — 다른 이름.

### 좋은 vs 나쁜 문제 정의

- ✓ "We can't keep up with orders for the Gigatron" — **문제**처럼 들림.
- ✗ "We need to optimize our automated data-entry system to keep up with orders for the Gigatron" — **해법**처럼 들림.

### 사용자 언어로

> 연 매출 보고서 예 — 이미 분기 보고서가 있다면, **새 프로그램**보다 — 비서가 1분에 — 분기를 합산할 수 있다.

기술자 사고에 갇히면 — 잘못된 해법.

> **KEY POINT** — 문제 정의 실패 = **잘못된 문제를 푼다 + 옳은 문제를 안 푼다**. 이중 페널티.

## §3.4 Requirements Prerequisite

### 왜 공식 요구사항?

- **사용자가 기능을 — 결정**. 요구사항이 없으면 — 프로그래머가 추측.
- **합의의 기준** — 다른 프로그래머와의 — 논쟁 해결.

### 요구사항 변경의 비용 (HARD DATA)

큰 프로젝트에서 — 요구사항 오류 발견 단계별 비용 (요구사항 단계 = 1x):

| 발견 단계 | 비용 |
|---|---|
| 요구사항 | 1x |
| 아키텍처 | **3x** |
| 코딩 | **5~10x** |
| 시스템 테스트 | **10x** |
| 출시 후 | **10~100x** |

작은 프로젝트(낮은 관리 비용) = post-release 5~10x (Boehm & Turner 2004).

> **KEY POINT** — 요구사항에 — 신경을 쓰는 것이 = 시스템 변경을 — 최소화한다.

### The Myth of Stable Requirements

> 안정 요구사항 = **소프트웨어 개발의 성배**. 그러나 — 신화.

HARD DATA — 일반 프로젝트가 — **약 25%**의 요구사항 변경을 경험 (Boehm 1981, Jones 1994/2000). 일반 프로젝트 **재작업의 70~85%**가 — 요구사항 변경에서 (Leffingwell 1997, Wiegers 2003).

이유 = 고객도 — 모른다. 작업하면서 — 더 잘 이해하게 된다. **요구사항을 엄격히 따른다는 계획 = 고객에 응답하지 않는다는 계획**.

### Handling Requirements Changes During Construction

> **KEY POINT** — 5가지 전략:

1. **체크리스트 사용** — 요구사항 품질을 평가. 부족하면 — 멈춰 고침.
2. **변경 비용을 알린다** — 고객이 흥분하면 — "일정·비용 추정 후 결정". **schedule + cost** = 커피·찬물보다 — 정신을 깨운다.
3. **change-control procedure** — 정식 변경 통제 위원회. 모두가 행복.
4. **변경 수용 개발 방법** — Evolutionary Delivery, 짧은 사이클.
5. **프로젝트 폐기** — 요구사항이 — 특히 나쁘거나 휘발성이면 — 취소 고려.

### Requirements Checklist (요약)

긴 체크리스트. **Specific Functional**, **Specific Non-Functional (Quality)**, **Requirements Quality**, **Requirements Completeness**. 작은 프로젝트엔 — 일부만, 큰 프로젝트엔 — 전체.

## §3.5 Architecture Prerequisite

### 왜 아키텍처가 — prerequisite

> **KEY POINT** — 아키텍처 품질 = 시스템의 **개념적 통일성**(conceptual integrity). 잘 설계된 아키텍처가 — 시스템의 통일성을 — 위에서 아래까지 유지.

HARD DATA — 아키텍처 오류 수정 비용 = 요구사항 오류 수정과 — 동일 (또는 그보다 큼) (Basili & Perricone 1984, Willis 1998).

### 일반적 아키텍처 컴포넌트

PDF의 체크리스트 (이번 챕터 일부만):

- **Program Organization** — 시스템 개요. 12조각 직소가 — 1000조각보다 쉬움.
- **Major Classes** — 80/20 — 20% 클래스가 80% 행동을 — 명시.
- **Data Design** — 주요 파일/테이블. 한 서브시스템이 — 접근.
- **Business Rules** — 의존하는 규칙을 — 명시.
- **User Interface Design** — 모듈화 (CLI ↔ GUI 교체 가능).
- **Input/Output** — look-ahead / look-behind / just-in-time.
- **Resource Management** — DB 연결, 스레드, 핸들, 메모리.
- **Security** — threat model, untrusted data 처리, 암호화.
- **Performance** — 목표 + 추정.
- **Scalability** — 사용자·서버·DB 크기·트랜잭션 볼륨.
- **Interoperability** — 데이터·자원 공유 방식.
- **Internationalization / Localization** — I18N / L10N. 문자셋, 문자열 격리.
- **Error Processing** — corrective vs detective, active vs passive, propagation 전략. 코드의 — **약 90%**가 — 예외 처리(Shaw in Bentley 1982).
- **Fault Tolerance** — backup·voting·auxiliary code.
- **Architectural Feasibility** — 기술적 가능성. PoC·연구.
- **Overengineering** — robustness 목표 명시. 가장 약한 링크보다 — 약한 링크들의 곱이 — 약하다.
- **Buy-vs-Build Decisions** — GUI·DB·이미지·암호화·텍스트 처리 등 — 사도 됨.
- **Reuse Decisions** — 기존 코드의 — 적합 방법.
- **Change Strategy** — 휘발성 데이터 타입·파일 형식 — 격리. "design bugs are often subtle and occur by evolution with early assumptions being forgotten as new features or uses are added to a system."

### General Architectural Quality

- *The Mythical Man-Month* (Brooks 1995) 핵심 = **개념적 통일성**.
- "We've always done it that way" 정당화 경계 — McConnell의 pot roast 일화: 시어머니가 — 가르친 대로 — 양 끝을 잘랐다. 알고 보니 — 할머니의 팬이 작아서.
- Under-specifying vs over-specifying — 중간.
- 위험한 영역을 — 명시적 표시.
- 자신이 — 편안하지 않은 부분이 있으면 — 잘못된 아키텍처.

## §3.6 Amount of Time to Spend on Upstream Prerequisites

> 잘 운영되는 프로젝트는 — **노력의 10~20%, 일정의 20~30%**를 — requirements + architecture + up-front planning에 (McConnell 1998, Kruchten 2000).

이 수치는 — **detailed design은 포함 안 됨**. detailed design = construction의 일부.

요구사항이 불안정하다면:
- 큰 프로젝트 — 분석가와 함께 시간을 — 추가.
- 작은 프로젝트 — 휘발성이 construction에 — 최소 영향을 줄 만큼.
- **어떤 프로젝트든** — 요구사항이 불안정하면 — 요구사항 작업을 — **별개 프로젝트로** 취급.

> 집을 짓는 계약자가 — 고객이 "뭘 짓는지 모르겠지만, 얼마 들죠?"라고 하면 — 가고 만다. 그런데 소프트웨어에서는 — 자주 일어난다.

## Key Points (§)

McConnell의 원문 8가지 (요약):

1. construction 준비의 — **핵심 목표 = 위험 감소**.
2. **고품질 = 처음부터 끝까지** 품질에 신경. 처음의 신경이 — 끝의 신경보다 — 결과에 큰 영향.
3. **상사·동료 교육**도 — 프로그래머의 일.
4. 프로젝트 종류가 — construction prereq에 큰 영향. 많은 프로젝트는 — 매우 반복적, 일부는 — 더 순차적.
5. 부실한 문제 정의 = construction 중 — **잘못된 문제** 푼다.
6. 부실한 요구사항 = 문제의 중요 디테일 놓침. 요구사항 변경은 — construction 후 단계에서 **20~100배** 비용.
7. 부실한 아키텍처 = 옳은 문제를 — 잘못된 방식으로 푼다.
8. 자기 프로젝트의 — 사전준비 접근을 이해하고 — **construction 접근을 그에 맞게** 선택.

## 정리

- **잘 운영되는 프로젝트**는 — 노력 10~20%, 일정 20~30%를 사전 작업에. (메모리 출처 "20~80%" 표는 잘못)
- 요구사항 오류 = 출시 후 발견 시 — **10~100배** 비용.
- 요구사항 25% 변경 = 일반적. 재작업 70~85% = 요구사항 변경.
- 사전 정의 80% + 변경 통제 = 현실적.
- 아키텍처 = **개념적 통일성**의 시스템.

## 관련 항목

- [Ch 1: Welcome](/blog/programming/engineering/code-complete/ch01-Welcome-to-Software-Construction)
- [Ch 2: Metaphors](/blog/programming/engineering/code-complete/ch02-Metaphors-for-a-Richer-Understanding)
- [Ch 4: Key Construction Decisions](/blog/programming/engineering/code-complete/ch04-Key-Construction-Decisions)
- [Clean Architecture Ch 16: Independence](/blog/programming/design/clean-architecture/chapter16-independence)
