---
title: "Dependencies"
source_message: 33
source_role: assistant
---

# Dependencies

## M-41. Dependency Archaeology

### 왜 설치했는지 모르는 패키지

### 문제

삭제하기 무서워 계속 남는다.

### 개선

각 주요 dependency의 목적을 기록한다.

---

## M-42. Feature Removed, Dependency Retained

### MDX나 편집 기능은 제거했지만 패키지는 남음

### 문제

설치·보안·업데이트 비용이 지속된다.

### 개선

기능 제거 checklist에 dependency, config, docs, tests 제거를 포함한다.

---

## M-43. Production and Tooling Dependencies Mixed

### editor-only·build-only 패키지가 모두 같은 범주

### 문제

의존성 역할을 파악하기 어렵다.

### 개선

runtime, build, editor, content-tools 역할을 분리한다.

---

## M-44. Dependency for a Trivial Function

### 작은 slug 처리나 날짜 포맷 때문에 큰 패키지 설치

### 문제

업데이트와 공급망 표면이 커진다.

### 개선

패키지 도입 전 실제 절감되는 복잡성을 비교한다.

---

## M-45. Multiple Libraries for the Same Job

### Markdown parser나 날짜 라이브러리가 여러 개

### 문제

동작 차이와 번들·설치 비용이 증가한다.

### 개선

용도를 통합하거나 사용 범위를 명확히 분리한다.

---

## M-46. Unbounded Plugin Stack

### remark·rehype plugin이 계속 증가

### 문제

호환성·실행 순서·업그레이드 위험이 커진다.

### 개선

플러그인마다 필요성, 입력, 출력, 순서 의존성을 문서화한다.

---

## M-47. Major Upgrade by Habit

### 기능상 필요 없이 최신 major로 즉시 이동

### 문제

콘텐츠 개선보다 migration 비용이 커진다.

### 개선

보안·지원 종료·명확한 이점이 있을 때 업그레이드한다.

---

## M-48. Frozen Dependencies Forever

### 반대로 업데이트를 무기한 미룸

### 문제

나중에 한 번에 큰 migration이 필요해진다.

### 개선

정기적인 작은 업데이트와 major 업그레이드를 분리한다.

---

## M-49. Lockfile Without Reproducibility

### lockfile은 있지만 시스템 dependency가 고정되지 않음

### 개선

Node 외에 Python, LaTeX, font, image tools까지 포함한 환경 정의가 필요하다.

---

## M-50. Vulnerability Scanner as Upgrade Bot

### 취약점 경고가 나오면 맥락 없이 모두 업데이트

### 문제

실제 사용하지 않는 경로의 경고 때문에 안정성을 해칠 수 있다.

### 개선

노출 여부와 실행 경로를 평가하고 제거·업데이트·완화 중 선택한다.

---
