---
title: "Pull Request 보안"
source_message: 50
source_role: assistant
---

# Pull Request 보안

## G-10. 외부 PR과 배포 흐름 분리

현재 외부 기여를 받지 않더라도 workflow는 안전한 기본 구조로 두는 편이 좋다.

### PR validation

```text
읽기 권한
secret 없음
배포 없음
위험한 generator 제한
```

### Main 배포

```text
보호된 branch
검토된 commit
별도 deploy job
```

### 완료 조건

- Fork PR에서 secret이 전달되지 않음
- PR workflow가 production deploy를 실행하지 않음
- PR이 workflow나 package script를 바꿔도 write token에 접근하지 못함
- 승인되지 않은 artifact가 운영에 배포되지 않음

### 우선순위

```text
P1
```

---

## G-11. `pull_request_target` 제한

### 위험

`pull_request_target`은 대상 저장소 문맥에서 동작하므로 외부 PR 코드를 checkout하고 실행하면 위험할 수 있다.

### 허용 가능한 역할

```text
label 부여
PR metadata 검사
안전한 댓글 작성
```

### 금지할 역할

```text
PR branch checkout 후 npm install
PR의 build script 실행
외부 콘텐츠 generator 실행
secret을 사용하는 테스트
```

### 완료 조건

- 불필요한 `pull_request_target` 없음
- 사용한다면 PR 코드를 실행하지 않음
- 목적과 권한이 주석으로 설명됨

### 우선순위

```text
P1
```

---
