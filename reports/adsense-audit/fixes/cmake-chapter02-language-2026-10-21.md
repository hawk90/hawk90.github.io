# CMake 2장 수정·검증 기록 — 2026-10-21

- 대상: `src/content/blog/tools/build/cmake/chapter02-language.md`
- 발생 맥락: 공개된 언어 입문 글에서 경로 순회·조건 분기·구성별 정의를 따라 하는 독자가 실제와 다른 결과를 예상하게 됨.
- 기존 지적: [published-loop-08.md](../published-loop-08.md)의 CMake 2장. 평가 기준 원문 HEAD `d55f8d66`.
- 결정: 한 편의 오류와 같은 원인에서 파생된 설명을 수정하고, 본문 예제를 실제 실행한다. 점수·판정·factcheck의 재평가는 수행하지 않았다.

## 문제와 수정 근거

| ID | 문제 신호·반증 조건 | 원인과 수정 | 근거·실행 확인 |
| --- | --- | --- | --- |
| CM02-01 | 공백 포함 경로가 두 요소로 나뉜다는 주석. 실제 두 번 순회하면 기존 설명이 맞음 | 소스의 공백 구분과 변수 확장 후 리스트 분리를 혼동. 공백 보존 예제로 수정하고 세미콜론 리스트와 대조 | `language-check.cmake`의 path 한 줄, PATHS 길이 2. [명령 인자](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html#command-arguments) |
| CM02-02 | 비어 있지 않으면 참이라는 설명. OFF도 참이면 기존 설명이 맞음 | false 상수 규칙 누락. 불리언·존재·문자열 비교를 구분 | OFF/빈 값=false, SOME_VALUE=true. [if 기본 조건](https://cmake.org/cmake/help/v4.4/command/if.html#basic-expressions) |
| CM02-03 | if(VAR)의 연쇄 역참조 설명. SOME_VALUE=OFF가 if(VAR)에도 영향을 주면 기존 설명이 맞음 | 명령 인자 확장과 if 자체 평가를 혼동. if(VAR)와 if(${VAR})를 대조 | VAR=true, expanded=false 출력 |
| CM02-04 | CMP0135를 URL_HASH 경고 해소 기능으로 설명 | 해시 검증과 아카이브 timestamp 정책 혼동. 추출 시각 OLD/NEW와 적용 조건으로 정정 | `cmake --help-policy CMP0135` 대조; 최소 버전 3.25에서 GET=NEW. [CMP0135](https://cmake.org/cmake/help/v4.4/policy/CMP0135.html) |
| CM02-05 | genex 평가 시점이 생성/빌드로 혼재, 공백이 들어간 옵션 식, 구성 간 동일 파일명 | 인자 파싱·생성·빌드의 단계 혼동. 식 전체 인용, 옵션을 세미콜론으로 분리, 출력 파일명을 구성별로 구분 | Ninja/Ninja Multi-Config 각각 Debug·Release 컴파일 및 실행. 생성 직후 config 파일 존재 확인. [genex](https://cmake.org/cmake/help/v4.4/manual/cmake-generator-expressions.7.html) |
| CM02-06 | 함수 스코프·캐시를 단순한 부모 계층으로 설명, macro 전체를 텍스트 치환이라고 설명 | 일반 변수 검색과 캐시 저장소, 매크로 인자 치환을 구분. block 스코프와 도입 버전 명시 | 함수의 외부 값 보존과 PARENT_SCOPE 반환 실행. [변수](https://cmake.org/cmake/help/v4.4/manual/cmake-language.7.html#variables), [macro](https://cmake.org/cmake/help/v4.4/command/macro.html#macro-vs-function) |
| CM02-07 | 문자열 비교 출력 TRUE, Linux 분기에 UNIX, Debug 심볼 추가라는 로그 | 실제 값/조건/동작과 라벨 불일치. 1 출력, Linux 조건, 매크로 정의 로그로 정정. 근거 없는 -Weverything 권고 제거 | equal=1 실행 확인; 플랫폼·경고 옵션은 코드 대조. Linux/MSVC 실행을 주장하지 않음 |
| CM02-08 | 버전 기준 혼재, 정리 뒤 정책 절, 근거 없는 90% 표현 | 실행 기준 4.4.4와 최소 정책 기준 3.25 구분. 정책·실행 예제 뒤에 정리 배치. 관련 주장에 버전 고정 공식 링크 추가 | frontmatter 동일 확인. 다음 장·관련 내부 링크 검사 통과 |

문구를 완곡하게 바꾸거나 경고만 숨기는 대안은 실제 동작과의 불일치를 해결하지 못하므로 선택하지 않았다. 장 전체를 다른 글로 병합하는 대신 기존 URL과 질문을 유지하면서 오류 원인과 실행 예제를 보강했다.

## 검증

실행 환경: macOS, CMake 4.4.4, Ninja 1.13.2, AppleClang 21.0.0.21000334. 표본은 본문에 추가한 세 파일과 오류 원인의 경계 사례다.

```bash
node scripts/verify-cmake-language-examples.mjs
bash scripts/audit-publish-gate.sh src/content/blog/tools/build/cmake/chapter02-language.md
node scripts/check-inline-math.mjs src/content/blog/tools/build/cmake/chapter02-language.md
npm run build
git diff --check
```

- 본문 파일명으로 표시된 코드 블록을 직접 추출해 실행했다. 복사한 별도 예제만 검사하지 않았다.
- 스크립트 출력 9줄 일치, 네 빌드 구성의 실행 출력 ON/OFF 일치, 빌드 전 생성 파일 확인: 통과.
- 빈 변수의 따옴표 없는 비교가 실패하는 부정 사례와 따옴표 있는 비교, 함수 지역 변수 격리·PARENT_SCOPE, 리스트 두 번 순회: 통과.
- 본문 및 실행 원본 로그: [예제 실행 로그](cmake-chapter02-language-2026-10-21-examples.log).
- 대상 글 통합 gate: 차단 항목 통과. upstream 인용 심볼 검사는 기존 외부 clone 부재로 SKIPPED이며 이 항목의 성공을 주장하지 않는다.
- 의도하지 않은 인라인 수식 및 diff 공백 검사: 통과.
- 사이트 빌드: 통과. `npm run build` exit 0, 1,135페이지 생성. 생성된 대상 글 HTML에 실행 예제 절과 출력이 포함됨을 확인했다. 모바일 육안 검사는 수행하지 않았다.

## 범위·잔여 확인

공개 상태·URL·날짜·seriesOrder를 포함한 frontmatter는 보존했다. 평가표와 점수 데이터도 변경하지 않았다. 롤백 경계는 이 글 본문, 예제 검증 스크립트, 이 수정 기록이다.

Windows/MSVC, Visual Studio/Xcode 생성기, GCC/Linux, CMake 이전 버전은 실행하지 않았다. HTTP 아카이브를 다운로드해 CMP0135의 재빌드 동작을 비교한 것은 아니며 정책 문서와 로컬 도움말로 의미를 대조했다. 글 안의 모든 코드 조각을 독립 프로젝트로 실행한 것은 아니다. 다음 작업은 CMake 3장의 확인 오류를 1차 자료와 원문으로 대조하는 것이며, 이 글은 플랫폼·버전별 동작을 바꾸는 후속 수정이 있을 때 해당 예제를 재실행한다.
