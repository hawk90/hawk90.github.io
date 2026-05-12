# Book Recommendations — 2026-05-13

기존 `blog-content-roadmap.md` 보강용 추가 후보. 머지 여부 미정 — 별도 문서로 보관.

## 평가 기준

1. **빈 영역 채움** — 현재 시리즈 인벤토리에 직접 대응 없음
2. **사용자 프로필 적합도** — 임베디드 C++ / 펌웨어 / RTOS / 시스템
3. **시리즈화 적합도** — 챕터 분할 깨끗, 호흡 짧음 우선

기존 로드맵에 *없는* 책만 별표(★) 표시. 이미 참고서 목록엔 있어도 *전용 시리즈* 없으면 새로 추가 후보.

---

## 🔴 Bucket A — 빈 영역 (시리즈 0건)

### A1. ★ Operating Systems: Three Easy Pieces (OSTEP)
- **저자**: Remzi & Andrea Arpaci-Dusseau (Wisconsin)
- **분량**: 50+ 챕터, **무료 PDF**
- **3 부**: Virtualization (CPU/Memory) · Concurrency · Persistence
- **왜 추가**: OS 시리즈 0건. `rtos-internals`/`performance-engineering`의 *기초 토대*
- **차별점**: 챕터 짧음 (15~20p), 입문~중급 균형, 한국어 번역 부재 → 한국어 정리 가치 큼
- **시리즈 후보 구조**: 부 3 × 챕터 평균 15 = 45 글

### A2. Computer Systems: A Programmer's Perspective (CSAPP)
- **저자**: Bryant & O'Hallaron (CMU)
- **분량**: 12장, ~1,000p
- **위상**: 시스템 콜·메모리 모델·캐시·링킹·동시성의 정전급 학부 교재
- **로드맵 현황**: 참고서 목록에도 없음
- **차별점 vs OSTEP**: 프로그래머 관점 (vs OSTEP은 OS 관점). 어셈블리·캐시·링킹 깊이 ↑
- **시리즈 후보 구조**: 12장 + ch-별 핵심 개념 = ~20-25 글

### A3. ★ Making Embedded Systems (Elecia White, 2판 2024)
- **저자**: Elecia White
- **분량**: 18장, ~360p
- **위상**: 임베디드 펌웨어 입문서 1위
- **로드맵 현황**: 참고서 목록엔 있지만 *전용 시리즈 없음*
- **차별점**: `embedded-cpp`(언어), `modern-recipes`(레시피) 사이의 *방법론*
- **시리즈 후보 구조**: 18장 = 18 글

### A4. ★ A Philosophy of Software Design (Ousterhout, 2판 2021)
- **저자**: John Ousterhout (Stanford / Tcl 창시자)
- **분량**: 21장, ~190p
- **위상**: 신규 클래식, "복잡성 다스리기"
- **로드맵 현황**: 어디에도 없음
- **차별점**: `Code Complete`(거대 백과)·`Pragmatic`(태도)와 다른 *복잡성 한 가지 축*에 집중
- **시리즈 후보 구조**: 21장 = 21 글 (짧고 임팩트 큼 — 빠른 완결 가능)

### A5. Designing Data-Intensive Applications (DDIA — Kleppmann)
- **저자**: Martin Kleppmann
- **분량**: 12장 (3부), ~600p
- **위상**: 분산/데이터 신규 클래식
- **로드맵 현황**: "Distributed Systems Engineering" 시리즈 후보에 일부 흡수 가능하지만, *DDIA 전용 시리즈*가 더 깔끔
- **차별점**: 분산이라는 거대 주제를 가장 잘 정리한 단일 텍스트
- **시리즈 후보 구조**: 12장 = 12 글

---

## 🟡 Bucket B — 기존 시리즈 보강 (짝 책)

### B1. ★ Test-Driven Development for Embedded C (Grenning)
- **저자**: James W. Grenning
- **위상**: 임베디드 TDD의 정전. `tdd-by-example`(Beck)과 짝
- **로드맵 현황**: 없음
- **차별점**: Beck의 Java TDD를 임베디드 C 환경(target/host split, CppUTest)으로 가져옴
- **시너지**: `tdd-by-example` + `embedded-cpp` + `modern-recipes` 교차점
- **시리즈 후보**: 20+ 챕터 → 15~20 글

### B2. Systems Performance (Gregg, 2판 2020)
- **저자**: Brendan Gregg (Netflix → Intel)
- **위상**: Linux 성능 종합 카탈로그
- **로드맵 현황**: `performance-engineering` 후보 시리즈 있지만, 책 출처가 분산. Gregg를 *기둥*으로 삼는 게 정석
- **차별점**: 도구 사용법 + 메서드론(USE method 등)
- **시리즈 후보**: 16장 → 16 글 또는 영역별 그룹화 8 글

### B3. The Art of Multiprocessor Programming (Herlihy & Shavit, 2판)
- **위상**: lock-free·메모리 모델 정석
- **로드맵 현황**: 이미 `parallel-principles` 참고서 ★★
- **추가 의미**: 참고가 아닌 *전용 시리즈*로 격상 가치
- **시너지**: `cpp-concurrency-in-action` 한 단계 위

### B4. ★ C++ Templates: The Complete Guide (Vandevoorde et al, 2판)
- **위상**: 템플릿 바이블
- **로드맵 현황**: 없음
- **차별점**: 우리가 EC++/EMC++에서 다룬 SFINAE·변환 생성자·variadic의 *정석 레퍼런스*
- **시너지**: EC++ 41-48, EMC++ 1-9, Beautiful C++ 23-24와 즉시 연결
- **시리즈 후보**: 25+ 장 → 큰 시리즈 (장기)

---

## 🟢 Bucket C — C++ 깊이 (선택)

### C1. ★ Hands-On Design Patterns with C++ (Pikus, 2판)
- **차별점**: GoF의 모던 C++ 짝. CRTP·Type Erasure·Policy 등 *C++ 특유* 패턴
- **시너지**: `gof-design-patterns` 다음 자연스러운 다음

### C2. ★ A Tour of C++ (Stroustrup, 3판 C++20)
- **분량**: 짧음 (~250p), 14장
- **위상**: 창시자의 핸드북
- **시너지**: EMC++/EC++ 정리 후 회고용 *최소 핵심*

### C3. ★ Functional Programming in C++ (Čukić)
- **차별점**: 람다·`std::function`·monad 모던 연결

---

## ⚪ Bucket D — 옵션 (후순위)

| 책 | 위상 |
| --- | --- |
| ★ Linkers & Loaders (Levine) | 임베디드 빌드/링커 스크립트 이해 |
| ★ TCP/IP Illustrated Vol. 1 (Stevens) | IoT/네트워크 펌웨어 |
| ★ Staff Engineer (Larson) | 시니어 커리어 트랙 |
| ★ Why Programs Fail (Zeller) | 체계적 디버깅 |

---

## Top-5 압축 추천

만약 *5권만* 고르라면 — 가장 큰 ROI 순:

1. **OSTEP** — 빈 영역 + 무료 + 챕터 짧아 시리즈화 즉시 가능
2. **Making Embedded Systems (White)** — 사용자 프로필 정중앙, 참고서엔 있지만 전용 시리즈 없음
3. **A Philosophy of Software Design (Ousterhout)** — 짧고(190p) 임팩트 큼, 빠른 완결
4. **DDIA (Kleppmann)** — 분산 영역 보강, "IoT 백엔드 가는 길"
5. **CSAPP** — 두꺼우나 한 챕터씩 끊으면 ROI 최고

---

## 기존 로드맵과 비교 — 중복 / 신규 정리

### 기존 로드맵에 *없는* 신규 후보 (이 문서의 가치)

- **OSTEP** — 신규
- **CSAPP** — 신규 (참고서 목록에도 없음)
- **A Philosophy of Software Design (Ousterhout)** — 신규
- **DDIA (Kleppmann)** — 신규 (Distributed Systems 시리즈 후보가 있지만 DDIA 자체는 명시 안 됨)
- **Test-Driven Development for Embedded C (Grenning)** — 신규
- **Making Embedded Systems (White)** — 참고서엔 있지만 전용 시리즈 없음
- **C++ Templates: Complete Guide (Vandevoorde)** — 신규
- **Hands-On Design Patterns with C++ (Pikus)** — 신규
- **Functional Programming in C++ (Čukić)** — 신규
- **Linkers & Loaders (Levine)** — 신규
- **Staff Engineer (Larson)** — 신규
- **Why Programs Fail (Zeller)** — 신규

### 기존 로드맵에 이미 있는 (참고만)

- The Art of Multiprocessor Programming — `parallel-principles` 참고서 ★★
- Systems Performance — `performance-engineering` 후보 (Gregg 명시 안 됨)
- C++ Concurrency in Action — 시리즈로 존재
- Refactoring (Fowler) — Phase 추가에 있음
- Code (Petzold) — Phase 추가에 있음
- Linux Kernel — Phase 추가에 있음
- 비판적 사고를 위한 논리 — Phase 추가에 있음
- 전문가를 위한 C / C++ — Phase 추가에 있음

---

## 결정 시 메모

- 머지하려면: 이 문서의 Bucket A-1·A-3·A-4 (OSTEP / Making Embedded Systems / A Philosophy of Software Design)만 기존 `blog-content-roadmap.md`의 "Phase 추가"에 합쳐도 충분
- 나머지(B/C/D)는 후순위 — 별도 보관
- 본 문서는 정기 갱신 X (스냅샷). 다음 추천 라운드 때 새 파일로

*작성: 2026-05-13*
