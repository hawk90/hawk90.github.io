---
title: "Dependency 공급망"
source_message: 50
source_role: assistant
---

# Dependency 공급망

## G-12. Dependency 역할 분류

모든 dependency를 다음으로 분류한다.

```text
runtime
build
content-tool
development
optional integration
```

### 감사표

| Package | 역할 | Browser 전달 | Install Script | 유지 상태 | 대체 가능 |
|---|---|---:|---:|---|---|
| Astro | build | 일부 | 확인 | 활발 | 낮음 |
| Shiki | build | 아니오 | 확인 | 활발 | 중간 |
| 특정 plugin | content-tool | 아니오 | 확인 | 불명 | 높음 |

### 완료 조건

- 용도를 모르는 dependency 없음
- 제거된 기능의 잔존 package 없음
- 동일 목적의 library 중복 확인
- browser runtime dependency와 build dependency를 구분

### 우선순위

```text
P0
```

---

## G-13. Install Script 감사

### 확인 대상

```text
preinstall
install
postinstall
prepare
```

설치 시 임의 코드가 실행될 수 있으므로 새 package 도입 시 lifecycle script를 확인한다.

### 작업

```bash
npm query ':attr(scripts, [postinstall])'
```

실제 package manager에 맞는 명령이나 lockfile 분석 도구를 사용한다.

### 정책

- 꼭 필요한 native build는 허용
- 이유를 모르는 postinstall은 검토
- 단순 도구인데 외부 binary 다운로드 시 경계 강화
- CI에서 불필요한 script를 비활성화할 수 있는지 검토

### 완료 조건

- Install script를 가진 direct dependency 목록 확보
- 외부 binary 다운로드 package 파악
- 불필요하거나 관리되지 않는 package 제거

### 우선순위

```text
P1
```

---

## G-14. Lockfile 변경 분리

Dependency 변경과 대량 콘텐츠 수정이 같은 PR에 섞이면 공급망 diff가 묻힌다.

### 원칙

```text
dependency update
platform migration
content bulk edit
```

을 가능한 한 별도 commit이나 PR로 나눈다.

### 완료 조건

- Lockfile 대량 변경이 콘텐츠 수정에 섞이지 않음
- 새 transitive dependency 수를 확인할 수 있음
- major update는 별도 검증 기록 존재

### 우선순위

```text
P1
```

---

## G-15. 취약점 알림 우선순위화

`npm audit` 숫자 0을 목표로 삼지 않는다.

### 분류

```text
브라우저에서 실행되는가
빌드 시 임의 코드를 실행하는가
개발 환경에만 있는가
실제 취약 경로가 도달 가능한가
업데이트로 회귀 위험이 큰가
```

### 결과 상태

```text
update
remove
mitigate
accept temporarily
not applicable
```

### 완료 조건

- Critical·High 경고의 실제 노출 경로 평가
- 단순 숫자 숨기기를 위해 무리한 major update를 하지 않음
- 수용한 위험에는 이유와 재검토 조건 존재

### 우선순위

```text
P1
```

---
