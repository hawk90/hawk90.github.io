# 공개 글 AdSense 평가 — 루프 41

> 대상: 공개 글 6편 (Sanitizers `seriesOrder` 5, Valgrind `seriesOrder` 1~5)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 마지막 루프다. 남은 글이 6편이라 루프 크기도 6편이다. 대상은 `src/content/blog/tools/debugging/sanitizers/chapter05-cmake-ci.md` 1편(Sanitizers 시리즈 마지막 편)과 `src/content/blog/tools/debugging/valgrind/`의 chapter01~chapter05(도구 개요, Memcheck, Leak Report, Helgrind·DRD, Suppression) 5편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `sanitizers/chapter05-cmake-ci.md` | 14 | 12 | 8 | 11 | 7 | 7 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `valgrind/chapter01-intro.md` | 10 | 11 | 7 | 10 | 7 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `valgrind/chapter02-memcheck.md` | 11 | 11 | 7 | 10 | 6 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `valgrind/chapter03-leak-report.md` | 12 | 13 | 6 | 10 | 7 | 7 | 2 | **57** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `valgrind/chapter04-helgrind-drd.md` | 11 | 12 | 6 | 10 | 7 | 7 | 2 | **55** | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `valgrind/chapter05-suppressions.md` | 15 | 13 | 8 | 11 | 8 | 7 | 3 | **65** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |

평균 57.7점(6편, 합 346점), 범위 54~65점이다. 판정은 6편 모두 우선 조치이고 유지·검증 대기·보강·병합 검토·제외 검토는 없다. 6편 모두 오류 확인이라 점수 구간과 상관없이 우선 조치로 올라갔다. 점수 구간만 보면 보강 2편(sanitizers ch05 61점, valgrind ch05 65점), 병합 검토 4편(valgrind ch01·ch02·ch03·ch04)이다. 이 가운데 valgrind ch01은 시리즈 첫 글이자 로드맵 허브(233~239행)라 허브 규칙상 보강으로 본다. 오류 확인 6건 중 4건(sanitizers ch05, valgrind ch01·ch02·ch05)은 원문 내부 모순(코드-산문, 표-표, 산술, 규칙-설명)이다. 2건(valgrind ch03·ch04)은 Valgrind Memcheck·DRD 매뉴얼을 직접 열어 확인했다. '검증됨'은 없다. Valgrind 5편은 2750746a 한 커밋으로 작성됐고, sanitizers ch05는 bda66c51 재작성 뒤 일괄 정리 커밋만 있다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 본문·관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지다. 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `sanitizers/chapter05-cmake-ci.md` | 62 | 61 | -1 | 없음 |
| `valgrind/chapter01-intro.md` | 54 | 54 | 0 | 없음 |
| `valgrind/chapter02-memcheck.md` | 55 | 54 | -1 | 없음 |
| `valgrind/chapter03-leak-report.md` | 57 | 57 | 0 | 없음 |
| `valgrind/chapter04-helgrind-drd.md` | 55 | 55 | 0 | 없음 |
| `valgrind/chapter05-suppressions.md` | 65 | 65 | 0 | 없음 |

- 기각한 오류 확인은 없다. 평가자가 올린 오류 확인 3건(valgrind ch01 50·132행, ch03 295·335행과 heuristics 설명, ch04 256~257행)은 원문과 1차 자료로 다시 확인했고 모두 성립한다.
- 추가한 오류 확인 3건:
  - sanitizers ch05: 19행은 'cmake -DENABLE_SANITIZERS=ON으로 한 줄에 켜기'라고 적는다. 그러나 본문 CMake가 정의하는 옵션은 ENABLE_ASAN·ENABLE_TSAN(32~33행)과 ENABLE_MSAN(130~132행)뿐이다. 사용 예(62·66행)와 preset(162·176행)도 같은 옵션을 쓴다. 코드-산문 모순이다.
  - valgrind ch02: 평가자는 295행 절 제목 '"Invalid read of size N"'과 304행 출력 'Invalid write of size 1'의 불일치를 불확실로 두었는데, 이를 오류로 올렸다. 평가자가 놓친 산술 모순도 있다. 310행은 '`N bytes after` — N 바이트 만큼 오버런'인데 299행 off-by-one 예의 출력은 306행 '0 bytes after'다.
  - valgrind ch05: 평가자는 uncertainties에 두었는데, 원문 안의 모순이라 오류로 올렸다. 104행 규칙은 '위에서 아래로 매칭(스택 안쪽이 위)'이고 130~132행 패턴은 첫 줄 `fun:malloc`, 마지막 줄 `obj:*libcrypto*.so*`다. 그런데 136행 설명은 'malloc이 어느 자리에 있든 그 위에 libcrypto가 끼어 있으면'이다.
- 판정 변경: sanitizers ch05·valgrind ch05는 보강에서, valgrind ch02는 병합 검토에서 우선 조치로 바뀌었다. 모두 오류 확인 override이고 score_band는 그대로 둔다.
- sanitizers ch05 B 13→12: 19행 안내를 그대로 따르면 아무 sanitizer도 켜지지 않아 첫 시나리오부터 따라갈 수 없다. 평가자는 매트릭스 job에서 ninja 설치가 빠진 것을 macOS만의 문제로 적었는데, 모든 OS에서 빠져 있어 근거를 고쳤다.
- sanitizers ch05 uncertainties: 로컬 CMake 4.4.4의 cmake-presets(7) 매뉴얼에서 preset 스키마 version 6이 CMake 3.25에 추가됐음을 확인했다. 기억 기반 의심을 확인된 사실로 바꿨다. 149행 '3.19+'는 presets 전체로는 맞으므로 모순이 아니라 누락으로 보고 B·G에 반영했다.
- valgrind ch02 B 12→11: 독자가 보고서를 읽는 핵심 절(295~311행)에 내부 모순이 두 개 있다.
- valgrind ch04 confidence 중간→높음: 256행 오류를 WebFetch 요약이 아니라 curl로 받은 DRD Manual 원문 옵션 절로 확인했다.
- 줄 번호 보정(점수 영향 없음):
  - sanitizers ch05 D: cert-c/chapter14-sanitizer-suite(draft, 392~395·471~473행)를 비교 글에 추가했다.
  - valgrind ch01 D: sanitizers/chapter01 39~41행, ch02 15~22행, ch04 17~29행.
  - valgrind ch02 D: ch01 42~53행, sanitizers/chapter01 200~214행.
  - valgrind ch03 D: ch02 57~63행, LSan 122~132·134~143행, 이 글 172~207행.
  - valgrind ch04 D: ch01 118~123행, ch05 385~397행.
  - valgrind ch05 D: ch04 384~405행. sanitizers ch05와는 결론 일부만 겹친다.
- 부풀림 판정은 6편 모두 없음이다. 최종 점수는 1차와 같거나 낮다.

## 글별 근거

### `sanitizers/chapter05-cmake-ci.md` — 61점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 코드와 산문 모순(루브릭 3-1). 19행은 이 장의 CMake 통합 시나리오를 'cmake -DENABLE_SANITIZERS=ON으로 한 줄에 켜기'라고 적는다. 본문 CMake 코드가 정의하는 옵션은 `option(ENABLE_ASAN ...)`·`option(ENABLE_TSAN ...)`(32~33행)과 ENABLE_ASAN·ENABLE_TSAN·ENABLE_MSAN(130~132행)뿐이다. 사용 예(62·66행 `-DENABLE_ASAN=ON`/`-DENABLE_TSAN=ON`)와 preset(162·176행)도 같은 옵션을 쓴다. 이 글의 CMakeLists로는 `-DENABLE_SANITIZERS=ON`이 아무것도 켜지 않으므로 두 진술은 함께 참일 수 없다. git log(bda66c51 시리즈 재작성, 09a00a29, 400892d7, ac24bb76, be973200, 2343c401, 07cc1988, 28524a9d, 0a9dd7bc, 35baac92)에 1차 자료 대조 커밋은 없다. 별도로 로컬 CMake 4.4.4의 cmake-presets(7) 매뉴얼에서 preset 스키마 version 6이 CMake 3.25에 추가됐음을 확인했다. 153행 version 6 예제는 3.25 이상이 필요한데 149행은 '3.19+'만 적는다. 모순이 아니라 누락이라 B·G에 반영했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 다음과 같다. MSan Clang 전용 검사와 조합 충돌 차단 함수(81~123행), sanitizer 환경 변수를 preset environment에 넣는 구성(164~180·218행), 실패 진단 4단계(409~428행), 규모별 운영 모델(486~506행). CMake option 분기(30~56행), GitHub Actions job(226~282행), GitLab 앵커 템플릿(328~364행)은 흔한 템플릿 수준이다. 50KLoC·500KLoC 경계와 CI 시간(486·491·493·499·501행)은 근거 없는 권장이다. 작성자의 실패 사례·측정이 없어 13~19 구간 하단으로 둔다. 앵커 part12-10의 18보다 낮다. |
| B | 12 | CMake 기본(26행) → 함수(74행) → Presets(147행) → GitHub Actions(222행) → GitLab(324행) → 매트릭스(370행) → 실패 진단(407행) → 자주 만나는 문제(432행) → 운영 모델(482행) → 정리(512~520행) 흐름은 따라갈 수 있다. 그러나 19행 '-DENABLE_SANITIZERS=ON' 안내가 본문 옵션과 맞지 않아, 첫 시나리오부터 그대로 따라 하면 아무것도 켜지지 않는다. 153행 preset version 6은 CMake 3.25 이상이 필요한데 149행은 3.19+만 적고, 245·338행은 apt 기본 cmake를 설치한다. GitLab 템플릿(336~338행)에는 컴파일러 설치가 없다. 매트릭스(374~401행)에는 ninja·의존성 설치 단계가 아예 없는데 preset generator는 Ninja(159행)다. |
| C | 8 | 복사해 쓸 CMake·JSON·YAML·명령(30~68·151~216·226~318·413~426행)이 있어 절차는 갖췄다. 실제 실행 결과·CI 로그·소요 시간 관찰은 없다. 303행 '컴파일이 1.5배 정도', 454행 '1.5~2배', 491행 '~5~10분', 499행 'PR ~15분, 야간 ~1시간'은 출처·측정 환경이 없는 수치라 루브릭 3-1절에 따라 C ≤ 8이다. 436~439행 증상 출력 예는 있지만, 합격과 실패를 가르는 검증 절차는 아니다. |
| D | 11 | 비교한 글: 같은 시리즈 chapter04-tsan.md·chapter02-asan-ubsan.md. 다른 시리즈 tools/build/cmake/chapter04-options.md·chapter09-modern-advanced.md, debugging/valgrind/chapter05-suppressions.md, embedded/automotive/cert-c/chapter14-sanitizer-suite.md(draft). 겹치는 곳은 다음과 같다. 309~318행 TSan 10회 반복은 chapter04-tsan 389~397행과 같은 패턴이다. 287행 halt_on_error와 441~450행 심볼라이저 설명은 chapter02 137~145·163~169행과 같다. 151~208행 preset은 cmake/chapter04 425~440행·cmake/chapter09 265~300행과 구조가 같다. 30~56행 option 분기는 cmake/chapter04 156·296~311행과 겹친다. cert-c ch14 392~395·471~473행에도 GitLab sanitizer 매트릭스가 있지만 draft다. 그래도 'sanitizer를 CMake preset+CI job으로 돌리는 법'에 답하는 발행 글은 이 글뿐이고, cmake/chapter04 710행도 이 역할로 이 글을 가리킨다. 그래서 10~14 구간이다. |
| E | 7 | description(5행)의 CMake 옵션·GitHub Actions·GitLab CI는 26~218·222~320·324~366행에서 다룬다. 제목의 'Multi-config 빌드 전략'은 CMake 용어(Ninja Multi-Config·CMAKE_CONFIGURATION_TYPES)를 떠올리게 하지만, 본문은 sanitizer별 빌드 디렉터리(62~67행)와 preset(151~208행)이다. 19행이 약속한 'ENABLE_SANITIZERS 한 줄'도 본문에 없다. |
| F | 7 | seriesOrder 5는 디렉터리 chapter01~05 중 마지막이라 다음 편이 없다. 대신 시리즈 마무리 표(526~532행, 5장 구성이 실제 파일과 일치)와 Valgrind 시리즈 안내(542행, valgrind/chapter01-intro 존재)로 다음 행선지를 준다. 관련 링크 대상을 열어 제목과 대조했다. 554행 chapter04-tsan, 555행 chapter01-intro, 556행 cmake/chapter06-testing, 557행 valgrind/chapter05-suppressions, 559행 gnu-make/chapter01-intro 모두 라벨이 맞다. 149행 링크는 cmake/chapter09 265행 Presets 절을 가리킨다. 409~428행 단계별 진단과 486~506행 규모별 소제목은 이 글 고유 구조다. 렌더 확인을 하지 않아 9 이상은 주지 않았다. |
| G | 2 | 참고 자료(546~550행)와 558행 SanitizerCommonFlags 링크는 개별 주장에 붙지 않는다. 547행 Clang 링크는 'using-clang-as-a-library' 앵커라 sanitizer 문서가 아니다. 코드 안에 actions/checkout@v4·ubuntu-22.04·preset version 6(153행)이 있지만, 본문에는 CMake·GCC·Clang 버전과 대조 시점이 없다. 149행 'CMake 3.19+'는 version 6의 요구 버전(3.25)과 연결되지 않는다. |

uncertainties:
- ubuntu-22.04/ubuntu:22.04의 apt 기본 cmake가 3.25 미만이면 248·351행 `cmake --preset asan`이 실패한다. GitHub 러너 이미지에는 /usr/local/bin에 최신 cmake가 있을 수 있어 GitLab 쪽(335~338행)만 실패할 가능성이 있다. Ubuntu 패키지 버전은 기억 기반이라 확인하지 않았다.
- 335~338행 GitLab job은 ubuntu:22.04에 cmake·ninja·llvm만 설치하고 gcc/g++·clang은 설치하지 않는다. 그래서 configure가 실패하는지 확인하지 않았다.
- 374~401행 매트릭스의 macos-14 × gcc 조합에서 `gcc`가 Apple Clang인지, GCC ASan을 macOS에서 지원하는지 확인하지 않았다.
- 245·289·449행 Ubuntu `llvm` 패키지가 /usr/bin/llvm-symbolizer를 제공하는지 확인하지 않았다.
- 472행 'macOS는 LSan 기본 OFF'와 detect_leaks=1 해결책이 Apple Clang에서 성립하는지 확인하지 않았다.
- 287행 halt_on_error=1이 ASan 기본 동작과 다른지 확인하지 않았다(UBSan에는 의미가 있다).
- 428행 'exit()는 디버거가 못 잡고'가 정확한지 확인하지 않았다.
- 467행 `__tsan_acquire()`/`__tsan_release()` 인터페이스 이름·시그니처를 확인하지 않았다.
- 303·454·491·499행 수치와 486~501행 KLoC 경계는 출처·환경이 없다.

### `valgrind/chapter01-intro.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 50행 비교표의 '초기화 안 된 메모리' 행 Sanitizer 칸은 'MSan (Clang only)'로, Sanitizer가 이 버그를 잡는다고 적는다. 그런데 132행 선택표는 '초기화 안 된 값 사용 의심 → Memcheck (Sanitizer로 못 잡음)'이다. MSan이 Sanitizer 쪽 도구라는 것은 같은 글 50행이 밝혔으므로 두 진술은 함께 참일 수 없다. 91행 'Valgrind만의 강점'도 132행과 같은 쪽이다. git log(3232b1be 태그 정리, 0a9dd7bc slug 고정, 07cc1988 관련 항목 추가 등)에 본문 주장을 1차 자료와 대조한 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 43~51행 Sanitizer·Valgrind 비교표, 55~60행 'Valgrind만 가능한 자리', 79~123행 세 도구 소개는 매뉴얼·입문 자료 수준의 표준 내용이다. 이 글만의 판단은 129~139행 선택표와 123행 'Helgrind 먼저, 안 되면 DRD' 정도인데, 이것도 근거 없이 단정한다. 45행 '2~3×', '10~50×'는 출처가 없다. 118~121행 Helgrind·DRD 차이는 한 문단 요약이다. |
| B | 11 | 개념(13~35행) → Sanitizer 대비(39~60행) → 세 도구(64~123행) → 선택표(127~141행) → 첫 실행(145~192행) → 설치(196~229행) → 로드맵(233~239행) → 정리(243~249행) 흐름은 갖췄다. 그러나 다음 세 문제가 남아 있어 AP-C-24 상한(B≤13) 안에서 낮게 준다. 50행과 132행이 모순된다. 141행은 '위쪽 다섯 줄'이라 하지만 표 131~136행은 세 도구가 여섯 줄이다. 165행 3.18.1과 228행 3.22.0으로 버전이 맞지 않는다. |
| C | 7 | 147~158행 leak.c와 161~162행 gcc·valgrind 명령, 163~183행 출력이 있어 재현 경로는 있다. 하지만 출력 환경은 165행 Valgrind-3.18.1인데 228행 버전 확인은 3.22.0이고, OS·배포판 표기가 없다. 45·245행 배율 수치는 출처·측정 환경이 없어 C≤8 상한을 적용했다. 175·189·192행 'leak.c:5'도 모호하다. 148행 '// leak.c'를 파일 첫 줄로 보면 malloc(153행)은 6번째 줄이 된다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter02-memcheck.md·chapter03-leak-report.md·chapter04-helgrind-drd.md, 다른 시리즈 sanitizers/chapter01-intro.md. 43~53행 비교표와 '보완' 결론은 sanitizers/chapter01-intro.md와 거의 같다. 그 글 39~41행에 같은 배율(2~3×, 10~50×)이, 204~218행에 '왜 Valgrind 안 쓰고' 표와 '경쟁이 아니라 보완 관계' 결론이 있다. 같은 시리즈와도 겹친다. 87~93행 Memcheck 탐지 목록은 chapter02 15~22행, 118~123행 Helgrind·DRD 알고리즘·'Helgrind 먼저' 권고는 chapter04 17~29행, 185~190행 네 가지 누수 분류는 chapter03 13~25행과 같다. 시리즈 첫 글로서 도구 지도·로드맵 역할은 구별되어 10~14 구간 하단이다. |
| E | 7 | 제목의 'Memcheck·Helgrind·DRD'는 79~123행에서 다룬다. description의 '살아남은 이유'는 39~60행, '세 도구 역할'은 64~123행, '도입 자리'는 127~141·196~229행에서 다룬다. 다만 제목의 '비교'는 118~123행 한 문단과 선택표뿐이라 9점 이상은 아니다. |
| F | 7 | 253행 다음 장 링크는 seriesOrder 2인 chapter02-memcheck.md와 맞다. 관련 항목도 공개 글이고 라벨이 맞음을 직접 확인했다. 263행 chapter02, 264행 sanitizers/chapter01-intro(제목 'Sanitizer 종류 비교'와 일치), 265행 gdb-lldb/chapter01-intro-and-install이다. 35·110행 링크(sanitizers/chapter04-tsan)도 맞다. 233~239행 로드맵은 chapter02~05 제목과 대응한다. 전제 지식 안내가 없고 141행 '위쪽 다섯 줄' 안내가 표와 맞지 않아 8점 이상은 주지 않았다. |
| G | 2 | 257~259행 참고 자료는 Valgrind Manual·Memcheck Manual·QuickStart 목차 링크뿐이다. 45행 배율, 118행 알고리즘, 216행 Apple Silicon 지원, 224행 3.18.0+ 권장 같은 개별 주장과 연결되지 않는다. 버전은 165·228행에 있지만 서로 달라 기준 버전이 불명확하다. |

uncertainties:
- 175·189·192행 'leak.c:5': 148행 '// leak.c'가 파일의 실제 첫 줄이면 malloc(153행)은 6번째 줄이다. 그 주석이 라벨인지 파일 내용인지 글이 밝히지 않았다.
- 164~165행: 3.18.1 출력에 'Copyright (C) 2002-2022'가 함께 나온다. 3.18.1 배포 시점과 맞는지 실제 출력으로 확인하지 않았다(기억 기반 의심이라 오류 확인 아님).
- 118행 'DRD는 Lamport's vector clock, Helgrind는 happens-before + 락 추적'과 120~121행 장단점을 Valgrind 매뉴얼 Helgrind·DRD 장과 대조하지 않았다.
- 213·248행 '공식 지원 약함'과 216행 'Apple Silicon에서 공식 지원이 사라졌습니다'는 표현 강도가 다르다. Apple Silicon을 공식 지원한 적이 있는지 지원 플랫폼 목록으로 확인하지 않았다.
- 47행 '시스템 호출 추적 — 완전', 51행 '시스템·임베디드 — 광범위'를 Valgrind 지원 아키텍처·syscall 래퍼 범위와 대조하지 않았다.
- 224행 '3.18.0+ — 최신 GCC·Clang의 디버그 심볼 형식 지원'의 근거(릴리스 노트)를 확인하지 않았다.
- 45·245행 '10~50×', '2~3×'는 출처·측정 환경이 없는 수치다.
- 141행 '위쪽 다섯 줄'은 표 131~136행 여섯 줄과 개수가 맞지 않는다. 산문 개수 실수라 오류 확인 대상은 아니다.

병합 대상: 점수는 병합 검토 구간(54점)이지만 시리즈 첫 글이자 로드맵 허브(233~239행)라 허브 규칙상 보강으로 본다. 판정은 오류 확인 때문에 우선 조치다. 50·91·132행의 MSan 서술을 하나로 맞춘 뒤, sanitizers/chapter01-intro 204~218행과 겹치는 비교표는 한쪽을 정본으로 정하고 나머지는 링크로 줄인다.

### `valgrind/chapter02-memcheck.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순 두 곳(루브릭 3-1).
1. 산술 모순: 299행 `p[10] = 'x';   // ❌ off-by-one`의 출력은 306행 'Address ... is 0 bytes after a block of size 10'이다. 즉 1바이트 오버런이 '0 bytes after'로 나온다. 그런데 310행은 '`N bytes after` — N 바이트 만큼 오버런'이라 하므로, N=0이면 오버런이 없다는 뜻이 된다. 둘이 함께 참일 수 없다.
2. 코드·출력과 제목의 모순: 295행 절 제목 '"Invalid read of size N"'은 이 절이 설명하는 오류 메시지를 가리킨다. 그런데 같은 절의 코드(299행)는 쓰기이고, 출력(304행)은 'Invalid write of size 1'이다.

git log(2750746a 시리즈 신규 작성 이후 60ec7a24·400892d7·49f2a443·ac24bb76·be973200·07cc1988·28524a9d·0a9dd7bc·3232b1be)는 다이어그램·린터·제목·관련 항목·언어 태그·slug·태그 정리이고, 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 44~177행은 매뉴얼 옵션을 하나씩 옮긴 목록이다. 이 글만의 것은 일상·CI·빠른 확인 세 묶음(183~218행), CI에서 possible/reachable은 실패시키지 않는다는 기준(208~210행), -g/-O와 `???` 출력의 연결(224~243행), 한계 절(346~374행)이다. '거의 항상 정답'(55행), 'CI 통합의 표준'(109행), '보통 20~30이 적절'(119행)은 근거 없는 단정이다. 6~12 구간 상단이다. |
| B | 11 | 흐름은 끝까지 이어진다. 잡는 오류(15~22행) → 기본 호출(30~40행) → 옵션(44~177행) → 묶음(181~218행) → 컴파일 옵션(222~243행) → 자주 보는 에러(247~322행) → 성능(326~342행) → 한계(346~374행) → 정리(378~385행). 그러나 독자가 실제 보고서를 읽는 핵심 절(295~311행)에 내부 모순이 두 개 있다. 49~51행 leak-check 기본값·yes 의미와 284~291행 메시지 종류도 불확실하다. 그래서 AP-C-24 상한(B≤13)보다 낮춰 10~15 구간 하단에 둔다. |
| C | 7 | 명령(37·67·83·102~103·186~205행)과 출력 조각(86~91·141~150·237~238·303~307행)은 있다. 그러나 Valgrind 버전·OS·아키텍처·컴파일러 환경이 없다. '2~3× 더 느려집니다'(95·340행), '10~50× 오버헤드'(328행), '30초 안에'(218행), '280 bytes in 5 blocks'(256행)는 출처·환경 없는 수치라 C≤8이다. 88행 test.c:5, 305행 main.c:5 출력은 보인 코드 조각(75~77·297~301행)과 줄 번호가 대응하지 않아 재현 신호가 약하다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter01-intro.md·chapter03-leak-report.md·chapter05-suppressions.md, 다른 시리즈 sanitizers/chapter01-intro.md·sanitizers/chapter02-asan-ubsan.md. 겹치는 곳은 네 군데다. (1) 249~265행 still reachable 원인(전역·정적·atexit)은 chapter03 155~180행과 같다. (2) 131~152행 --gen-suppressions=all 템플릿은 chapter05 178~200행과 같다. (3) 337~342행 속도 팁은 chapter05 434~472행과 같다. (4) 24행 '초기화 추적은 Memcheck, MSan Clang only'는 chapter01 42~53행 표, sanitizers/chapter01 200~214행 표와 같다. 옵션 레퍼런스 역할은 구별되지만 반복 절이 세 곳이라 10~14 하단이다. |
| E | 6 | 제목(2행)은 '메모리 오류 탐지 워크플로'인데, 본문 중심은 옵션 목록(44~177행)과 오류 메시지 목록(247~322행)이다. 워크플로라 할 만한 것은 묶음 절(181~218행) 정도다. description(5행)의 'error-limit'은 본문에 없고, --error-exitcode만 102·106·202행에 나온다. |
| F | 7 | 389행 다음 장은 seriesOrder 3인 chapter03-leak-report.md와 맞다. 관련 항목 4개도 대상 파일 제목과 라벨이 맞다. 399행 chapter01-intro, 400행 chapter03, 401행 sanitizers/chapter02-asan-ubsan, 402행 gdb-lldb/chapter01-intro-and-install이다. 본문 링크 59·129·177행도 맞고, 59·129행은 상세 위치를 알려 주는 이 글 고유의 탐색이다. 그러나 295행 제목이 내용(쓰기 오류)과 달라 탐색을 오도한다. audit:reading·폰 폭 확인도 하지 않아 8 이상은 주지 않았다. |
| G | 2 | 참고 자료(393~395행)와 403행에 Memcheck 매뉴얼·Core Options 링크가 있다. 하지만 49~51행 기본값, 71행 show-leak-kinds 기본값, 113행 12 프레임 같은 주장에 연결된 본문 인용은 아니다. Valgrind 버전·플랫폼 표기도 333행 'x86' 외에는 없다. |

uncertainties:
- 49행 '--leak-check=no # 기본'과 51행 '--leak-check=yes # = summary': 기억으로는 기본값이 summary이고 yes는 full과 같다. Memcheck 매뉴얼로 확인하지 않았다.
- 284~291행: fwrite에 초기화 안 된 버퍼를 넘기면 'Syscall param write(buf) points to uninitialised byte(s)'로 보고될 것으로 기억한다. 22행이 시스템 호출 인자를 별도 범주로 둔 것과도 어긋나지만, 엄밀히 양립 불가는 아니어서 오류 확인에 넣지 않았다.
- 311행 'N bytes inside — 해제된 메모리': 실제 메시지는 'inside a block of size M free'd/alloc'd'처럼 해제 여부가 뒤에 붙는다고 기억한다. 확인하지 않았다.
- 24행 'uninitialized value가 Memcheck의 유일한 강점'과 320행 'Valgrind가 더 정확하게 짝을 추적'은 단정끼리 부딪친다. 기술 수치의 모순은 아니다.
- 201행 CI 묶음의 show-leak-kinds에는 reachable이 없는데, 210행은 'Possible/reachable은 보고만'이라 한다. LEAK SUMMARY 집계로는 보이므로 모순으로 확정하지 않았다.
- 359~366행 'Heap-after-stack'은 표준 용어가 아니다(use-after-return). Memcheck 탐지 범위를 1차 자료로 확인하지 않았다.
- 95·340행 2~3배, 328행 10~50배, 218행 30초는 출처·환경 없는 수치다.
- 113행 num-callers 기본 12, 71행 show-leak-kinds 기본 definite,possible을 매뉴얼로 확인하지 않았다.

병합 대상: 병합 대상 없음. 시리즈에서 Memcheck 옵션 전체를 다루는 글은 이 글뿐이다. 판정은 오류 확인 때문에 우선 조치이고, 오류를 고친 뒤 다음 조치는 보강이다.
1. 310행을 '0 bytes after = 끝 바로 다음 바이트'와 맞게 고친다. 295행 제목은 예제(Invalid write)와 맞추거나 예제를 읽기로 바꾼다.
2. 49~51행 leak-check 기본값·yes 의미, 113행 num-callers 기본값, 284~291행 메시지 종류를 Memcheck 매뉴얼과 대조해 고치고, 본문에 출처를 단다.
3. description의 error-limit은 본문에서 다루거나 description에서 뺀다.
4. chapter03 155~180행, chapter05 178~200·434~472행과 겹치는 절은 한 줄 요약과 링크로 줄인다.

### `valgrind/chapter03-leak-report.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료 Valgrind Memcheck 매뉴얼(https://valgrind.org/docs/manual/mc-manual.html)을 재검증 중에 직접 열어 세 가지를 확인했다.
1. --leak-resolution 기본값: 매뉴얼은 "[default: high]"다. 본문 295행은 "`med` (기본)"이라 적었고, 298행 "처음에는 `med`로 보고"도 이 전제를 따른다.
2. --show-reachable=yes의 동치: 매뉴얼은 "--show-reachable=yes is equivalent to --show-leak-kinds=all"이다. 335행은 --show-leak-kinds=reachable과 같다고 적었다.
3. heuristics 동작: 매뉴얼상 --leak-check-heuristics 기본값은 all이고, stdstring·multipleinheritance 휴리스틱에 걸린 블록은 still reachable로 보고된다. 그런데 114~133·148·240·407행은 다중 상속·std::string을 possibly lost의 흔한 원인으로 들고 '무시'하라고 한다.

git 이력(2750746a 작성, 400892d7 린터, 49f2a443·f38a41a0 서식, ac24bb76 제목, be973200 topics, 07cc1988 관련 항목, 28524a9d 코드 블록 언어, 0a9dd7bc slug, 3232b1be 태그)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 부분은 다음과 같다. 225~243행 '우선순위 결정 알고리즘', 261~266행 blocks 카운트 표와 분당 1000회×60분=60,000블록 계산, 302~329행 재귀 누수와 leak-resolution을 묶은 설명, 350~399행 서버 누수 5단계 시나리오. 반면 29~221행의 네 분류 정의는 매뉴얼 내용을 옮긴 수준이다. 112~151행 다중 상속·STL 판단은 매뉴얼의 heuristics 동작과 맞지 않아 이 글만의 판단 기준으로 인정하지 않는다. 148행 '무시'와 221행 '대부분의 프로젝트는 그대로 둡니다'는 근거 없는 일반론이다. |
| B | 13 | 네 분류(29~221행) → 우선순위(225~243행) → loss record·그룹화(247~282행) → --leak-resolution(286~329행) → reachable 위치(333~346행) → 실전 시나리오(350~399행) → 정리(403~411행)로 기본 흐름은 완성됐다. 빠진 것도 있다. possibly lost를 reachable로 돌리는 --leak-check-heuristics를 다루지 않는다. 397~399행 재검증은 '0이 됐는지 확인' 한 줄로 끝나고 예상 출력이 없다. 10~15 구간 중간이다. |
| C | 6 | 명령(184~187·290~292·369~372행)은 있지만 Valgrind 버전·OS·컴파일러 표기가 없고, 보고서 예시는 직접 만든 출력으로 보인다. 84~92행에서는 두 블록이 같은 주소 0x10918A를 main과 append에 함께 쓰고, 314~327행 'by recursive (depth 1)'은 Valgrind 출력 형식이 아니다. 62행은 C 코드인데 typedef 없이 `Node*`를 쓴다. 371행 --track-origins=yes는 초기화 안 된 값을 추적하는 옵션이라 누수 추적과 관계가 없다. 출처·환경 없는 수치(69~70행 40 bytes, 377행 40000 bytes)만 있어 3-1절에 따라 8 이하이고, 실행 조건·예상 결과가 부족해 4~7 구간이다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter02-memcheck.md·chapter01-intro.md, 다른 시리즈 sanitizers/chapter03-lsan-leaks.md·memory/chapter05-prod-leak-diagnosis.md. chapter02와 세 군데가 겹친다. 그 글 57~63행은 네 분류를 요약하고 상세를 이 글로 넘긴다. 249~266행 still reachable 설명(원인 전역·정적·atexit, 'CI에서는 무시', atexit 정리)은 이 글 172~207행과 같다. 99~104행 --errors-for-leak-kinds=definite,indirect도 이 글 184~187행과 같다. chapter01 173~190행에도 같은 '40 bytes in 1 blocks are definitely lost'(0x483977F/0x10918A) 예시와 네 분류 목록이 있다. LSan 글과는 예제 뼈대가 같다. 122~132행(Direct 16B list.c:10 + Indirect 80 bytes in 5 list.c:25)은 이 글 84~92·76행과, 134~143행(process_request server.c:88)은 이 글 376~383·259행과 겹친다. memory ch05는 운영 환경 진단이라 역할이 다르다. 독립 질문은 있지만 예제·결론 반복이 커서 10~14 하단이다. |
| E | 7 | 제목(2행)의 키워드 definitely·indirectly·possibly·still reachable은 29~221행에서 모두 다루고, description(5행)의 '우선순위'는 225~243행이 답한다. 다만 description이 약속한 '정확한 의미'는 일부 지키지 못했다. possibly lost 원인 설명(112~151행)이 매뉴얼의 heuristics 동작과 어긋난다. |
| F | 7 | 413~415행 다음 장 안내는 실제 seriesOrder 4인 chapter04-helgrind-drd.md와 맞다. 관련 항목 대상도 열어 대조했고 모두 라벨과 맞다. 424행 ch02, 425행 ch04, 426행 sanitizers/chapter03-lsan-leaks.md, 427행 memory/chapter05-prod-leak-diagnosis.md이고, 426행은 그 글 338행 static 도달 가능 설명이 'still reachable 판정 차이'라는 라벨과 맞다. 이 글 고유 구조로 350~399행 1~5단계 구분과 403~411행 정리가 있다. 다만 전제 지식(ch02 옵션) 안내가 도입부에 없고 424행에만 있어 9점 이상은 아니다. |
| G | 2 | 419~420·428행의 Valgrind 매뉴얼 링크는 참고 목록일 뿐이다. 295행 기본값이나 148행 false positive 판정 같은 개별 주장에 연결되지 않고, Valgrind 버전·플랫폼 표기도 없다. 1차 출처가 있다는 점만 인정했다. |

uncertainties:
- 69~70행은 `struct Node { int value; struct Node* next; }`를 40 bytes로 적었지만, LP64에서는 보통 16 bytes다. 89행 '80 bytes in 5 blocks'(블록당 16 bytes)와도 어긋나 보인다. 다만 84~92행은 list.c라는 다른 예제여서 내부 모순으로 확정하지 않았고, ABI 문서로도 확인하지 않았다.
- 62~64행: C 코드에서 typedef 없이 `Node*`를 쓰면 컴파일되지 않는다. 언어 규칙으로 판단해야 하는 결함이라 오류 확인에 넣지 않았다.
- 312·329행: 재귀 깊이마다 loss record가 따로 생기고 low로 하나로 묶인다고 설명한다. 매뉴얼의 '첫 2개 엔트리 일치' 규칙대로라면 일부 깊이끼리만 묶일 수 있다. 실행해서 확인하지 않았다.
- 130~133행: std::string SSO가 possibly lost를 만든다는 주장은 libstdc++ 버전과 heuristics 설정에 따라 다르다. 확인하지 않았다.
- 243행 '6개의 definite 자리'는 230행의 6 blocks를 6 records로 읽은 것이라 실제 loss record 수와 다를 수 있다.
- 매뉴얼은 WebFetch 요약으로 열람했다. 페이지에 버전 번호가 없어서, 기본값이 med였던 옛 버전이 있었는지는 확인하지 않았다.

병합 대상: 점수 구간(병합 검토)으로 보면 후보는 `src/content/blog/tools/debugging/valgrind/chapter02-memcheck.md` 57~63·249~266행(네 분류 요약·still reachable 처리)이다. 다만 이 글에는 네 분류 상세·loss record·--leak-resolution이라는 독립된 검색 의도가 있으므로 다음 조치는 병합이 아니라 보강이다.
1. 295·298행 기본값을 high로 고친다. 112~151·240·407행 possibly lost 설명은 --leak-check-heuristics(기본 all) 기준으로 다시 쓰고, 335행 동치는 --show-leak-kinds=all로 고친다.
2. 직접 만든 보고서 예시는 버전을 밝힌 실제 실행 출력으로 바꾸고, 형식이 실제와 다른 314~327행은 지운다.
3. ch02·LSan ch03과 겹치는 list/process_request 예제는 다른 사례로 바꾸거나, ch02의 still reachable 절을 이 글로 넘긴다.

### `valgrind/chapter04-helgrind-drd.md` — 55점, 우선 조치

confidence: 높음

factcheck: 오류 확인. DRD Manual(https://valgrind.org/docs/manual/drd-manual.html)을 curl로 받아 원문을 직접 확인했다. 매뉴얼 옵션 절은 `--shared-threshold=<n> [default: off]`를 "Print an error message if a reader lock has been held longer than the specified time (in milliseconds)"라고 설명한다. 그런데 이 글 256행은 같은 옵션을 "N 스레드 이상이 본 메모리만 검사"라고 설명한다. 실제로는 스레드 수로 거르는 옵션이 아니라, reader lock을 쥔 시간(ms)의 문턱값이다. 257행 `--exclusive-threshold`의 "(데드락 분석)"도 맞지 않는다. 매뉴얼은 두 옵션을 "detect excessive lock contention" 용도로 묶는다. git log(3232b1be 태그 통합, 0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그 등)는 일괄 정리 커밋뿐이고 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 도구 비교 표(19~27행), relaxed atomic 예(171~186행), spinlock ANNOTATE_* 예(357~371행), false positive 세 가지(410~441행)로 구성은 갖췄다. 다만 대부분 매뉴얼이나 입문 자료에 나오는 목록 수준이다. 22~27행의 '많음/적음', '조금 더 정확', '비슷'은 출처도 측정도 없는 평가다. 186행 '판단할 수 있습니다', 420행 '모를 수 있음', 433행 '못 알아볼 수 있습니다'는 구체 동작 대신 쓴 완곡 표현이라 일반론으로 본다. |
| B | 12 | 흐름은 끝까지 이어진다. 도구가 나뉜 이유(13~29행) → Helgrind(33~133행) → DRD(137~186행) → 동시 실행 불가(190~204행) → 비용(208~219행) → 옵션(223~257행) → pthread/condvar(261~329행) → lock-free(333~375행) → CI·TSan 분담(379~406행) → false positive(410~441행) → 정리(445~453행). 그러나 옵션 표 256~257행이 1차 자료와 어긋난다. 186행('Helgrind는 atomic이라 OK로 판단')과 351행('atomic 기반 동기화를 모름 → race 보고가 쏟아짐')도 서로 맞지 않아 B는 13 이하다. |
| C | 6 | 실행 명령(61·158·200~201행), 보고서 예(73~84행), CI 작업(383~396행)은 있다. 하지만 Valgrind 버전, OS, race.c 전체 소스가 없어 보고서를 재현할 수 없다. 210~217행 배율과 초 단위 수치는 출처도 측정 환경도 없어 C≤8 상한을 적용한다. 210행 '보통 20~50×'는 215행 Helgrind 30~100초(1초 기준이면 30~100×)와도 맞지 않는다. 결과가 맞는지 판정할 관찰 절차도 없다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter01-intro.md·chapter05-suppressions.md, 다른 시리즈 sanitizers/chapter04-tsan.md·gdb-lldb/chapter06-multithread-multiprocess.md. chapter01 118~123행('Helgrind: 락 오용에 강함, false positive 적음 / DRD: 메모리 적음 … / Helgrind를 먼저 시도')은 이 글 19~29행의 결론과 거의 같다. chapter05 385~397행의 helgrind CI 작업은 이 글 383~396행과 거의 같은 YAML이고, ch05에 timeout과 history-level만 더 붙어 있다. sanitizers/chapter04-tsan.md는 437행에서 이 글로 링크만 걸고, gdb-lldb ch06은 390~400행에 짧은 비교만 있다. 그래서 옵션 표, condvar·spinlock annotation, false positive 절은 이 글에만 있다. 10~14 구간 하단이다. |
| E | 7 | title '멀티스레드 레이스 진단'(2행)과 description '언제 무엇을'(5행)은 본문 19~29행 비교, 204행 교차 검증, 400~406행 TSan 분담에서 다룬다. 그러나 '진단'이라는 제목에 비해 race 보고를 해석해 원인을 좁히는 절차는 86~89행 세 줄뿐이다. description이 내세운 'Helgrind의 락 추적'(35~56행 lockset 설명)도 Helgrind Manual의 happens-before 설명과 다르다. |
| F | 7 | 457행 다음 장 안내는 seriesOrder 5인 chapter05-suppressions.md와 맞는다. 5편이 시리즈 마지막이라 '시리즈 마무리'라는 표현도 맞다. 467~470행 관련 항목의 대상을 모두 열어 제목을 대조했고 라벨이 다 맞았다. 402행 본문 TSan 링크도 맞다. 감점 요소는 다음과 같다. 전제 지식 안내가 없다. 141~151행 ASCII 다이어그램을 `text` 블록에 넣었다. std::atomic이 들어간 C++ 코드(337·357행)에 `c` 태그를 붙였다. audit:reading·모바일 확인도 하지 않았다. |
| G | 2 | 461~463·471행에 Helgrind·DRD 매뉴얼 링크가 있지만 글 끝 목록일 뿐이다. 본문 주장(22~27행 비교 표, 234~257행 옵션 표, 210행 비용)에 연결된 인용이 없고 Valgrind 버전도 없다. 463행은 '(논문)'이라고 라벨을 달았지만 실제로는 DRD 매뉴얼 intro로 연결된다. |

uncertainties:
- 21·35~56행은 Helgrind를 lockset 기반으로 설명한다. Helgrind Manual 원문은 happens-before 관계와 DAG만 설명하고 'lockset'이라는 말을 쓰지 않는다. 다만 54~56행이 말하는 결과(서로 다른 락이면 race 보고)는 happens-before에서도 같게 나와 오류 확인에 넣지 않았다.
- 186행과 351행이 Helgrind의 atomic 처리를 서로 반대로 말한다. 186행이 완곡 표현이라 오류 확인에서는 뺐다.
- 96~110행: 함수에서 unlock 없이 return하는 예에 'pthread_mutex_lock failed' 출력을 붙였다. Helgrind Manual 검출 목록은 'when a thread exits whilst still holding locked locks'와 'when a POSIX pthread function fails with an error code'를 따로 나눈다. 예시 출력이 어느 쪽 메시지인지 매뉴얼의 출력 예와 대조하지 못했다.
- 240행: Helgrind Manual상 `--check-stack-refs`의 기본값은 yes인데, 표의 `=no` 행에 '보통 켜 둠'이라고 적어 뜻이 모호하다. 230행 예시값 2000000은 기본값(1000000)이 아니다. 표가 이 값을 기본값이라고 적지는 않았다.
- 275행 pthread_join EINVAL 보고 문구가 Helgrind 실제 출력과 같은지 확인하지 못했다.
- 22행 'DRD 메모리 적음', 166행 'Helgrind가 OOM 날 때 DRD는 동작'의 근거를 DRD Manual에서 찾지 못했다.
- 210~217행 비용 배율은 출처가 없고, 210행과 215~216행 수치가 서로 맞지 않는다.

병합 대상: 병합 대상 없음. Helgrind·DRD 옵션 표, condvar·spinlock annotation, false positive 절은 이 글에만 있다. 판정은 오류 확인 때문에 우선 조치이고, 다음 조치는 보강이다. 256~257행 옵션 설명을 DRD Manual에 맞춰 고치고, 186·351행의 atomic 처리 서술을 하나로 맞춘다. ch01 118~123행·ch05 385~397행과 겹치는 결론·YAML은 한쪽만 남기고 링크로 바꾼다.

### `valgrind/chapter05-suppressions.md` — 65점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 모순(루브릭 3-1, AP-C-24 '내부 모순은 오류 확인으로 올린다'). 104행은 '패턴은 위에서 아래로 매칭(스택 안쪽이 위, 바깥쪽이 아래)'이라고 규칙을 밝힌다. 예 1의 패턴(130~132행)은 첫 줄이 `fun:malloc`, 그 아래가 `...`, 마지막이 `obj:*libcrypto*.so*`다. 104행 규칙대로면 malloc은 가장 안쪽 프레임에 고정되고, libcrypto는 malloc보다 바깥쪽(아래)이다. 그런데 136행은 '`malloc`이 어느 자리에 있든 그 위에 `libcrypto`가 끼어 있으면 무시'라고 설명한다. malloc 위치가 자유롭고 libcrypto가 malloc의 '위'(104행 정의로는 안쪽)에 있다는 말이다. 같은 글의 규칙·코드와 설명이 동시에 참일 수 없다. 외부 매뉴얼은 열지 않았다. git log(2750746a 최초 작성, 60ec7a24·f38a41a0 다이어그램·표, 400892d7 linter, ac24bb76 제목, be973200 topic, 07cc1988 관련 항목, 28524a9d 코드 블록 언어 태그, 0a9dd7bc slug 고정, 3232b1be 태그 정리)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 이 글 고유의 것은 다음과 같다. 117행 `...`(0개 이상)와 `fun:*`(정확히 한 프레임) 구분. 221~230행 너무 넓은 suppression(`...` + `fun:main`)이 우리 코드 누수까지 지우는 실패 예와 234~236행 세 원칙. 242~251행 OpenSSL 내부 세 프레임으로 좁힌 좋은 예. 324~333행 자리별 Sanitizer/Valgrind 분담표. 438~470행 재현 시간을 줄이는 네 전략. 다만 34~117행 문법은 Valgrind 매뉴얼 suppression 절을 정리한 수준이다. 20·24행 `OpenSSL_init`, 144행 `third_party_function`은 가상의 이름이라 직접 겪은 사례가 없다. 488행 'Sanitizer가 닿지 못하는 자리의 유일한 도구'는 근거 없는 단정이다. 앵커 part12-10(18)보다 고유 분석이 적어 13~19 구간 중간이다. |
| B | 13 | 필요성(13~28행) → 문법(32~117행) → 예 네 가지(121~174행) → 자동 생성(178~215행) → 위험(219~251행) → 통계(255~272행) → 기본 suppression(276~297행) → 분담(301~333행) → CI(337~430행) → 재현 축소(434~470행) → 마무리(474~501행)로 기본 흐름이 완성돼 10~15 구간이다. 235행 '테스트로 검증'에는 절차가 없다. 136행 설명이 104·130행과 모순되고, 270·272·88·112행의 정확성 불확실이 열려 있어 AP-C-24 규칙으로 B ≤ 13이다. |
| C | 8 | 그대로 돌릴 수 있는 명령(183·258~261·287·293~296행), GitHub Actions·GitLab CI YAML(341~398·409~428행), `--gen-suppressions=all` 출력 예(188~200행)가 있어 8~11 구간이다. 그러나 Valgrind 버전·배포판 같은 실행 환경이 없다(러너 이미지 ubuntu-22.04만 351·414행). 470행 '2~3× 추가 비용', 451행 '10MB 대신 100KB'는 출처·환경 없는 수치라 C ≤ 8 상한을 적용했다. 267행 통계 출력도 실제 실행 결과인지 표시가 없다. |
| D | 11 | 비교한 글: 같은 시리즈 chapter04-helgrind-drd.md(seriesOrder 4, 인접)·chapter02-memcheck.md·chapter01-intro.md, 다른 시리즈 sanitizers/chapter05-cmake-ci.md. 겹치는 곳은 네 군데다. (1) 385~397행 helgrind CI job과 305~320행 PR/야간 분담은 ch04 384~405행과 같다. (2) 178~200행 `--gen-suppressions=all` 템플릿 출력은 ch02 131~145행과 겹친다. (3) 324~333행 분담표는 ch01 42~50행 비교표와 같은 축을 반복한다. (4) sanitizers/chapter05-cmake-ci.md 485~505행은 Sanitizer만의 규모별 운영 모델이라 305~307행(PR=ASan+UBSan)과 결론 일부만 겹친다. suppression 문법·와일드카드·넓은 패턴의 위험(32~272행)은 이 글만 다루고, ch02 129행이 상세를 이 글로 넘기므로 시리즈 안 역할은 구별된다. |
| E | 8 | 제목 키워드(Suppression·실무 운용·노이즈 제거·CI 통합)와 description(5행)의 네 약속이 모두 이행된다. 문법은 32~117행, 외부 라이브러리 우회는 121~174행, Sanitizer와의 분담은 301~333행, CI 통합 실전은 337~430행이다. 범위 과장은 없다. 대상 독자·환경(Linux/glibc 등) 전제가 없고, '실무 운용'이라 했지만 실제 운영 사례가 없어 9점은 주지 않았다. |
| F | 7 | 마지막 편(seriesOrder 5, 디렉터리에 chapter01~05만 존재)이라 다음 편이 없다. 478~484행 시리즈 표가 실제 다섯 글과 맞고, 501행이 Sanitizer 시리즈로 다음 행동을 안내한다. 관련 항목 대상을 열어 대조했다. 511행 ch04, 512행 ch01, 513행 sanitizers/chapter05-cmake-ci, 514행 memory/chapter02-heaptrack, 516행 gdb-lldb/chapter01-intro-and-install, 303·501행 sanitizers/chapter01-intro 모두 라벨과 대상이 맞고 draft:false다. 48~117행 문법을 줄 단위 H3로 나누고 400~405행 '핵심' 불릿으로 YAML 옵션을 짚는 고유 구조가 있다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9점 이상은 주지 않았다. |
| G | 3 | 참고 자료(505~507행)와 515행이 Valgrind 매뉴얼의 suppression 형식 절(manual-core.suppress)과 Memcheck suppression 절로 연결돼 문법 주장과 이어진다. 그러나 본문 안에서 주장 옆에 붙은 출처는 없다. Valgrind·배포판·glibc 버전도 어디에도 없어, 281행 default.supp 경로와 170행 libpthread 패턴이 어느 환경 기준인지 알 수 없다. 4점 요건(버전·업데이트 상태)에 못 미친다. |

uncertainties:
- 136행 모순은 104행 규칙(위=안쪽)을 기준으로 판정했다. 136행의 '위'를 '호출자 쪽'이라는 일상 용법으로 읽으면 방향 모순은 약해진다. 하지만 '어느 자리에 있든'은 첫 줄이 `fun:malloc`으로 고정된 패턴과 여전히 맞지 않는다. 고칠 때 Valgrind 매뉴얼 suppression 절로 매칭 방향을 확인한다.
- 270행 'suppressed: 47 from 12 = 12종의 suppression이 47번 적용': 'from 12'가 suppression 개수인지 에러 context 개수인지 매뉴얼로 확인하지 않았다.
- 272행 '`--gen-suppressions=all`로 각 무시된 사례를 보고': 기억으로는 gen-suppressions는 억제되지 않은 에러에 템플릿을 붙이는 옵션이고, 적용된 suppression 목록은 `-v` 출력으로 본다. 1차 자료로 확인하지 않았다.
- 88행 'Memcheck:Leak만 별도 옵션을 받습니다': 기억으로는 Memcheck:Param도 추가 줄(시스템 호출 인자 이름)을 받는다. 확인하지 않았다.
- 112행 `fun:my_*_function`을 '정규식 모양'으로 설명하는데, 104행은 `*`·`?` 와일드카드만 지원한다고 적어 표현이 어긋나 보인다. 매뉴얼로 확인하지 않았다.
- 170행 `obj:/usr/lib/libpthread*.so*`: glibc 2.34 이후 libpthread가 libc에 합쳐져 최신 배포판에서는 맞지 않을 수 있다. 확인하지 않았다.
- 281행 `/usr/lib/valgrind/default.supp` 경로는 배포판마다 다를 수 있다(예: /usr/libexec/valgrind). 확인하지 않았다.
- 470행 '--track-origins 2~3× 추가 비용', 451행 '10MB 대신 100KB'는 출처·환경 없는 수치다.
- 357행 GitHub Actions에서 `apt-get update` 없이 `apt-get install`을 실행한다. 러너 상태에 따라 실패할 수 있다(점수 외).
- 506행 'Default Suppressions File' 링크(sourceware git의 glibc-2.X.supp)의 실제 경로·파일명을 열지 않았다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 1차 자료 대조 커밋 없음: 6편 모두 '검증됨'이 아니다. Valgrind 5편은 2750746a 한 커밋으로 작성된 뒤 다이어그램·린터·제목·관련 항목(07cc1988)·코드 블록 언어(28524a9d)·slug(0a9dd7bc)·태그(3232b1be) 일괄 정리 커밋만 있다. sanitizers ch05도 bda66c51 재작성 뒤 같은 일괄 정리 커밋만 있다. 그 사이 6편 모두 오류 확인이 나왔다. 4편(sanitizers ch05, valgrind ch01·ch02·ch05)은 원문 내부 모순이고, 2편(valgrind ch03·ch04)은 매뉴얼 대조 결과다.
- 본문 1차 출처·버전 표기 부재: 6편 모두 G가 2~3이다. 출처는 글 끝 매뉴얼 목차 링크에만 있고 개별 주장과 연결되지 않는다(sanitizers ch05 546~550행, valgrind ch01 257~259행, ch02 393~395행, ch03 419~420·428행, ch04 461~463·471행, ch05 505~507·515행). Valgrind 버전은 ch01 165·228행에만 있는데, 그마저 3.18.1과 3.22.0으로 갈린다. 링크 라벨이 대상과 다른 것도 있다(sanitizers ch05 547행 Clang 링크, valgrind ch04 463행 '(논문)').
- 출처·환경 없는 배율·시간 수치: 다음 글에 반복된다. sanitizers ch05 303·454·491·499행, valgrind ch01 45·245행('2~3×', '10~50×'), ch02 95·328·340·218행, ch04 210~217행, ch05 451·470행, sanitizers/chapter01 39~41행. 이 때문에 C ≤ 8 상한이 6편 모두에 걸렸다. 배율 하나를 1차 자료로 확인해 같은 출처를 다는 것이 효율적이다.
- 직접 만든 예시 출력: valgrind ch01 163~183행, ch02 86~91·303~307행, ch03 31~35·84~92·314~327·337~342행, ch04 73~84·96~110행, ch05 188~200·267행의 출력에 버전·환경이 없다. 코드 줄 번호와 대응하지 않는 출력(ch01 175행, ch02 88·305행)과 실제 형식이 아닌 출력(ch03 314~327행)도 있다. '40 bytes in 1 blocks are definitely lost'와 0x483977F/0x10918A 주소는 ch01 173~180행과 ch03 여러 곳에 반복된다. C가 6~8에 묶인 공통 원인이다.
- 시리즈 안팎 내용 중복:
  - 네 분류·still reachable: valgrind ch01 185~190행, ch02 249~266행, ch03 29~221행.
  - --gen-suppressions 템플릿: ch02 131~152행, ch05 178~200행.
  - 속도 팁: ch02 337~342행, ch05 434~472행.
  - Helgrind/DRD 결론: ch01 118~123행, ch04 19~29행.
  - helgrind CI YAML: ch04 383~396행, ch05 385~397행.
  - Sanitizer·Valgrind 비교표: ch01 43~53행, ch05 324~333행, sanitizers/chapter01 204~218행.
  - 다른 시리즈와의 중복: sanitizers ch05와 cmake/chapter04·chapter09의 preset, Valgrind ch03과 sanitizers/chapter03-lsan-leaks의 list/process_request 예제.

  D가 10~11에 묶인 원인이다. 정본을 정하고 나머지는 링크로 바꿀 후보다.
- 시리즈 사이 서술 불일치(다른 글과의 모순이라 오류 확인은 아님): '외부 .so 라이브러리' 행이 valgrind ch01 48행에서는 '계측 안 됨 → 부분 검사'인데 sanitizers/chapter01 215행에서는 '동작 (재컴파일 불필요)'이다. 초기화 안 된 메모리 탐지를 'Valgrind만의 강점'으로 쓰면서 MSan이 잡는다고도 적는 문구는 valgrind ch01 50·91·132행과 ch02 22·24행에 반복된다. 1차 자료로 정본을 정한다.

## 다음 조치

- 우선 조치(6편, 오류 확인). 고칠 순서는 1차 자료로 확인된 오류부터다.
  1. valgrind ch04 256~257행: --shared-threshold·--exclusive-threshold 설명을 DRD Manual에 맞춘다.
  2. valgrind ch03 295·298행: --leak-resolution 기본값을 high로 고친다. 335행 동치는 --show-leak-kinds=all로 고치고, 112~151·240·407행 possibly lost 설명은 heuristics 기준으로 다시 쓴다.
  3. 원문 내부 모순 4건:
     - sanitizers ch05 19행 `-DENABLE_SANITIZERS=ON`
     - valgrind ch01 50·132행 MSan 서술
     - valgrind ch02 295·310행 Invalid read/write와 'N bytes after'
     - valgrind ch05 104·130~132·136행 매칭 방향
- 같은 수정에서 함께 고칠 것: sanitizers ch05 149·153행 CMake 3.25 요구 버전 표기와 GitLab·매트릭스 job의 컴파일러·ninja 설치 단계, valgrind ch01 141행 '다섯 줄'과 165·228행 버전 불일치, valgrind ch02 description의 error-limit, valgrind ch04 463행 '(논문)' 라벨과 337·357행 `c` 태그.
- 점수 구간 기준 후속 조치: valgrind ch01(허브)·ch02·ch03·ch04는 병합 대상 없이 보강한다. 겹치는 절은 위 '시리즈 안팎 내용 중복'의 정본 결정에 따라 링크로 줄인다. sanitizers ch05·valgrind ch05는 보강 구간이다.
- Valgrind 시리즈 5편과 Sanitizers ch05를 `/fact-check-round` 대상으로 올린다. 옵션 기본값·출력 형식·배율 수치는 Valgrind·CMake 매뉴얼과 실제 실행 출력으로 검산하고, 확인된 오류 문자열은 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이 루프로 406편 계획의 점수화가 끝났다. 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
