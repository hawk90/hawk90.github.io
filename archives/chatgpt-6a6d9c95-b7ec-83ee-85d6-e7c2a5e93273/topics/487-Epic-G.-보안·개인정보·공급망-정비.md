---
title: "Epic G. 보안·개인정보·공급망 정비"
source_message: 50
source_role: assistant
---

# Epic G. 보안·개인정보·공급망 정비

## G-01. 공개 사이트와 관리자 기능 경계 확정

### 문제

블로그 저장소 안에 관리자 편집기, GitHub OAuth, 저장소 쓰기 기능까지 함께 들어가면 정적 사이트의 단순한 신뢰 경계가 무너진다.

### 권장 구조

```text
Public site
- 정적 HTML·CSS·JS
- 공개 콘텐츠 읽기
- 검색
- 댓글·광고는 선택적 외부 기능

Admin tool
- 인증
- 콘텐츠 편집
- GitHub API 쓰기
- 별도 배포 또는 로컬 전용
```

### 우선 선택안

개인 블로그라면 관리자 편집기의 기본 경로는 다음이 가장 안전하다.

```text
로컬 Git 편집
→ commit
→ pull request 또는 main push
→ CI 검증
→ 정적 배포
```

브라우저 기반 관리 기능이 반드시 필요하지 않다면 제거하거나 별도 프로젝트로 분리한다.

### 완료 조건

- 운영 정적 번들에 OAuth secret이 없음
- 공개 사이트가 저장소 쓰기 권한을 요구하지 않음
- `/admin` 주소를 숨기는 방식에 의존하지 않음
- 관리자 기능의 유지 또는 제거 이유가 문서화됨

### 우선순위

```text
P0
```

---

## G-02. Production 빌드에서 관리자 코드 제거

### 문제

메뉴에서 링크만 숨겨도 route, JavaScript, API 설정이 최종 `dist`에 남을 수 있다.

### 작업

Production artifact에서 다음을 검사한다.

```text
/admin
OAuth client 설정
GitHub write API 호출
편집기 컴포넌트
저장소 선택 UI
token 저장 코드
```

### 구현 원칙

나쁜 방식:

```ts
if (isAdmin) {
  showAdminMenu();
}
```

운영 번들에는 관리자 코드가 그대로 포함된다.

더 나은 방식:

```text
별도 앱
또는
production build에서 route·module 자체 제외
```

### 자동 검사

```bash
grep -R "/admin" dist/
grep -R "client_secret" dist/
grep -R "localStorage.*token" dist/
```

문자열 검색만으로 충분하지 않으므로 route manifest와 JavaScript bundle도 함께 확인한다.

### 완료 조건

- Production route에 관리자 페이지 없음
- 관리자 전용 module이 client bundle에 없음
- 관리자 환경변수가 공개 JavaScript에 포함되지 않음
- 관리자 기능 없이 일반 사이트 build가 가능

### 우선순위

```text
P0
```

---
