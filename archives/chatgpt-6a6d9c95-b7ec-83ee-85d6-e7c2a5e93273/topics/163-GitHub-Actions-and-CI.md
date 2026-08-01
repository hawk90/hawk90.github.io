---
title: "GitHub Actions and CI"
source_message: 29
source_role: assistant
---

# GitHub Actions and CI

## P-54. Cold Install Every Build

### 매번 dependency를 처음부터 설치

### 개선

package manager cache와 lockfile 기반 캐시를 사용한다.

---

## P-55. Cache Without Correct Key

### 캐시 key가 너무 넓거나 좁음

### 문제

- 잘못된 artifact 재사용
- 매번 cache miss
- dependency 변경 미반영

### 개선

lockfile, Node 버전, 주요 config hash를 key에 포함한다.

---

## P-56. Cache Generated Output Blindly

### content 변경을 고려하지 않고 build output 캐시

### 문제

오래된 페이지나 OG 이미지가 배포될 수 있다.

### 개선

입력 fingerprint를 명확히 한다.

---

## P-57. Duplicate Work Across Jobs

### build, test, deploy job가 각각 전체 콘텐츠 처리

### 개선

한 번 생성한 artifact를 후속 job에서 재사용한다.

---

## P-58. Matrix Build Without Value

### 여러 Node·OS 조합에서 전체 블로그 빌드

### 문제

범용 테마가 아니라 실제 개인 사이트라면 과도할 수 있다.

### 개선

실제 지원 환경만 테스트한다.

---

## P-59. Heavy Audit on Every Commit

### typo 수정에도 전체 중복 분석·신선도 검사

### 개선

변경 파일 기반 감사와 정기 전체 감사를 분리한다.

---

## P-60. No Changed-File Awareness

### 변경 범위를 전혀 활용하지 않음

### 개선

다음은 변경된 문서 중심으로 처리할 수 있다.

- OG 이미지
- 링크 검사
- 이미지 검사
- front matter validation
- 관련 글 후보

---

## P-61. Build Artifact Recompression

### 각 단계에서 같은 파일을 반복 압축·해제

### 개선

artifact 전달 방식을 단순화하고 압축 횟수를 줄인다.

---

## P-62. Deploy Before Smoke Test

### 생성된 정적 결과를 확인하지 않고 바로 배포

### 개선

최소한 다음을 검사한다.

- 홈 200
- 대표 글 200
- Sitemap 존재
- 검색 인덱스 파싱
- 주요 asset 존재
- 내부 링크 샘플

---

## P-63. No Preview Deployment

### 운영 배포 전 실제 결과 확인 불가

### 개선

큰 구조 변경에는 preview 환경이나 artifact 확인 단계를 둔다.

---

## P-64. CI Logs as Profiling

### 단순 시작·종료 시간만 보고 병목 추정

### 개선

빌드 내부 단계별 timing을 별도 출력한다.

---
