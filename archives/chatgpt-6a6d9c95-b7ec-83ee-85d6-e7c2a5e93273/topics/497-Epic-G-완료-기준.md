---
title: "Epic G 완료 기준"
source_message: 50
source_role: assistant
---

# Epic G 완료 기준

## 공개 사이트

```text
순수 정적 읽기 사이트
관리자 route·코드 없음
외부 서비스 실패와 본문 분리
raw HTML·iframe 정책
XSS 위험 위치 정리
```

## CI

```text
workflow permissions 명시
build와 deploy 분리
action SHA 고정
secret 최소 전달
fork PR에서 secret 없음
```

## 공급망

```text
dependency 역할 목록
install script 감사
lockfile 변경 분리
취약점 위험 기반 대응
```

## 개인정보

```text
외부 integration inventory
Privacy Policy 일치
댓글·광고·분석 데이터 흐름 파악
검색 이벤트 최소화
```

## 콘텐츠

```text
secret scan
로그·스크린샷 redaction
민감 파일 artifact 검사
production source map 정책
```

---
