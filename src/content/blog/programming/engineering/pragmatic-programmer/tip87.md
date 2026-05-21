---
title: "Tip 87: Deliver When Users Need It"
date: 2026-05-12T15:00:00
description: "사용자가 필요할 때 전달하라. 완벽보다 시의적절한 전달이 가치 있다."
series: "The Pragmatic Programmer"
seriesOrder: 87
tags: [pragmatic-programmer, delivery, agile]
draft: false
---

## 이 팁의 메시지

> **Tip 87: Deliver When Users Need It.** The right time to deliver is when users need it, not when you're done.

전달할 적시는 사용자가 필요할 때이지, 당신이 끝냈을 때가 아니다.

## 너무 늦은 전달

완벽을 추구하면 너무 늦어진다.

```text
시나리오:
- 경쟁사가 비슷한 기능 출시
- 시장 기회가 지나감
- 사용자가 다른 솔루션 선택
- 비즈니스가 방향 전환
```

완벽한 기능을 6개월 뒤에 전달하는 것보다 충분한 기능을 지금 전달하는 게 낫다.

## 충분히 좋은 전달

```text
80%의 가치를 20%의 시간에:

완벽 버전 (100%): 6개월
├── 핵심 기능 (80%): 1개월  ← 먼저 전달
├── 편의 기능 (15%): 3개월
└── 엣지 케이스 (5%): 2개월
```

## 전달 주기

자주 전달하면 피드백도 자주 받는다.

| 전달 주기 | 피드백 속도 | 위험 |
|-----------|-------------|------|
| 6개월 | 느림 | 높음 (방향 틀리면 큰 손실) |
| 1개월 | 빠름 | 중간 |
| 1주일 | 매우 빠름 | 낮음 |
| 매일 | 즉각적 | 최소 |

## 지속적 전달

```text
지속적 전달 파이프라인:

코드 커밋
    ↓
자동 빌드
    ↓
자동 테스트
    ↓
스테이징 배포
    ↓
승인
    ↓
프로덕션 배포
```

언제든 전달할 수 있는 상태를 유지한다.

## 기능 플래그

미완성 기능도 배포할 수 있다.

```python
def show_new_feature(user):
    if feature_flags.is_enabled("new_checkout", user):
        return new_checkout_page()
    return old_checkout_page()
```

```text
기능 플래그 전략:
1. 기능 개발 (플래그 off)
2. 개발자만 on으로 테스트
3. 내부 사용자 대상 on
4. 일부 사용자 대상 on (A/B 테스트)
5. 전체 사용자 on
6. 플래그 제거
```

## MVP 사고방식

최소 기능 제품으로 먼저 검증한다.

```text
MVP 질문:
- 사용자가 가치를 느끼는 최소 기능은?
- 빼면 안 되는 것은?
- 나중에 추가해도 되는 것은?
```

## 점진적 확장

```text
1차 전달: 핵심 흐름 동작
2차 전달: 에러 처리 개선
3차 전달: 성능 최적화
4차 전달: 엣지 케이스 처리
5차 전달: 고급 기능
```

각 전달이 사용자에게 가치를 준다.

## 전달 가능 상태 유지

```text
항상 전달 가능하려면:
- 자동화된 테스트
- 지속적 통합
- 기능 플래그
- 점진적 롤아웃
- 롤백 가능한 배포
- 모니터링
```

## 사용자와 소통

```text
전달 전:
- 무엇이 가장 급한가?
- 언제까지 필요한가?
- 최소한 무엇이 있으면 되는가?

전달 후:
- 충분한가?
- 다음에 무엇이 필요한가?
- 문제는 없는가?
```

## 정리

- 완벽보다 시의적절한 전달이 가치 있다.
- 자주 전달하면 피드백도 빠르다.
- 80%의 가치를 20%의 시간에 전달한다.
- 기능 플래그로 미완성 기능도 배포한다.
- MVP로 먼저 검증하고 점진적으로 확장한다.
- 항상 전달 가능한 상태를 유지한다.

## 다음 장 예고

[Tip 88: Use Version Control to Drive Builds, Tests, and Releases](/blog/programming/engineering/pragmatic-programmer/tip88)에서는 버전 관리를 빌드, 테스트, 릴리스의 중심에 두는 방법을 다룬다.

## 관련 항목

- [Tip 76: Requirements Are Learned in a Feedback Loop](/blog/programming/engineering/pragmatic-programmer/tip76)
- [Tip 82: Agile Is Not a Noun; Agile Is How You Do Things](/blog/programming/engineering/pragmatic-programmer/tip82)
