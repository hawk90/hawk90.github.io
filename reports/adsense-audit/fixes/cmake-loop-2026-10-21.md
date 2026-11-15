# CMake 수정 루프 — 2026-10-21

범위는 기존 공개 CMake 글이다. 한 장의 원문·지적 근거 확인, 수정, 정상·실패 사례 실행, 대상 gate 검사를 마친 뒤 다음 장을 진행한다. 점수·판정·factcheck는 갱신하지 않는다. 2장의 앞선 수정은 [별도 기록](cmake-chapter02-language-2026-10-21.md)을 따른다.

## 공통 결정·검증 범위

- 원인: 명령의 기본 동작과 조건부 동작을 혼동하고, 실행할 소스·환경 없이 성공이나 실패를 단정한 설명이 있었다. 기존 [루프 09](../published-loop-09.md)의 오류·uncertainties를 시작점으로 원문 전체를 읽었다.
- 대안: 잘못된 문장만 완곡하게 바꾸는 대신 공식 문서로 동작을 정정하고, 독자가 실제 동작을 확인할 수 있는 최소 예제를 추가했다. 기존 글의 URL·frontmatter·공개 상태를 보존하고 다른 시리즈의 글을 병합하거나 삭제하지 않았다.
- 표본: CMake/CTest 4.4.4, Ninja 1.13.2, macOS, C++ 예제는 AppleClang 21. 기사에 파일명으로 표시한 코드 블록을 직접 추출한다. 정상 동작 외에 설정 누락·실패 분기를 포함한다.
- 검증 도구: `node scripts/verify-cmake-article-examples.mjs NN`. 실행 결과가 예상과 다르거나 실패 원인이 다르면 중단한다. 대상 글별 publish gate도 실행한다. 외부 clone 없는 cited-symbol은 SKIPPED로 남기며 성공으로 세지 않는다.
- 한계: 이전 CMake·다른 OS·MSVC·실기 배포를 전수 검증한 기록이 아니다. 네트워크가 필요한 제3자 라이브러리 예제는 다운로드 성공을 주장하지 않는다. 원격 체크섬을 만들어 넣지 않는다.
- 롤백: 해당 글 본문, 검증 스크립트의 해당 장 분기, 해당 수정 기록으로 제한한다. 사용자 기존 변경과 점수 파일을 수정 루프의 롤백 대상으로 삼지 않는다.

## 장별 처리

| 장·대상 파일 | 문제와 반증 조건 | 수정 결정 | 실행 증거·한계 | 다음 상태 |
| --- | --- | --- | --- | --- |
| 01 `chapter01-intro.md` | 생성기 변경 시 같은 캐시 디렉터리 재사용, 근거 없는 Ninja 2~3배 성능·직렬 Make 설명, 표준 기능의 플래그 강제 설명 | 첫 C++ 프로젝트와 최소 정책 버전 정리. 생성기별 빌드 디렉터리 분리, 실제 실행 환경·출력 제공, Kitware 공식 설치 안내 연결 | Ninja/Unix Makefiles 각각 Hello 출력, 생성기 혼용 실패, 빌드 중 자동 재구성 확인. OS 설치 명령 자체는 실행하지 않음 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 03 `chapter03-targets.md` | plain 링크 서명 자체가 오류라는 설명. plain만 써도 실패하면 기존 설명이 맞음 | plain/키워드 혼용 오류와 구분. INTERFACE·IMPORTED/ALIAS 범위·EXCLUDE_FROM_ALL·정적 링크 예외를 정정하고 중복 예제 정리 | 정상 빌드 sum=5, 공개 경로 PRIVATE 시 헤더 탐색 실패, 매크로 PRIVATE 시 전처리 검사 실패, plain 서명 성공, 혼용 시 구성 실패. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 04 `chapter04-options.md` | cmakedefine01/OFF가 undef라는 출력, yes 거부, STRINGS 강제 검증 설명 | 0/1 헤더 생성·일반 cmakedefine 규칙 정정. CMP0077 상태·GUI 후보와 검증 구분, sanitizer의 컴파일러 조건과 preset 최소 버전 명시 | OFF/cpu→ON/gpu 빌드·실행, 재구성 캐시 보존, 잘못된 backend 실패, yes 허용·CMP0077 NEW 일반 변수 보존 확인. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 05 `chapter05-find-package.md` | 기본 Config-first 설명. 두 방식이 있을 때 Config가 기본 선택되면 기존 설명이 맞음 | Module-first·prefer-config·강제 모드를 구분. CMake 변수와 환경 변수의 경로 구분자, FetchContent/ExternalProject 경계와 미검증 hash 정리 | 로컬 Module/config/강제 config 각 빌드·실행, CONFIG 강제 상태에서 Config 부재 실패, 로컬 FetchContent 타겟 연결 확인. 원격 다운로드는 미실행. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 06 `chapter06-testing.md` | DEPENDS를 선행 성공 조건으로 설명. 선행 실패가 후속 실행을 막으면 기존 설명이 맞음 | 순서 의존과 fixture 성공 의존을 구분. timeout·반복 옵션·SECTION 발견·하위 테스트 탐색과 위험한 signed overflow 예제 정리 | 순서 테스트의 선행 실패 후 후속 실행, fixture 정상 통과, setup 실패 시 본문 Not Run/cleanup 실행 확인. 제3자 테스트 프레임워크는 실행 범위 밖. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 07 `chapter07-install.md` | Config가 ConfigVersion을 include한다는 설명, INCLUDES DESTINATION 필수 단정, SameMajorVersion 조건 누락 | 버전 선검사→Config→Targets 흐름, 요청 이상 버전 조건, INSTALL_INTERFACE 대안과 컴포넌트별 설치 범위 정정 | 생산자 빌드·임시 설치, 별도 소비자 answer=42, prefix 이동 후 재링크·실행, 1.9 요청 거절, TGZ의 헤더·아카이브·Config/Version/Targets 포함 확인. OS별 패키저는 미실행. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 08 `chapter08-best-practices.md` | 최소 3.20 템플릿에서 3.21 도입 PROJECT_IS_TOP_LEVEL 사용, 분리되지 않은 genex 옵션, FORCE를 격리로 설명 | 최소 3.25 계약으로 정리, 경고 옵션 타겟 실행 예제 제공, GLOB의 미검증 인용·특정 생성기 단정 제거, toolchain 기능 검사와 cache 범위 정정 | 단독 top/tests=ON, 서브프로젝트 기본 OFF와 명시 ON, 세 구성의 빌드와 테스트 등록·실행 확인. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |
| 09 `chapter09-modern-advanced.md` | UserPresets가 공유 프리셋을 덮어쓴다는 설명, ALL이면 출력 강제 재생성, PCH 목록 전파와 산출물 공유 혼동 | 고유 이름+상속, OUTPUT 의존성·VERBATIM·생성 스크립트 경로 정리, FILE_SET 설치 규칙·PCH REUSE_FROM 조건 명시, 미측정 성능 수치 제거 | 최초 생성·무변경 재빌드 미실행·입력 변경 재생성/출력 2.0.0, ping 두 번 실행, 개인 Release 상속 빌드, 중복 preset 거절 확인. PCH 성능/재사용은 문서 대조만 수행. gate 통과 | 수정·예제·gate·최종 사이트 빌드 확인 |

## 1차 자료

- [target_link_libraries](https://cmake.org/cmake/help/v4.4/command/target_link_libraries.html), [add_library](https://cmake.org/cmake/help/v4.4/command/add_library.html), [EXCLUDE_FROM_ALL](https://cmake.org/cmake/help/v4.4/prop_dir/EXCLUDE_FROM_ALL.html)
- [configure_file](https://cmake.org/cmake/help/v4.4/command/configure_file.html), [option](https://cmake.org/cmake/help/v4.4/command/option.html), [CMP0077](https://cmake.org/cmake/help/v4.4/policy/CMP0077.html)
- [find_package](https://cmake.org/cmake/help/v4.4/command/find_package.html), [FetchContent](https://cmake.org/cmake/help/v4.4/module/FetchContent.html)
- [DEPENDS](https://cmake.org/cmake/help/v4.4/prop_test/DEPENDS.html), [FIXTURES_REQUIRED](https://cmake.org/cmake/help/v4.4/prop_test/FIXTURES_REQUIRED.html), [TIMEOUT](https://cmake.org/cmake/help/v4.4/prop_test/TIMEOUT.html). Web에서 열리지 않은 페이지는 설치된 동일 버전의 `cmake --help-property`/`--help-policy`로 대조한다.
- [CMakePackageConfigHelpers](https://cmake.org/cmake/help/v4.4/module/CMakePackageConfigHelpers.html), [패키지 버전·레지스트리](https://cmake.org/cmake/help/v4.4/manual/cmake-packages.7.html), [install](https://cmake.org/cmake/help/v4.4/command/install.html)
- [PROJECT_IS_TOP_LEVEL](https://cmake.org/cmake/help/v4.4/variable/PROJECT_IS_TOP_LEVEL.html) — 동일 버전 로컬 도움말에서 3.21 도입 확인. [file](https://cmake.org/cmake/help/v4.4/command/file.html), [Presets](https://cmake.org/cmake/help/v4.4/manual/cmake-presets.7.html), [PCH](https://cmake.org/cmake/help/v4.4/command/target_precompile_headers.html), [커스텀 출력 규칙](https://cmake.org/cmake/help/v4.4/command/add_custom_command.html)
- Catch2 v3.5.0 [발견 구현](https://raw.githubusercontent.com/catchorg/Catch2/v3.5.0/extras/CatchAddTests.cmake): `--list-tests --verbosity quiet` 결과를 add_test로 등록하므로 SECTION 별도 등록 설명을 삭제했다. 프레임워크 실행 검증을 대체하는 근거로 쓰지 않는다.

## 실행 로그

장별 `cmake-chNN-examples.log`와 `cmake-chNN-gate.log`를 이 폴더에 보존한다. 전체 사이트 빌드와 frontmatter/점수 보존 검사는 마지막 변경 후 한 번 수행하고 결과를 덧붙인다.

## 최종 확인

- CMake 9편: 앞선 2장 1편과 이번 1·3~9장 8편을 합친 수정 범위다. 최종 원문의 명명된 예제를 01→09 순서로 실행했고 모두 exit 0이었다. 실패를 기대한 사례는 각 검사기에서 비정상 종료와 원인 메시지를 확인했다.
- 전체 CMake 디렉터리 publish gate: 차단 항목 통과. cited-symbol만 외부 clone 부재로 SKIPPED다.
- `npm run build`: exit 0, 1,135페이지 생성.
- `node scripts/audit-anchor-links.mjs`: exit 0. 새 링크와 삭제·변경한 절의 앵커도 빌드된 HTML 기준으로 검사했다.
- `node scripts/audit-reading-experience.mjs --quiet`: exit 0. 기계적 읽기 검사이며 모바일 육안 확인은 아니다.
- `check-inline-math` 9편 및 `git diff --check`: 통과.
- 9편의 frontmatter는 HEAD와 동일하다. 평가 기준 source SHA와 수정 전 HEAD 원문이 일치하며 수정 후 SHA는 [JSON](cmake-loop-2026-10-21.json)에 기록했다. 점수 데이터와 판정은 보존했고 재채점하지 않았다.
- 이번 루프의 체크 항목 처분은 수정(remediated)이다. 문서 대조만 수행한 PCH·제3자 프레임워크·다른 OS의 실행 여부까지 검증 완료로 바꾸지 않는다. 향후 해당 예제 변경 시 정상/실패 사례를 재실행한다.

[최종 gate](cmake-loop-gate-2026-10-21.log) · [사이트 빌드](cmake-loop-build-2026-10-21.log) · [앵커 검사](cmake-loop-anchors-2026-10-21.log) · [읽기 검사](cmake-loop-reading-2026-10-21.log)
