---
title: "Tip 57: Random Failures Are Often Concurrency Issues"
date: 2026-05-11T09:00:00
description: "무작위 실패는 종종 동시성 문제다. 재현이 어려운 버그는 타이밍을 의심한다."
series: "The Pragmatic Programmer"
seriesOrder: 57
tags: [pragmatic-programmer, concurrency, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 57: Random Failures Are Often Concurrency Issues.** Random failures are usually threading problems.

무작위 실패는 대개 스레딩 문제다.

## 증상

QA팀에서 버그를 보고한다.

- "10번에 한 번 정도 실패해요"
- "디버거를 붙이면 안 생겨요"
- "제 PC에서는 잘 되는데요"
- "오늘 아침에는 됐는데 지금은 안 돼요"

이런 증상이 나타나면 동시성 버그를 의심한다.

## 왜 무작위로 보이는가

동시성 버그는 타이밍에 따라 발생한다.

```python
# 스레드 A
data = load_data()
process(data)

# 스레드 B
data = None  # 초기화
```

스레드 A가 `load_data()` 후 `process(data)` 전에 스레드 B가 `data = None`을 실행하면 버그가 발생한다. 이 타이밍 창은 아주 짧다. 대부분은 문제없이 지나간다.

디버거를 붙이면 실행이 느려지고 타이밍이 바뀐다. 버그가 사라진다. 이것이 **하이젠버그(Heisenbug)**다. 관찰하면 사라진다.

## 재현 방법

타이밍 창을 넓혀 재현율을 높인다.

```python
# 의도적 지연 삽입
def load_data():
    result = actual_load()
    time.sleep(0.1)  # 버그 재현을 위한 지연
    return result
```

지연을 삽입하면 경쟁 조건이 더 자주 발생한다. 버그를 재현하고 수정할 수 있다.

## 탐지 도구

여러 도구가 동시성 버그를 탐지한다.

| 도구 | 언어 | 설명 |
|------|------|------|
| ThreadSanitizer | C/C++ | 데이터 레이스 탐지 |
| Helgrind | C/C++ | Valgrind 기반 레이스 탐지 |
| Race Detector | Go | `go run -race` |
| Concurrency Visualizer | Java | 스레드 상호작용 시각화 |

이 도구들은 실행 중 데이터 레이스를 탐지하고 보고한다.

## 예방

문제가 생긴 후 수정하기보다 처음부터 예방한다.

1. **공유 상태 최소화**: Tip 56에서 다룬 것처럼 공유를 피한다.
2. **불변 데이터 사용**: 변경하지 않으면 충돌이 없다.
3. **단일 소유권**: 한 스레드만 특정 데이터를 소유한다.
4. **스트레스 테스트**: 많은 스레드, 많은 부하로 테스트한다.

```python
# 스트레스 테스트
def test_concurrent_access():
    threads = []
    for _ in range(100):
        t = threading.Thread(target=do_something)
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    assert expected_result()
```

## 로깅 주의

디버깅을 위해 로그를 추가하면 타이밍이 바뀐다.

```python
def process():
    logging.debug("Starting process")  # 이 로그가 타이밍을 바꾼다
    # ...
```

로그를 추가했더니 버그가 사라지는 경우도 있다. 로그 자체가 동기화 역할을 해서 경쟁 조건을 숨긴다.

## 정리

- 무작위로 보이는 실패는 타이밍 문제일 가능성이 높다.
- 디버거를 붙이면 타이밍이 바뀌어 버그가 숨는다.
- 의도적 지연으로 재현율을 높인다.
- 전용 도구로 데이터 레이스를 탐지한다.
- 스트레스 테스트로 미리 발견한다.

## 다음 장 예고

[Tip 58: Use Actors For Concurrency Without Shared State](/blog/programming/engineering/pragmatic-programmer/tip58)에서는 액터 모델로 동시성을 다루는 방법을 설명한다.

## 관련 항목

- [Tip 56: Shared State Is Incorrect State](/blog/programming/engineering/pragmatic-programmer/tip56)
- [Tip 58: Use Actors For Concurrency Without Shared State](/blog/programming/engineering/pragmatic-programmer/tip58)
- [Tip 33: "select" Isn't Broken](/blog/programming/engineering/pragmatic-programmer/tip33)
