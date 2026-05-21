---
title: "Tip 60: Listen to Your Lizard Brain"
date: 2026-05-11T12:00:00
description: "도마뱀 뇌의 말을 들어라. 뭔가 잘못됐다는 본능적 불안감을 무시하지 않는다."
series: "The Pragmatic Programmer"
seriesOrder: 60
tags: [pragmatic-programmer, mindset, intuition]
draft: false
---

## 이 팁의 메시지

> **Tip 60: Listen to Your Lizard Brain.** It can tell you when something doesn't feel right.

도마뱀 뇌는 뭔가 잘못됐을 때 알려줄 수 있다.

## 도마뱀 뇌란

도마뱀 뇌는 뇌의 가장 오래된 부분이다. 본능, 직관, 무의식적 판단을 담당한다. 논리적 사고보다 빠르게 반응한다.

코딩할 때 이런 느낌을 받은 적 있는가?

- "이 코드가 왠지 불안해"
- "뭔가 빠뜨린 것 같은데"
- "이렇게 하면 안 될 것 같아"

이것이 도마뱀 뇌의 신호다. 논리로 설명하기 전에 직관이 경고를 보낸다.

## 무시하면 안 되는 이유

경험 많은 개발자의 직관은 수많은 패턴을 학습한 결과다. 이전에 비슷한 상황에서 문제를 겪었던 기억이 무의식에 저장되어 있다.

```python
def process_data(data):
    # 뭔가 불안하다...
    result = transform(data)
    save(result)
    return result
```

코드가 논리적으로 맞아 보이는데도 불안하다면, 그 느낌을 무시하지 않는다. 잠시 멈추고 생각한다.

## 불안감의 원인 찾기

직관이 경고할 때 원인을 파악하는 방법이 있다.

**1. 종이에 써본다**

"불안한 부분은 `process_data` 함수다. 왜? `transform`이 실패하면? `save`가 호출되지 않아야 하나, 아니면 부분 결과라도 저장해야 하나?" 이렇게 써보면 문제가 드러난다.

**2. 동료에게 설명한다**

러버덕 디버깅이다. 설명하다 보면 "아, 여기가 문제네"라고 깨닫는다.

**3. 산책한다**

책상을 떠나면 무의식이 일한다. 돌아오면 답이 보인다.

## 직관을 키우는 법

직관은 경험에서 온다. 더 많은 코드를 읽고 쓸수록 직관이 예리해진다.

| 활동 | 효과 |
|------|------|
| 코드 리뷰 | 다양한 패턴과 실수를 본다 |
| 오픈소스 읽기 | 좋은 코드와 나쁜 코드를 구분하게 된다 |
| 버그 수정 | 문제 패턴을 학습한다 |
| 사후 분석 | 실패에서 배운다 |

## 논리와 직관의 균형

직관만 믿으면 안 된다. 검증이 필요하다.

```python
# 직관: "이 코드가 불안해"
# 검증: 테스트를 작성해서 확인한다

def test_process_data_when_transform_fails():
    data = create_invalid_data()
    with pytest.raises(TransformError):
        process_data(data)
    # 저장되지 않았는지 확인
    assert not was_saved()
```

직관이 경고하면 테스트로 검증한다. 직관이 맞았으면 버그를 막은 것이고, 틀렸으면 안심하고 진행한다.

## 코딩 막힘

때로는 코드가 안 써진다. 키보드 앞에 앉아도 손이 안 움직인다. 이것도 도마뱀 뇌의 신호일 수 있다.

- **설계가 잘못됐다**: 무의식이 문제를 알고 있다
- **요구사항이 불명확하다**: 뭔가 빠졌다
- **너무 복잡하다**: 단순화가 필요하다

이럴 때는 억지로 코드를 쓰지 않는다. 한 발 물러서서 문제를 다시 본다.

## 정리

- 도마뱀 뇌는 본능적 불안감을 보낸다.
- 경험에서 쌓인 패턴 인식이 작동하는 것이다.
- 불안감을 무시하지 말고 원인을 찾는다.
- 써보고, 설명하고, 산책하면 답이 보인다.
- 직관과 논리를 균형 있게 사용한다.

## 다음 장 예고

[Tip 61: Don't Program by Coincidence](/blog/programming/engineering/pragmatic-programmer/tip61)에서는 우연에 의존하는 프로그래밍의 위험을 다룬다.

## 관련 항목

- [Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)
- [Tip 34: Don't Assume—Prove It](/blog/programming/engineering/pragmatic-programmer/tip34)
