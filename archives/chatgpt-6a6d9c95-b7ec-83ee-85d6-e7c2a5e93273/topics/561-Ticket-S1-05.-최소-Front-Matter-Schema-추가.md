---
title: "Ticket S1-05. 최소 Front Matter Schema 추가"
source_message: 53
source_role: assistant
---

# Ticket S1-05. 최소 Front Matter Schema 추가

## 목적

대표 문서부터 구조화된 정보를 적용한다.

## 권장 필드

```yaml
type: concept
topic: pcie-cxl
status: current
updated: 2026-08-01
```

실제 재검증을 했다면:

```yaml
lastVerified: 2026-08-01
```

환경이 중요하다면:

```yaml
testedWith:
  os: CentOS 7.9
  kernel: 3.10.0-1160
  hardware: AMD Alveo U250
  xrt: 2.13.466
```

## 필수 적용 범위

초기에는 다음에만 강제한다.

```text
홈 Featured 문서
Topic Hub Start Here 문서
대표 문서 20개
```

나머지 기존 글에는 즉시 강제하지 않는다.

## 중요한 규칙

```text
updated
문서 내용이 수정된 날짜

lastVerified
기술 내용을 실제로 다시 확인한 날짜
```

둘을 자동으로 같이 변경하지 않는다.

## 완료 조건

```text
[ ] type/topic/status schema 존재
[ ] 날짜는 ISO 형식
[ ] lastVerified는 선택 필드
[ ] 대표 문서에서만 우선 강제
[ ] 기존 콘텐츠 build 호환성 유지
```

## 예상 작업량

```text
2~4시간
```

---
