---
title: "도메인과 HTTPS"
source_message: 50
source_role: assistant
---

# 도메인과 HTTPS

## G-30. HTTPS·Canonical·Domain 점검

### 검사

```text
HTTP → HTTPS 전환
www/apex 일관성
GitHub Pages custom domain
canonical production origin
Sitemap origin
OG URL
```

### 완료 조건

- 모든 내부 absolute URL이 HTTPS
- HTTP 접근은 HTTPS로 이동
- 한 개의 production origin 사용
- 인증서 오류 없음
- preview URL이 canonical이나 Sitemap에 들어가지 않음

### 우선순위

```text
P0
```

---

## G-31. Domain Takeover 방지 운영

Custom domain을 변경하거나 사이트를 이전할 때 DNS와 Pages 설정을 함께 관리한다.

### 문서화

```text
도메인 등록자
DNS provider
GitHub Pages 연결 방식
검증 상태
만료일
이전·삭제 절차
```

### 완료 조건

- 사용하지 않는 DNS record 없음
- GitHub Pages domain verification 확인
- 저장소 이동·삭제 시 DNS 정리 절차 존재
- 도메인 자동 갱신과 복구 연락 경로 확인

### 우선순위

```text
P1
```

---
