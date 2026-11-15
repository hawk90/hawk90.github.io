# 공개 글 독립 재평가 — 루프 41

평가일 2026-10-18. 원문 기준 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2와 AP-C-24를 적용했다. 대상 Sanitizers 마지막 글 1편과 Valgrind 5편의 원문 전문을 읽고, 기존 보고서의 주장·점수 근거를 다시 대조했다. 현재 수정된 Recipes를 옛 앵커 점수에 대입하지 않고 `10550ca1` 시점의 앵커 문서·원문 근거와 비교했다. 원문·기존 보고서·사용자 미커밋 작업은 변경하지 않았다.

전편 `score_status: 잠정`, `confidence: 중간`, `factcheck: 오류 확인`이다. 일부 오류를 확인했을 뿐 모든 API·환경을 검증한 것은 아니다. P0는 본문 검토 범위에서 확인되지 않았다. 렌더·광고·빌드의 공통 검사는 [공통 게이트](double-check-gates-2026-10-18.md)에 분리한다. 웹 자료는 2026-10-18에 실제 열람했다. 현재 매뉴얼과 대조한 결과를 과거 모든 버전에 소급하지 않는다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `sanitizers/chapter05-cmake-ci.md` | 14 | 12 | 8 | 11 | 7 | 7 | 2 | 61 | 오류 확인 | 우선 조치 |
| `valgrind/chapter01-intro.md` | 10 | 12 | 7 | 10 | 7 | 7 | 2 | 55 | 오류 확인 | 우선 조치 |
| `valgrind/chapter02-memcheck.md` | 11 | 11 | 7 | 10 | 6 | 7 | 2 | 54 | 오류 확인 | 우선 조치 |
| `valgrind/chapter03-leak-report.md` | 12 | 12 | 6 | 10 | 7 | 7 | 2 | 56 | 오류 확인 | 우선 조치 |
| `valgrind/chapter04-helgrind-drd.md` | 11 | 12 | 6 | 10 | 7 | 7 | 2 | 55 | 오류 확인 | 우선 조치 |
| `valgrind/chapter05-suppressions.md` | 15 | 13 | 8 | 11 | 8 | 7 | 3 | 65 | 오류 확인 | 우선 조치 |

| 파일 | 이전 총점 | 새 총점 | 차이 | 이전 판정 | 새 판정 |
| --- | ---: | ---: | ---: | --- | --- |
| `sanitizers/chapter05-cmake-ci.md` | 61 | 61 | 0 | 우선 조치 | 우선 조치 |
| `valgrind/chapter01-intro.md` | 54 | 55 | +1 | 우선 조치 | 우선 조치 |
| `valgrind/chapter02-memcheck.md` | 54 | 54 | 0 | 우선 조치 | 우선 조치 |
| `valgrind/chapter03-leak-report.md` | 57 | 56 | -1 | 우선 조치 | 우선 조치 |
| `valgrind/chapter04-helgrind-drd.md` | 55 | 55 | 0 | 우선 조치 | 우선 조치 |
| `valgrind/chapter05-suppressions.md` | 65 | 65 | 0 | 우선 조치 | 우선 조치 |

기존·새 합계는 모두 346, 평균 57.67이다. 판정은 6/6 일치하지만 ch02의 오류 근거는 교체했다. 점수를 유지한 4편도 원문과 근거를 다시 읽었다. B의 두 1점 차이는 명시 상한 위반의 교정이 아니라 아래 근거에 따른 판단 차이다.

## 정확성 게이트 재검토

- Sanitizers ch05 L19의 `ENABLE_SANITIZERS`는 L32~56의 `ENABLE_ASAN`·`ENABLE_TSAN`과 다르다. 첫 CMake 블록을 그대로 추출하고 `project(ScoreAudit NONE)` 및 관찰용 `get_directory_property`만 추가하여 실행했다. `-DENABLE_SANITIZERS=ON`은 exit 0이나 compile options가 비고 미사용 변수 경고가 났다. `-DENABLE_ASAN=ON`에서는 sanitizer flags가 생겼다. 임시 검증 디렉터리 `/private/tmp/adsense-cmake-option-ZKw73Z`; 실행 결과를 글에 실측 경험으로 추가하지 않았다. preset schema 6은 [CMake 3.25 매뉴얼의 version 표](https://cmake.org/cmake/help/v3.25/manual/cmake-presets.7.html#format)에서 3.25 도입으로 확인했다.
- Valgrind ch01 L50은 MSan이 미초기화를 탐지한다고 하고 L132는 Sanitizer가 못 잡는다고 한다. 동일 글의 도구 분류끼리 충돌하므로 기존 오류 확인을 유지한다. L165와 L228의 두 버전은 서로 다른 예시로 양립 가능하여 독립 사실 오류로 세지 않는다.
- Valgrind ch02의 기존 'read 절에 write 예시'는 제목 이행·설명 정합성 문제다. `0 bytes after`도 접근 주소의 경계로부터 거리와 접근 폭을 구분해야 하므로 오버런 자체가 없다는 뜻으로 읽어 내부 모순을 확정하지 않는다. 대신 L49의 no 기본값과 L51의 yes=summary를 [Memcheck §4.3](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options)과 직접 대조했다. 현재 문서는 기본값 summary, yes는 full과 같은 상세 검색이다. 기존 오류 확인은 유지하되 근거를 공식 옵션 계약으로 교체한다.
- Valgrind ch03 L295의 med 기본값 및 L335의 show-reachable 등가는 같은 [Memcheck §4.3](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options)과 다르다. 기본 leak-resolution은 high이고 show-reachable=yes는 all과 동치다. 기존 판정에 동의한다. 다중 상속·STL이라는 이유만으로 possibly lost를 일괄 무시하는 L147·240·407 지침도 조건을 빠뜨리므로 B13→12로 보수적으로 조정한다. 개별 누수가 진짜인지까지 이 검토로 확정하지 않는다.
- Valgrind ch04 L256의 shared-threshold는 스레드 수가 아니다. [DRD §8.2.1](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.drd-options)은 reader lock 보유 시간의 ms 임계값으로 정의한다. L257의 exclusive-threshold 시간 설명은 대체로 맞으므로 이 행 전체가 틀렸다고 확대하지 않는다. 기존 오류 확인을 유지한다.
- Valgrind ch05 L104의 호출 방향·L130~132의 malloc 첫 프레임 고정·L136의 '어느 자리에 있든'을 [Valgrind core §2.5](https://valgrind.org/docs/manual/manual-core.html#manual-core.suppress) 예시와 대조했다. 바깥 호출자와 임의 선행 프레임을 혼동한 설명이라 기존 판정을 유지한다. '위'라는 일상어만으로 확정하지 않는다. 추가로 L88의 Leak만 추가 줄을 받는다는 주장은 [Memcheck §4.4](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.suppfiles)의 Param 필수 정보 줄과 맞지 않는다.

## 글별 근거

아래 축약 경로의 기준은 `src/content/blog/tools/`다. 모든 글에서 내부 `/blog/` 링크를 slug→실제 파일로 해석해 제목·공개 여부·순서를 확인했다. 이 루프의 내부 링크에는 없는 대상이나 draft 목적지가 없었다. 외부 참고자료의 잘못된 자원 유형은 G에서 기록하며, 내부 탐색 링크 전체가 틀렸다고 확대하지 않았다. 각 A~G 행이 `evidence`다. 점수는 원문 관찰에 근거한 평가자의 판단이며 절대적인 정답이나 승인 확률이 아니다.

### sanitizers/chapter05-cmake-ci.md

source_file: `src/content/blog/tools/debugging/sanitizers/chapter05-cmake-ci.md`

- url: `/blog/tools/debugging/sanitizers/chapter05-cmake-ci`
- score_status: 잠정; score: 61; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L19의 활성화 옵션이 실제 CMake 블록과 다름. P0 미발견.
- uncertainties: GitLab 이미지의 실제 컴파일러 설치 상태, macOS gcc 경로, L428 exit 디버깅 일반화, L472 LSan 환경 차이는 미검증. L303·454·491·499의 배율·시간은 실행 기록 없음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | L81~141 타겟별 함수와 충돌 차단, L409~428 실패 분해는 단순 빌드 앵커보다 구체적이다. 실제 실패 사례·선택 데이터는 없어 LLM 앵커18 미달. 기존 동의. |
| B | 12 | L26~216 빌드→L222~401 두 CI·매트릭스→L407~506 진단·운영의 흐름은 완성. 첫 옵션 오류와 스키마 요구 버전 누락이 남고 정확성 의문으로 B≤13. 기존 동의. |
| C | 8 | L30~68 CMake·L151~216 preset·L226~318 job을 따라갈 수 있으나 실행 CI 로그는 없다. L303·454·491·499의 무출처 배율·시간으로 C≤8. 기존 동의. |
| D | 11 | 이 글 L151~208↔`build/cmake/chapter04-options.md` L425~441·`chapter09-modern-advanced.md` L265~302는 preset 틀을 공유. L309~318↔sanitizers ch04 L389~397 반복 stress. L441~450↔ch02 L137~169 symbolizer 중복. sanitizer 옵션을 job까지 연결하는 독립 역할은 남는다. |
| E | 7 | L2·5의 CMake·양쪽 CI 약속은 각 절로 이행. Multi-config가 CMake의 multi-configuration generator인지 sanitizer별 별도 빌드인지 명확하지 않아 상단 점수는 주지 않는다. |
| F | 7 | L526~532 실제5장 목록, L542 Valgrind로 다음 경로, L554~559 내부 대상·라벨이 맞는다. L409~428의 고유 진단 순서가 있어 템플릿 이외 근거를 충족. |
| G | 2 | L546~550 출처 목록과 L558 공식 flags는 있으나 주장별 버전은 약하다. L547의 using-clang-as-a-library 앵커는 sanitizer 매뉴얼 이름과 다르다. |

다음 조치: 옵션·preset 버전·실행 환경을 보강. 병합 대상 없음. 공통 preset 설명은 CMake 글로 넘기고 sanitizer CI 역할을 유지한다.

### valgrind/chapter01-intro.md

source_file: `src/content/blog/tools/debugging/valgrind/chapter01-intro.md`

- url: `/blog/tools/debugging/valgrind/chapter01-intro`
- score_status: 잠정; score: 55; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L50↔132 MSan/미초기화 탐지 설명 충돌. P0 미발견.
- uncertainties: 성능 배율, 지원 플랫폼, DRD 메모리 우위와 권장 버전의 근거 미확인. 예시별 버전 차이는 전체 오류로 세지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | L43~60 비교·L79~141 도구 지도는 일반 입문 내용이고 고유 분석은 제한적. 기존 동의. |
| B | 12 | L13~35 동작 모델→L39~141 선택→L145~229 첫 실행·설치→L233~249 로드맵·정리로 첫 글 질문은 완결. 두 버전 예시를 결함으로 과도 해석한 근거를 제거해11→12. MSan 충돌로 B≤13. |
| C | 7 | L147~183 소스·명령·출력, L185~192 해석이 연결된다. L45·245 배율에 환경·출처 없으므로 C≤8. 실행을 직접 재현한 기록은 아니다. |
| D | 10 | L43~53↔sanitizers ch01 L204~218 비교축, L87~93↔Valgrind ch02 L15~24 탐지 목록, L118~123↔ch04 L19~29 결론이 반복. L233~239 허브 안내 역할은 구분된다. |
| E | 7 | L2·5의 세 도구 비교·도입 자리 약속을 L79~141이 답한다. 선택 이유의 실증은 약해9 미만. |
| F | 7 | L253·263 다음 편은 실제 ch02, L233~239 목록도 ch02~05와 맞는다. L264 sanitizer·L265 GDB의 실제 제목·내용을 확인했다. |
| G | 2 | L257~259 공식 문서 목차는 있으나 L45 배율·L118 알고리즘·L224 버전 권고와 직접 연결되지 않음. |

다음 조치: 허브 유지 방향의 보강. 병합 대상 없음. 탐지 가능 범위의 일반화를 먼저 고친다.

### valgrind/chapter02-memcheck.md

source_file: `src/content/blog/tools/debugging/valgrind/chapter02-memcheck.md`

- url: `/blog/tools/debugging/valgrind/chapter02-memcheck`
- score_status: 잠정; score: 54; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L49~51 기본값·yes 의미가 공식 옵션과 다름. 기존 내부 모순 근거는 위 절에서 한계를 기록.
- uncertainties: L116 num-callers 기본값, L24의 '유일한 강점', L175 vgdb 최초 중단 조건, 성능 배율과 출력 줄 번호 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L195~228 용도별 묶음과 L249~342 증상별 설명은 기본 옵션 나열에 적용 관점을 더함. 독자적인 관측은 없음. |
| B | 11 | L43~175 옵션→L195~228 실행 묶음→L232~382 한계·결론은 이어지나 핵심 기본값 오류가 있다. L295 제목과 write 예시 차이는 설명 정합성 감점이며 독립 오류 게이트로 확대하지 않음. |
| C | 7 | L195~215 CI 명령·L299~307 off-by-one 예시·출력은 재현 단서다. 환경·버전 없고 L95·218·328 배율에 출처 없어 C≤8. |
| D | 10 | L59~74 네 누수 유형↔ch03 L13~25, L131~152 suppression 템플릿↔ch05 L178~200, L337~342 비용 팁↔ch05 L438~470이 겹친다. 전체 옵션 workflow 역할은 별도. |
| E | 6 | 제목의 workflow는 묶음·증상 절로 답하나 description의 error-limit은 본문에 설명이 없다. 키워드 일부 미이행. |
| F | 7 | L129 ch05 위임, L389 다음 ch03, L399~402 실제 관련 대상·라벨이 맞고 용도별 옵션 단계가 고유 구조다. |
| G | 2 | L393~395 공식 옵션 링크는 있지만 어떤 버전을 대조했는지·개별 기본값 출처가 없다. |

다음 조치: 현재 공식 옵션 계약을 기준으로 보강. 병합 대상 없음. suppression·누수 분류는 ch05·ch03으로 연결해 반복을 줄인다.

### valgrind/chapter03-leak-report.md

source_file: `src/content/blog/tools/debugging/valgrind/chapter03-leak-report.md`

- url: `/blog/tools/debugging/valgrind/chapter03-leak-report`
- score_status: 잠정; score: 56; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L295 med 기본값·L335 show-reachable 등가, L147·240·407의 일괄 무시 지침.
- uncertainties: Base2 실제 offset은 ABI·빈 베이스 최적화에 따라 달라 단정하지 않음. Node 크기40B·재귀 출력·시나리오별 출력 실재 여부는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L224~244 우선순위·L261~300 record 그룹화·L349~400 서버 재현 흐름은 단순 분류표를 넘는다. 관측 데이터는 없음. |
| B | 12 | L29~221 네 분류·L224~400 적용 흐름은 완성되지만 possibly lost를 종류만 보고 무시하라는 규칙과 핵심 옵션 오류 때문에13→12. 열린 의문으로 B≤13. |
| C | 6 | L373~389 명령·출력과 L398~400 재검증 안내는 있으나 process_request 구현과 환경이 없어 실제 재현은 불완전. 실행 결과로 검증됐다고 가점하지 않음. |
| D | 10 | L29~92↔ch02 L59~74 분류 설명, L64~92 list 예↔sanitizers ch03 L122~132 direct/indirect, L363~389 process_request↔그 글 L134~143 반복 할당 예를 직접 비교했다. loss record 해석 역할은 구분. |
| E | 7 | L2·5의 네 분류·우선순위를 L29~244가 다룬다. '정확한 의미' 약속은 잘못된 일괄 무시·옵션으로 약해짐. |
| F | 7 | L415 다음 ch04, L424~427 ch02·ch04·LSan·운영 누수 진단 대상이 맞고 L224~244 적용 순서가 고유. |
| G | 2 | L419~420·428 공식 정의 링크는 있으나 옵션·heuristics를 주장에 붙이거나 버전을 명시하지 않는다. |

다음 조치: 분류 판단 조건·옵션 기본값 보강. 병합 후보는 ch02의 누수 분류 절과 LSan의 반복 예시 부분이며, 전체 글은 loss record 해석 역할로 차별화한다.

### valgrind/chapter04-helgrind-drd.md

source_file: `src/content/blog/tools/debugging/valgrind/chapter04-helgrind-drd.md`

- url: `/blog/tools/debugging/valgrind/chapter04-helgrind-drd`
- score_status: 잠정; score: 55; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L256 shared-threshold의 단위·대상 오류를 공식 DRD 옵션 절로 확인.
- uncertainties: Helgrind의 lockset/atomic 처리, std::cout·static 초기화 오탐, L110·275 진단 출력, L22~27 메모리·정확도 우열은 미확인. 따라서 과거 높음 confidence를 중간으로 둔다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L261~375 condvar·annotation 예제와 L400~406 도구 분담은 적용 관점. L22~27 우열표는 근거 없는 일반론. |
| B | 12 | L33~186 두 도구→L223~375 옵션·동기화→L379~453 운영·한계 흐름은 있지만 핵심 옵션 오류와 미확인 메커니즘으로 B≤13. |
| C | 6 | L61·158 명령과 L383~396 CI는 있으나 race.c 완성 소스·버전이 없다. L210~217 환경 없는 비용 수치로 C≤8. |
| D | 10 | L19~29↔ch01 L118~123 결론, L383~396↔ch05 L385~397 CI가 반복. sanitizers ch04 L437 및 gdb-lldb ch06 L390~400은 도구 비교/연결 수준이라 전체 대체 글로 보지 않는다. |
| E | 7 | L19~29·204·400~406 언제 무엇을 고르는지 답하나 실제 race 원인을 좁히는 과정은 L86~89 정도로 짧다. |
| F | 7 | L457 다음 ch05, L467~470 실제 ch03·ch05·TSan·GDB 대상이 맞고 동기화별 절 구분이 있다. 잘못된 '(논문)' 참고자료 유형은 G에 별도 기록. |
| G | 2 | L461~463 공식 매뉴얼은 있으나 L463의 논문 라벨은 실제 manual intro와 다르고 개별 주장 버전·출처도 약함. |

다음 조치: 옵션 표부터 보강. 병합 대상 없음. 우열을 단정하는 표는 검증하거나 제거하고 CI 중복은 ch05로 연결한다.

### valgrind/chapter05-suppressions.md

source_file: `src/content/blog/tools/debugging/valgrind/chapter05-suppressions.md`

- url: `/blog/tools/debugging/valgrind/chapter05-suppressions`
- score_status: 잠정; score: 65; confidence: 중간; factcheck: 오류 확인.
- anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L130~136 패턴 위치 설명 및 L88 추가 정보 줄 일반화 오류. P0 미발견.
- uncertainties: L270 summary 카운트 해석, glibc libpthread 패턴 적용 범위, 배포판 default.supp 경로, L470 배율과 가상 OpenSSL 함수명. 전체 라이브러리 오류를 false positive로 간주할 근거도 없음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | L117 프레임 와일드카드 구분·L219~251 과도 억제 실패와 축소 규칙·L438~470 최소 재현 전략은 일반 옵션 개관보다 가치가 있다. 실제 사례 검증은 없어 LLM 앵커18 미달. |
| B | 13 | L32~215 문법·생성→L219~297 위험·통계→L301~430 운영→L434~501 재현·마무리는 완결. 미해결 정확성 의문과 확인 오류가 있어 B≤13. |
| C | 8 | L183·258~261·287~296 명령·L341~428 두 CI를 제공하나 실제 실행 로그·환경 검증은 없다. L470 무출처 비용으로 C≤8. |
| D | 11 | L178~200↔ch02 L131~152 템플릿, L385~397↔ch04 L383~396 CI, L305~333↔sanitizers ch05 L485~505 운영 결론이 겹침. 문법·억제 범위 판단은 이 글 역할. |
| E | 8 | L2·5의 문법·외부 라이브러리·분담·CI 약속에 L32~430이 대응한다. 특정 환경·운영 실증은 부족해9 미만. |
| F | 7 | L478~484 실제5장 목록, L501 sanitizer로 다음 행선지, L511~516 관련 내부 대상·라벨이 맞는다. L48~117 문법별 단계와 L400~405 옵션 해설이 고유 구조. |
| G | 3 | L505·507·515가 실제 suppression 형식 절로 연결돼 일반 목차보다 구체적이다. Valgrind·glibc·배포판의 판과 주장별 출처는 빠져4 미만. |

다음 조치: 매칭 규칙·Param 정보·사용된 suppression 확인 절차 보강. 병합 대상 없음. 기존 도구별 CI는 간략 링크로 줄일 수 있다.

## 시리즈 공통 문제와 검토 경계

- Valgrind 다섯 편 모두 버전·환경이 주장별로 고정되지 않고, 공통 예시 출력이 실행 결과인지 분명하지 않다. 개별 값은 글 날짜보다 뒤의 최신 환경을 임의로 만들어 채우지 않는다.
- 미초기화 탐지를 Memcheck만의 것으로 일반화하는 문장이 ch01·ch02·ch05에 반복된다. MSan·바이너리 계측 필요성의 조건을 구별해야 한다.
- 새 보고서와 기존 보고서가 판정은 같아도 모든 근거에 동의한 것은 아니다. 특히 ch02 read/write 소제목 및 경계 거리의 해석은 이전보다 제한적으로 기록하고, 공식 옵션 오류로 교체했다.
- 병합·제외·발행 상태 변경은 수행하지 않았다. 원문 수정은 별도 작업이다.
