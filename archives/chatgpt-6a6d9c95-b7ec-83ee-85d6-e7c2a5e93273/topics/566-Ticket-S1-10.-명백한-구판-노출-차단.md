---
title: "Ticket S1-10. 명백한 구판 노출 차단"
source_message: 53
source_role: assistant
---

# Ticket S1-10. 명백한 구판 노출 차단

## 목적

전체 구판 정리를 기다리지 않고 눈에 띄는 잘못된 노출부터 막는다.

## 먼저 찾을 것

```text
오래된 CUDA·Linux·프레임워크 버전
이미 대체 글이 있는 글
깨진 명령이나 설정을 포함한 글
홈·검색에서 상위에 노출되는 과거 메모
```

## 처리

### 과거 환경 자체가 가치 있음

```yaml
status: historical
```

### 재검토가 필요함

```yaml
status: needs-review
```

### 신판이 존재함

```yaml
status: superseded
supersededBy: new-document-id
```

## 1차 노출 정책

```text
Featured 제외
Topic Start Here 제외
관련 글 추천 제외
일반 검색 ranking 감점
```

## 완료 조건

```text
[ ] 명백한 구판 최소 10개 확인
[ ] 상태 지정
[ ] Featured·Start Here 노출 차단
[ ] 신판이 있으면 직접 링크
```

## 예상 작업량

```text
2~4시간
```

---
