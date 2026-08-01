---
title: "Secret과 환경변수"
source_message: 50
source_role: assistant
---

# Secret과 환경변수

## G-07. Secret Inventory 작성

### 목록 형식

| Secret | 용도 | 사용 Workflow | 권한 | 만료·회전 | 공개 가능 여부 |
|---|---|---|---|---|---|
| Pages token | 자동 제공 | deploy | 최소 | 자동 | 비공개 |
| OAuth secret | 관리자 기능 | 분리 대상 | 저장소 제한 | 회전 | 절대 비공개 |
| Analytics ID | 브라우저 설정 | site | 없음 | 해당 없음 | 공개 식별자 |

### 중요한 구분

브라우저에 포함되는 값은 비밀로 취급할 수 없다.

예:

```text
Google Analytics measurement ID
AdSense publisher ID
Giscus repository mapping
```

이들은 공개 식별자다.

반면 다음은 절대 client bundle에 들어가면 안 된다.

```text
OAuth client secret
Personal Access Token
GitHub App private key
배포용 장기 token
```

### 완료 조건

- 저장소에서 사용하는 모든 secret 목록 존재
- 각 secret의 최소 권한과 사용 step 확인
- 공개 식별자와 secret이 구분됨
- 사용되지 않는 secret 삭제

### 우선순위

```text
P0
```

---

## G-08. Secret 전달 범위 축소

### 나쁜 방식

```yaml
env:
  TOKEN: ${{ secrets.SOME_TOKEN }}
```

workflow 전체가 접근한다.

### 권장

```yaml
- name: Perform required operation
  env:
    TOKEN: ${{ secrets.SOME_TOKEN }}
  run: ./scripts/required-operation.sh
```

필요한 한 step에만 전달한다.

### 추가 원칙

- secret을 command-line argument에 직접 넣지 않음
- `env`, `printenv`, `set -x` 금지
- secret이 포함된 파일을 artifact로 업로드하지 않음
- build output에 환경변수 덤프를 포함하지 않음

### 완료 조건

- Secret이 job 전체에 설정되지 않음
- 사용하지 않는 step은 secret 접근 불가
- debug logging에서 환경 전체 출력 없음
- artifact 내부 secret scan 통과

### 우선순위

```text
P0
```

---

## G-09. 노출된 Secret 대응 절차

### 원칙

Git에서 문자열을 삭제하는 것만으로 해결되지 않는다.

노출 시 순서:

```text
1. Secret 폐기
2. 새 credential 발급
3. 권한 축소
4. 사용 위치 교체
5. 로그·artifact·history 범위 조사
6. 필요하면 history 정리
7. 원인과 재발 방지 기록
```

### 피해야 할 것

```text
앞 네 글자만 남기고 마스킹
파일 삭제 후 같은 token 계속 사용
Private repo였다는 이유로 무시
```

### 완료 조건

- Incident runbook에 secret 노출 절차 존재
- credential 회전 위치를 찾을 수 있음
- 실제 token 대신 명백한 placeholder를 문서에 사용

### 우선순위

```text
P1
```

---
