---
title: "Tip 48: If It's Important Enough to Be Global, Wrap It in an API"
date: 2026-05-11T00:00:00
description: "전역으로 둘 만큼 중요하면 API로 감싸라. 직접 접근 대신 메서드를 통해 접근한다."
series: "The Pragmatic Programmer"
seriesOrder: 48
tags: [pragmatic-programmer, design]
draft: false
---

## 이 팁의 메시지

> **Tip 48: If It's Important Enough to Be Global, Wrap It in an API.** Only let your code access the global through the API.

전역 데이터는 API를 통해서만 접근하게 하라.

## Tip 47의 연장선

[Tip 47](/blog/programming/engineering/pragmatic-programmer/tip47)은 "전역을 피하라"고 했다. 그러나 로깅, 설정, 메트릭 같은 것은 전역이 불가피한 경우가 있다. 이때 최소한 직접 접근하지 말고 API로 감싼다.

## 직접 접근 vs API

```python
# 나쁜 패턴: 직접 접근
db_host = config["database"]["host"]

# 좋은 패턴: API 통해 접근
db_host = config.get_database_host()
```

API를 쓰면 내부 구조가 바뀌어도 호출자에 영향이 없다. `config`가 딕셔너리인지, 객체인지, 파일에서 읽는지 호출자는 모른다.

## 로깅 예

```python
# 전역 로거를 API로
logger.info("User logged in", user_id=123)

# 내부는 전역이지만 호출자는 API만 본다
```

호출자는 `logger.info()`를 호출할 뿐이다. 로거의 내부 구현(파일 출력, 네트워크 전송, 레벨 필터 등)은 숨겨져 있다.

## API 래핑의 이점

| 이점 | 설명 |
|------|------|
| 변경 격리 | 내부 구조가 바뀌어도 API만 유지하면 된다 |
| 접근 제어 | 읽기 전용, 로깅, 검증을 한 자리에서 처리한다 |
| 테스트 | API를 모킹해서 테스트한다 |
| 추가 로직 | 지연 로딩, 캐싱 등을 투명하게 추가한다 |

## 적용 기준

전역을 직접 쓰는 곳이 보이면 다음을 물어본다.

1. 이 전역을 함수 인자로 바꿀 수 있는가? → 그렇게 한다.
2. 불가능하다면 API로 감쌀 수 있는가? → 그렇게 한다.
3. 둘 다 안 된다면 → 아주 신중하게 직접 쓴다.

대부분 1번이나 2번으로 해결된다.

## 정리

- 전역이 정말 필요하면 API로 감싼다.
- 직접 접근은 내부 구조에 의존하게 만든다.
- API는 변경 격리, 접근 제어, 테스트를 가능하게 한다.
- 전역 직접 사용은 최후의 수단이다.

## 다음 장 예고

[Tip 49: Programming Is About Code, But Programs Are About Data](/blog/programming/engineering/pragmatic-programmer/tip49)에서는 데이터 중심 사고를 다룬다. 코드는 도구이고, 프로그램의 본질은 데이터다.

## 관련 항목

- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
- [Tip 49: Programming Is About Code, But Programs Are About Data](/blog/programming/engineering/pragmatic-programmer/tip49)
