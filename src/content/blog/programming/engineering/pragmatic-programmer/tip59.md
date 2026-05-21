---
title: "Tip 59: Use Blackboards to Coordinate Workflow"
date: 2026-05-11T11:00:00
description: "블랙보드로 워크플로를 조율하라. 독립적인 에이전트들이 공유 공간에 정보를 게시하고 읽는다."
series: "The Pragmatic Programmer"
seriesOrder: 59
tags: [pragmatic-programmer, concurrency, patterns]
draft: false
---

## 이 팁의 메시지

> **Tip 59: Use Blackboards to Coordinate Workflow.** Use blackboards to coordinate disparate facts and agents, while maintaining independence and isolation among participants.

블랙보드로 다양한 사실과 에이전트를 조율하라. 참여자들의 독립성과 격리를 유지하면서.

## 블랙보드 패턴

블랙보드는 공유 작업 공간이다. 여러 에이전트가 정보를 게시하고 읽는다.

```text
┌─────────────────────────────────────┐
│            블랙보드                  │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ 사실 A  │ │ 사실 B  │ │ 사실 C │ │
│  └─────────┘ └─────────┘ └────────┘ │
└─────────────────────────────────────┘
     ▲             ▲            ▲
     │             │            │
┌────┴───┐    ┌────┴───┐   ┌────┴───┐
│에이전트1│    │에이전트2│   │에이전트3│
└────────┘    └────────┘   └────────┘
```

에이전트들은 서로 직접 통신하지 않는다. 블랙보드만 본다.

## 예: 대출 심사

대출 심사에 여러 단계가 있다.

```python
class Blackboard:
    def __init__(self):
        self.facts = {}

    def post(self, key, value):
        self.facts[key] = value

    def read(self, key):
        return self.facts.get(key)

    def has(self, key):
        return key in self.facts

# 각 에이전트
class CreditCheckAgent:
    def run(self, blackboard):
        if blackboard.has("applicant") and not blackboard.has("credit_score"):
            applicant = blackboard.read("applicant")
            score = self.check_credit(applicant)
            blackboard.post("credit_score", score)

class IncomeVerificationAgent:
    def run(self, blackboard):
        if blackboard.has("applicant") and not blackboard.has("income_verified"):
            applicant = blackboard.read("applicant")
            verified = self.verify_income(applicant)
            blackboard.post("income_verified", verified)

class LoanDecisionAgent:
    def run(self, blackboard):
        if (blackboard.has("credit_score") and
            blackboard.has("income_verified") and
            not blackboard.has("decision")):

            score = blackboard.read("credit_score")
            income_ok = blackboard.read("income_verified")
            decision = score > 700 and income_ok
            blackboard.post("decision", decision)
```

각 에이전트는 필요한 정보가 있으면 작업하고 결과를 게시한다.

## 실행 루프

```python
def run_blackboard(blackboard, agents):
    while not blackboard.has("decision"):
        for agent in agents:
            agent.run(blackboard)

# 사용
blackboard = Blackboard()
blackboard.post("applicant", {"name": "홍길동", "ssn": "123-45-6789"})

agents = [
    CreditCheckAgent(),
    IncomeVerificationAgent(),
    LoanDecisionAgent()
]

run_blackboard(blackboard, agents)
print(blackboard.read("decision"))
```

## 블랙보드의 장점

| 장점 | 설명 |
|------|------|
| 느슨한 결합 | 에이전트들이 서로를 모른다 |
| 유연성 | 에이전트 추가/제거가 쉽다 |
| 점진적 처리 | 정보가 모이면 다음 단계가 진행된다 |
| 병렬화 | 독립적인 에이전트는 동시에 실행 가능 |

## 실전 사례

- **범죄 수사**: 여러 수사관이 단서를 게시하고 패턴을 찾는다
- **의료 진단**: 증상, 검사 결과, 병력을 종합해 진단한다
- **음성 인식**: 음소, 단어, 문법 분석기가 협력한다
- **빌드 시스템**: 각 작업이 결과를 게시하고 다음 작업이 읽는다

## 메시지 큐와의 차이

| 메시지 큐 | 블랙보드 |
|----------|---------|
| 점대점 통신 | 공유 공간 |
| 메시지 소비 후 삭제 | 정보 유지 |
| 순서 중심 | 사실 중심 |
| 파이프라인에 적합 | 협업 문제 해결에 적합 |

블랙보드는 정보가 쌓이고 유지된다. 여러 에이전트가 같은 정보를 볼 수 있다.

## 정리

- 블랙보드는 에이전트들이 정보를 공유하는 공간이다.
- 에이전트들은 서로 직접 통신하지 않는다.
- 필요한 정보가 있으면 작업하고 결과를 게시한다.
- 느슨한 결합으로 유연성이 높다.
- 복잡한 협업 문제 해결에 적합하다.

## 다음 장 예고

[Tip 60: Listen to Your Lizard Brain](/blog/programming/engineering/pragmatic-programmer/tip60)에서는 본능적인 불안감을 무시하지 말라는 조언을 다룬다.

## 관련 항목

- [Tip 58: Use Actors For Concurrency Without Shared State](/blog/programming/engineering/pragmatic-programmer/tip58)
- [Tip 55: Analyze Workflow to Improve Concurrency](/blog/programming/engineering/pragmatic-programmer/tip55)
