---
title: "Agile & Lean Software Engineering: 서문"
date: 2026-05-20T00:00:00
description: "Agile Manifesto부터 XP·Scrum·Kanban·Lean·CD·DevOps·Accelerate·Team Topologies까지 155편 종합 시리즈. 30+권 정전(canon)을 한 자리에 묶어 실무에 즉시 적용할 수 있는 cookbook.'
series: 'Agile & Lean Software Engineering"
seriesOrder: 0
tags: [agile, lean, xp, scrum, kanban, devops, cd, accelerate]
type: tech
featured: true
draft: true

---

## 이 시리즈가 다루는 것

Agile은 *과대 광고*와 *과소 적용* 사이에서 25년을 보냈습니다. 한쪽에는 Scrum 인증서를 받은 컨설턴트가 매뉴얼대로 절차를 강요하고, 다른 쪽에는 "Agile은 무용지물"이라며 폭포로 회귀하는 조직이 있습니다. 정작 *현장에서 작동하는 Agile*의 모습 — XP의 기술 실천, Scrum의 경험적 통제, Kanban의 흐름 관리, Lean의 낭비 제거, CD의 짧은 피드백, DevOps의 부서 합치기, Accelerate의 측정 가능한 성과 — 을 한 자리에서 통합한 자료는 의외로 드뭅니다.

이 시리즈는 그 간극을 메웁니다. **Agile Manifesto 4 가치부터 DORA 4 메트릭, Team Topologies의 4 팀 유형까지** 12개 영역을 155편으로 정리합니다. 각 글은 *한 개념* 또는 *한 실천*을 다루고, 다음 글로 자연스럽게 이어집니다.

- "Agile Manifesto의 '계약 협상보다 고객 협력'은 fixed-price 프로젝트에서 어떻게 적용하나?"
- "XP의 Pair Programming은 정말 효과가 있나? 실증 연구는 무엇을 말하나?"
- "Scrum의 Definition of Done은 어디까지 강제할 수 있나?"
- "Kanban의 WIP Limit는 어떻게 정하나? Little's Law는 어떻게 쓰나?"
- "Lean의 7 wastes를 소프트웨어에 어떻게 매핑하나?"
- "Continuous Delivery의 deployment pipeline은 어떤 단계로 구성하나?"
- "DORA 4 Key Metrics를 우리 조직에서 어떻게 측정하나?"
- "Team Topologies의 Stream-aligned/Platform/Enabling/Complicated-subsystem 구분은 Conway's Law와 어떻게 연결되나?"

## 대상 독자

이 시리즈는 *Agile 입문자~리더* 모두를 대상으로 합니다.

1. **Agile 입문자** — Part 1~3 (Manifesto·XP·Scrum)
2. **개발 실무자** — Part 4~7 (Kanban·Lean·Stories·CD)
3. **DevOps·SRE** — Part 7~9 (CD·DevOps·Accelerate)
4. **팀 리더·관리자** — Part 10~12 (Team·Culture·Startup·Scaling)

각 Part는 비교적 독립적이라 *관심 있는 Part부터* 골라 읽어도 무리가 없습니다. 다만 Part 1·2는 모든 독자가 먼저 보는 편이 좋습니다 — 이후 모든 Part가 그 위에 서 있기 때문입니다.

## 시리즈 구성

**총 12 Parts, 155편**으로 구성됩니다.

### 한눈에 보는 12 Parts

| Part | 영역 | 편수 | seriesOrder | 주 reference |
|------|------|------|-------------|--------------|
| 1 | Foundations & Manifesto | 8 | 1~8 | Agile Manifesto, Clean Agile |
| 2 | Extreme Programming | 24 | 9~32 | Beck XP Explained, Clean Agile |
| 3 | Scrum | 20 | 33~52 | Scrum Guide, Rubin Essential Scrum |
| 4 | Kanban | 15 | 53~67 | Anderson Kanban, Benson Personal Kanban |
| 5 | Lean Software Development | 12 | 68~79 | Poppendieck Lean SD, Goldratt The Goal |
| 6 | User Stories & Planning | 10 | 80~89 | Patton Story Mapping, Cohn Estimating |
| 7 | Continuous Delivery | 15 | 90~104 | Humble & Farley CD, Farley MSE |
| 8 | DevOps | 15 | 105~119 | DevOps Handbook, Phoenix/Unicorn |
| 9 | Accelerate & DORA | 10 | 120~129 | Forsgren Accelerate, DORA report |
| 10 | Team & Culture | 10 | 130~139 | Team Topologies, Lencioni, Edmondson |
| 11 | Lean Startup & Product | 8 | 140~147 | Ries Lean Startup, Humble Lean Enterprise |
| 12 | Scaling & Real-world | 8 | 148~155 | SAFe, LeSS, Nexus, DAD |
| **합** |  | **155** |  |  |

---

### Part 1 — Foundations & Manifesto (8편)

Agile의 *역사적 맥락*과 *철학적 토대*를 정리합니다. 왜 Manifesto가 2001년에 나왔는가, Waterfall이 정말 잘못된 모델이었는가, Iterative와 Incremental은 어떻게 다른가.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 1-01 | Agile Manifesto의 4 가치 | 2001 Snowbird 회동·4 가치의 맥락 |
| 1-02 | 12 원칙 깊이 보기 | 각 원칙의 함의·오해 |
| 1-03 | Waterfall에서 Agile까지 | Royce 1970·iterative의 뿌리 |
| 1-04 | Agile 방법론 비교 | XP·Scrum·Kanban·Lean·Crystal |
| 1-05 | Iterative vs Incremental | 두 개념 정확한 구분 |
| 1-06 | Empiricism — Inspect & Adapt | 경험적 프로세스 제어 |
| 1-07 | Sustainable Pace | 40-hour week의 진짜 의미 |
| 1-08 | Customer Collaboration over Contract | fixed-price 함정 |

### Part 2 — Extreme Programming (24편)

XP는 *Agile의 기술적 정수*입니다. Kent Beck의 두 판본(1999/2004), Clean Agile에서 Uncle Bob이 추려낸 핵심, 그리고 25년 동안의 실증 연구를 통합합니다.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 2-01 | XP 개요 — 왜 "extreme"인가 | good practice를 극단까지 |
| 2-02 | Iterative Development의 본질 | feedback loop 짧게 |
| 2-03 | 5 Values 개요 | Communication/Simplicity/Feedback/Courage/Respect |
| 2-04 | Feedback Value 깊이 | cost of change 곡선 |
| 2-05 | XP Principles 14가지 | humanity·economics·mutual benefit |
| 2-06 | 13 Primary Practices 한눈에 | practice 간 시너지 |
| 2-07 | Pair Programming | 실증 연구·반론 |
| 2-08 | TDD as XP Practice | TDD by Example cross-ref |
| 2-09 | Refactoring as XP Practice | 매일 작은 단위 |
| 2-10 | Simple Design 4 rules | "Once and Only Once" |
| 2-11 | Continuous Integration — XP 정의 | 매일 multiple integrate |
| 2-12 | Small Releases | 한 달 이내·가능하면 매주 |
| 2-13 | Collective Code Ownership | 함정과 대안 |
| 2-14 | Coding Standard | 강제 vs 자율 |
| 2-15 | Sustainable Pace | 40-hour vs 60-hour 비교 연구 |
| 2-16 | Whole Team / On-site Customer | Product Owner의 원형 |
| 2-17 | Metaphor | 가장 논란 많은 practice |
| 2-18 | Planning Game · Planning Poker | release/iteration planning |
| 2-19 | Spike | 위험 줄이기 위한 mini-investigation |
| 2-20 | XP Team Roles | coach·tracker·etc. |
| 2-21 | Distilled XP — Clean Agile 관점 | Uncle Bob의 추려낸 핵심 |
| 2-22 | XP 안티패턴 | 가장 흔한 실패 |
| 2-23 | XP vs Scrum vs Kanban | 어떻게 고르나 |
| 2-24 | XP Scaling 시도와 실패 | Industrial XP |

### Part 3 — Scrum (20편)

세계에서 가장 널리 쓰이는 Agile framework. 단순한 *3 역할 · 5 이벤트 · 3 산출물* 구조 안에 경험적 통제의 깊이가 숨어 있습니다.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 3-01 | Scrum 개요와 역사 | Takeuchi/Nonaka 1986 → Sutherland 1995 |
| 3-02 | 3 기둥 | Transparency·Inspection·Adaptation |
| 3-03 | Scrum 가치 | Commitment/Focus/Openness/Respect/Courage |
| 3-04 | Product Owner 역할 | value 책임·backlog 관리 |
| 3-05 | Scrum Master 역할 | facilitator vs manager |
| 3-06 | Development Team 자기조직화 | cross-functional |
| 3-07 | Product Backlog | DEEP·ordering·refinement |
| 3-08 | Sprint Backlog와 Increment | Done 정의 |
| 3-09 | Definition of Done | minimum vs ideal |
| 3-10 | Sprint — time-box | 1~4주·보통 2주 |
| 3-11 | Sprint Planning | What/How 두 부분 |
| 3-12 | Daily Scrum | 3 질문 vs walking the board |
| 3-13 | Sprint Review | demo + feedback |
| 3-14 | Sprint Retrospective | 4Ls·start-stop-continue·sailboat |
| 3-15 | Backlog Refinement | 10% 시간 |
| 3-16 | Sprint Goal | coherent objective |
| 3-17 | Burndown · Burnup chart | velocity 추적 |
| 3-18 | Scrum 안티패턴 | Cargo Cult Scrum |
| 3-19 | Nexus / Scrum@Scale | 멀티팀 scaling |
| 3-20 | LeSS — Large-Scale Scrum | feature team 강조 |

### Part 4 — Kanban (15편)

Toyota의 시각화 카드에서 출발해 David Anderson이 소프트웨어에 적용한 방법. *flow 최적화*와 *evolutionary change*가 핵심.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 4-01 | Kanban 기원 | TPS의 시각화 카드 |
| 4-02 | 소프트웨어 Kanban — Anderson 2010 | Microsoft XIT 사례 |
| 4-03 | 6 핵심 practices | Visualize·Limit WIP·Manage Flow |
| 4-04 | Visualize Work | Kanban board 설계 |
| 4-05 | Limit WIP — 왜 핵심인가 | Little's Law |
| 4-06 | Manage Flow | bottleneck 식별 |
| 4-07 | Make Policies Explicit | 카드 진입·종료 기준 |
| 4-08 | Implement Feedback Loops | daily·replenishment·retro |
| 4-09 | Improve Collaboratively | STATIK |
| 4-10 | WIP Limit 결정법 | 시작값과 조정 |
| 4-11 | Cycle Time · Lead Time · Throughput | flow metric |
| 4-12 | Cumulative Flow Diagram | 읽는 법 |
| 4-13 | Class of Service | Expedite·Fixed Date·Standard·Intangible |
| 4-14 | Personal Kanban | 개인 work 관리 |
| 4-15 | Scrumban | 두 방법 결합 |

### Part 5 — Lean Software Development (12편)

Toyota Production System의 정신을 소프트웨어에 옮긴 Poppendieck 부부의 7 원칙. *낭비 제거*와 *전체 최적화*.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 5-01 | Lean 기원 | Toyota Production System·Ohno 7 wastes |
| 5-02 | Eliminate Waste | 소프트웨어 7 wastes |
| 5-03 | Build Quality In | 발견 후 수정 X·발견 안 되게 |
| 5-04 | Create Knowledge | set-based design·learning loop |
| 5-05 | Defer Commitment | last responsible moment |
| 5-06 | Deliver Fast | small batches·queueing theory |
| 5-07 | Respect People | engaged worker |
| 5-08 | Optimize the Whole | value stream |
| 5-09 | Value Stream Mapping | 그리는 법 |
| 5-10 | Theory of Constraints | 5 focusing steps |
| 5-11 | Just-in-Time vs Just-in-Case | inventory cost |
| 5-12 | Lean과 Agile의 관계 | overlap과 차이 |

### Part 6 — User Stories & Planning (10편)

Agile 요구사항 관리의 *공용어*. Mike Cohn과 Jeff Patton의 표준을 통합.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 6-01 | User Story 기본 | As a / I want / So that |
| 6-02 | INVEST 원칙 | 6 속성 |
| 6-03 | 3C | Card · Conversation · Confirmation |
| 6-04 | Acceptance Criteria | given-when-then |
| 6-05 | Story Mapping | Patton 기법·backbone |
| 6-06 | Epic / Theme / Story / Task | granularity 계층 |
| 6-07 | Splitting Stories | SPIDR 패턴 |
| 6-08 | Story Point Estimation | relative sizing |
| 6-09 | Planning Poker | Wideband Delphi 변형 |
| 6-10 | Release Planning | velocity 기반 |

### Part 7 — Continuous Delivery (15편)

Jez Humble과 Dave Farley가 정립한 *모든 변경을 production-ready로 유지하는* 실천. Agile의 기술적 뒷받침.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 7-01 | CI · CD · Continuous Deployment 구분 | 세 용어 정확히 |
| 7-02 | Deployment Pipeline | commit → build → test → deploy |
| 7-03 | Build Automation | 10분 안에 |
| 7-04 | Testing Pyramid in CD | unit > component > integration > e2e |
| 7-05 | Configuration Management | code·app·infra·system |
| 7-06 | Database Changes in CD | schema migration |
| 7-07 | Trunk-Based Development vs GitFlow | 비교 |
| 7-08 | Feature Flags · Toggle | release/operational/permission/experiment |
| 7-09 | Blue-Green Deployment | 무중단 배포 |
| 7-10 | Canary Release | 점진 배포 |
| 7-11 | Dark Launch | Facebook 패턴 |
| 7-12 | Rolling Update vs Recreate | K8s 패턴 |
| 7-13 | Rollback 전략 | forward fix vs revert |
| 7-14 | Pipeline as Code | Jenkinsfile·GitHub Actions |
| 7-15 | Deployment Frequency 최적화 | DORA |

### Part 8 — DevOps (15편)

Dev와 Ops의 *문화적 합치*. Three Ways · CALMS · Phoenix Project의 통합 정리.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 8-01 | DevOps 정의 | Dev와 Ops 합치기 |
| 8-02 | Three Ways | Flow · Feedback · Continuous Learning |
| 8-03 | The Phoenix Project | 줄거리 + 교훈 |
| 8-04 | The Unicorn Project | 줄거리 + 교훈 |
| 8-05 | Infrastructure as Code | Terraform·Pulumi |
| 8-06 | Configuration Management | Ansible·Chef·Puppet |
| 8-07 | Containerization | Docker |
| 8-08 | Orchestration | Kubernetes |
| 8-09 | Observability | logs·metrics·traces |
| 8-10 | SRE 개요 | Google 운영 원칙 |
| 8-11 | Error Budget | 신뢰성 vs 속도 trade-off |
| 8-12 | Blameless Postmortem | 학습 문화 |
| 8-13 | ChatOps | Hubot 패턴 |
| 8-14 | GitOps | Argo CD·Flux |
| 8-15 | Platform Engineering | Team Topologies 연계 |

### Part 9 — Accelerate & DORA (10편)

Forsgren의 *실증 연구*. "Agile이 효과 있다"가 아니라 *무엇이* 얼마나 효과 있는가를 데이터로 보여 줍니다.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 9-01 | Accelerate 책 요약 | research 기반 |
| 9-02 | DORA 4 Key Metrics | DF·LT·MTTR·CFR |
| 9-03 | High vs Low Performer | 200×~2,500× 격차 |
| 9-04 | 24 Capabilities | 성과 driver |
| 9-05 | Westrum Culture | Pathological/Bureaucratic/Generative |
| 9-06 | Organizational Performance | speed and stability |
| 9-07 | SPACE Framework | developer productivity |
| 9-08 | DORA 측정 — instrumenting | Four Keys project |
| 9-09 | DORA 개선 로드맵 | 어떻게 elite로 가나 |
| 9-10 | DORA 비판과 한계 | Goodhart's law |

### Part 10 — Team & Culture (10편)

기술보다 *사람*. Conway's Law·Team Topologies·Psychological Safety·Five Dysfunctions를 통합.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 10-01 | Conway's Law | Inverse Conway Maneuver |
| 10-02 | Team Topologies 4 팀 유형 | Stream/Platform/Enabling/Complicated |
| 10-03 | Team Interaction Modes | Collaboration·XaaS·Facilitating |
| 10-04 | Cognitive Load | team-first 사고 |
| 10-05 | Spotify Model | 신화와 진실 |
| 10-06 | Psychological Safety | Edmondson 연구 |
| 10-07 | Five Dysfunctions | Lencioni |
| 10-08 | Tuckman 모델 | Forming/Storming/Norming/Performing |
| 10-09 | Long-lived Stable Teams | pizza two-team |
| 10-10 | Engineering Culture | Netflix·Pixar·Spotify |

### Part 11 — Lean Startup & Product (8편)

Eric Ries가 Lean을 *스타트업과 제품 발견*에 적용한 사고. Build-Measure-Learn loop.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 11-01 | Lean Startup | Build-Measure-Learn |
| 11-02 | MVP | Concierge·Wizard of Oz·Smoke test |
| 11-03 | Validated Learning | 가설 검증 |
| 11-04 | Pivot vs Persevere | 결정 기준 |
| 11-05 | Innovation Accounting | 3 단계 |
| 11-06 | A/B Testing | split-run 실험 |
| 11-07 | Customer Development | Steve Blank |
| 11-08 | Lean Enterprise | 대규모 조직 |

### Part 12 — Scaling & Real-world (8편)

100명 이상 조직에서 Agile은 어떻게 작동하나. SAFe·LeSS·Nexus·DAD 비교와 실전 함정.

| # | 글 제목 | 핵심 |
|---|---------|------|
| 12-01 | Scaling Agile 개요 | 100명+ 조직 패턴 |
| 12-02 | SAFe | 핵심과 비판 |
| 12-03 | LeSS · LeSS Huge | Larman & Vodde |
| 12-04 | Nexus | Schwaber |
| 12-05 | Disciplined Agile | Ambler PMI |
| 12-06 | Distributed · Remote Teams | agile 실천 |
| 12-07 | Cultural Transformation | agile 도입 함정 |
| 12-08 | 시리즈 마무리 | 컨텍스트에 맞게 골라 쓰기 |

---

## 학습 로드맵

155편이 부담스러우면 단계별로 접근하세요.

### 입문자 (Part 1~3, 52편)

Agile을 처음 만난다면 토대부터.

- **Part 1** — Manifesto·12 원칙·역사
- **Part 2** — XP 24편 (기술 실천의 정수)
- **Part 3** — Scrum 20편 (가장 널리 쓰이는 framework)

### 실무자 (Part 4~9, 77편)

기초가 잡힌 뒤 *flow 관리*와 *기술 실천*으로 확장.

- **Part 4** — Kanban (flow 시각화·WIP 제한)
- **Part 5** — Lean SD (낭비 제거·전체 최적화)
- **Part 6** — User Story·Planning (요구사항 관리)
- **Part 7** — CD (자동화 deployment pipeline)
- **Part 8** — DevOps (조직·도구 통합)
- **Part 9** — Accelerate·DORA (성과 측정)

### 리더 (Part 10~12, 26편)

팀과 조직 수준의 실천.

- **Part 10** — Team Topologies·Conway·Culture
- **Part 11** — Lean Startup·MVP·Validated Learning
- **Part 12** — Scaling·SAFe·LeSS·실전 함정

## 자매 시리즈와의 관계

이 시리즈는 *프로세스·방법론·문화*에 집중합니다. *기술 실천의 깊이*는 다른 시리즈에서 더 자세히.

| 주제 | 이 시리즈 | 자매 시리즈 |
|------|-----------|------------|
| TDD 기초·실천 | Part 2-08 (XP 관점) | [TDD by Example](/blog/programming/engineering/tdd-by-example/ch01) |
| Refactoring 기법 | Part 2-09 (XP 관점) | Refactoring Catalog |
| Clean Code·SOLID | Part 2-10 (Simple Design) | [Clean Code](/blog/programming/engineering/clean-code/chapter01-clean-code) |
| Legacy Code 대응 | Part 5 (Lean 관점) | [Working Effectively with Legacy Code](/blog/programming/engineering/legacy-code/ch01) |
| 팀·사람 관리 | Part 10 (Topologies) | [Peopleware](/blog/programming/engineering/peopleware/ch01), [Mythical Man-Month](/blog/programming/engineering/mythical-man-month/ch01) |
| 테스트 설계 철학 | Part 7-04 (Pyramid) | [Khorikov Unit Testing](/blog/programming/engineering/khorikov-unit-testing/chapter01-goal-of-unit-testing) |
| OO 통합 테스트 | Part 2-08 (TDD 적용) | [Growing OO Software Guided by Tests](/blog/programming/engineering/goos/chapter01-what-is-tdd) |
| 실무 프로그래머 자세 | Part 1 (Manifesto) | [Pragmatic Programmer](/blog/programming/engineering/pragmatic-programmer/tip01) |
| 거대 코드베이스 운영 | Part 8 (DevOps) | [Code Complete](/blog/programming/engineering/code-complete/ch01-Welcome-to-Software-Construction) |

## 사전 지식

- 소프트웨어 개발 1년 이상 (Agile/방법론 용어 익숙)
- Git·CI/CD 기본 개념 (Part 7~8)
- 팀 작업 경험 (Part 3·10)

특정 언어·플랫폼 종속은 없습니다. 예시는 *언어 중립*으로 가지만, CD/DevOps에서 도구를 다룰 때는 산업 표준(Docker·Kubernetes·GitHub Actions)을 씁니다.

## 집필 원칙

1. **원전 인용 우선** — Beck·Martin·Anderson·Poppendieck·Humble·Kim·Forsgren·Skelton의 *원문*을 직접 인용.
2. **실증 데이터 포함** — "효과 있다" 대신 "DORA report 2024 기준 elite 조직은 daily 이상 배포".
3. **반론·한계 같이** — 모든 방법론에는 적용 한계가 있습니다. 그것도 같이 다룹니다.
4. **cross-link** — 자매 시리즈로 깊이 들어갈 수 있게.
5. **draft 우선** — 본문이 완성되지 않은 stub은 `draft: true`로 두고 단계적으로 채웁니다.

## 레퍼런스

**핵심 서적**

- *Extreme Programming Explained: Embrace Change* (1st/2nd ed) — Kent Beck (1999/2004)
- *Clean Agile: Back to Basics* — Robert C. Martin (2019)
- *The Scrum Guide* — Schwaber & Sutherland (2020 rev)
- *Essential Scrum* — Kenneth Rubin (2012)
- *Scrum: A Pocket Guide* — Gunther Verheyen (2019)
- *Kanban: Successful Evolutionary Change for Your Technology Business* — David J. Anderson (2010)
- *Personal Kanban* — Jim Benson & Tonianne DeMaria Barry (2011)
- *Lean Software Development* — Mary & Tom Poppendieck (2003)
- *Implementing Lean Software Development* — Poppendieck (2006)
- *The Lean Startup* — Eric Ries (2011)
- *Lean Enterprise* — Humble, Molesky, O'Reilly (2014)
- *User Story Mapping* — Jeff Patton (2014)
- *Agile Estimating and Planning* — Mike Cohn (2005)
- *User Stories Applied* — Mike Cohn (2004)
- *Continuous Delivery* — Jez Humble & Dave Farley (2010)
- *Modern Software Engineering* — Dave Farley (2021)
- *Release It!* (2nd ed) — Michael Nygard (2018)
- *The DevOps Handbook* — Kim, Humble, Debois, Willis (2016)
- *The Phoenix Project* — Gene Kim (2013)
- *The Unicorn Project* — Gene Kim (2019)
- *Site Reliability Engineering* — Beyer et al. (Google, 2016)
- *Accelerate* — Forsgren, Humble, Kim (2018)
- *Team Topologies* — Skelton & Pais (2019)
- *The Five Dysfunctions of a Team* — Patrick Lencioni (2002)
- *The Fearless Organization* — Amy Edmondson (2018)
- *Drive* — Daniel Pink (2009)
- *Crystal Clear* — Alistair Cockburn (2004)
- *Agile Software Development* — Cockburn (2002)
- *Agile Retrospectives* — Esther Derby & Diana Larsen (2006)
- *SAFe Reference Guide* — Dean Leffingwell et al.
- *Large-Scale Scrum: More with LeSS* — Larman & Vodde (2016)
- *Choose Your WoW (Disciplined Agile)* — Scott Ambler

**부 서적 / 관련**

- *Refactoring* (Fowler), *TDD by Example* (Beck), *GOOS* (Freeman/Pryce) — 자매 시리즈
- *Peopleware* (DeMarco/Lister), *Mythical Man-Month* (Brooks) — 자매 시리즈
- *Domain-Driven Design* (Evans), *The Goal* (Goldratt), *Toyota Production System* (Ohno)

**논문 / 표준**

- Agile Manifesto (2001) — agilemanifesto.org
- Conway's Law (1968) — Melvin Conway 원논문
- Westrum culture typology (2004)
- SPACE framework — Microsoft Research (2021)
- Theory of Constraints — Goldratt
- PDCA cycle — Deming
- CALMS — DevOps 5 pillars

**산업 자료**

- [DORA State of DevOps Report](https://dora.dev) (2014~) — 매년 발행
- [Atlassian Agile Coach](https://atlassian.com/agile)
- [Martin Fowler's bliki](https://martinfowler.com/bliki) — Agile articles
- [ThoughtWorks Tech Radar](https://thoughtworks.com/radar)
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com) — Paul Hammant

## 이 시리즈를 완주하면

- Agile Manifesto의 4 가치·12 원칙을 *조직 컨텍스트에 맞게* 해석할 수 있습니다.
- XP의 13 primary practices를 *왜 함께 써야 하는가*까지 설명할 수 있습니다.
- Scrum의 3 역할·5 이벤트·3 산출물을 *경험적 통제의 관점*에서 운영할 수 있습니다.
- Kanban의 flow metric(Cycle Time·Lead Time·CFD)을 *읽고 행동*할 수 있습니다.
- Lean의 7 wastes를 *소프트웨어 value stream*에 매핑할 수 있습니다.
- User Story를 INVEST·3C·SPIDR로 *건강하게 split*할 수 있습니다.
- CD deployment pipeline을 *commit-to-production 1시간 이내*로 설계할 수 있습니다.
- DORA 4 Key Metrics를 *측정하고 elite로 개선*할 수 있습니다.
- Team Topologies 4 팀 유형으로 *조직 구조를 진단*할 수 있습니다.
- Conway's Law를 *역으로 활용해 아키텍처를 설계*할 수 있습니다.
- Psychological Safety를 *팀에 도입하는 구체 방법*을 알 수 있습니다.
- Lean Startup의 Build-Measure-Learn을 *제품 발견*에 적용할 수 있습니다.
- SAFe·LeSS·Nexus·DAD를 *컨텍스트에 맞게 비교·선택*할 수 있습니다.

---

다음 글: [Part 1-01: Agile Manifesto의 4 가치](/blog/programming/engineering/agile-lean-engineering/part1-01-agile-manifesto-4-values)
