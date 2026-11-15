# Sanitizers 수정 루프 — 2026-10-22

기존 공개 5편의 원문과 published-loop-40·41 지적을 대조했다. 점수·판정·factcheck는 수정하지 않는다. 체크한 오류의 처분은 수정(remediated)이며 실행 범위는 아래와 같다.

## 결정 근거와 경계

1. 맥락·범위: 도구 선택, 메모리/스레드 진단, CMake/CI 안내 5편이다. 독자가 옵션을 그대로 실행했을 때의 동작을 기준으로 확인했다.
2. 신호·반증: atomic 동기화가 있는 예제를 레이스로 표시하거나, 링크 실패를 빌드 성공으로 설명하거나, 미지원 요청을 조용히 해제하면 설명과 동작이 어긋난다. 단순한 무경고 실행은 안전성 증명이 아니다.
3. 원인·대안: 검사 계열·플랫폼·기본값 혼동 및 검증 없는 배율·출력 단정이었다. 전면 삭제 대신 조건과 실패 경로를 바로잡고 최소 실행 예제를 넣었다.
4. 증거: 공식 Clang 문서·C++ draft·설치된 lsan_interface.h, 기사 명명 블록 추출 실행기, 정상/실패 로그다. 단일 점수로 결정하지 않는다.
5. 표본: macOS arm64, Homebrew Clang 23.1.3, CMake 4.4.4, Ninja. Apple Clang·GCC·Linux·Windows 실행을 대체하지 않는다. 외부 CI job과 MSan 종속 라이브러리 전체 실행은 미검증이다.
6. 결정: 아래 확인 오류를 수정했다. LSan·TSan은 실제 런타임을 실행했으며 프로세스 기동 성공만 확인한 것이 아니다. 출력 위치의 symbolization은 일부 실패했으므로 정확한 파일/줄 검증을 주장하지 않는다.
7. 변경·롤백: 해당 5편 본문·명명 예제·검증기·수정 기록만 대상으로 한다. frontmatter와 기존 URL/공개 상태를 보존한다. 사용자 기존 변경·점수 파일은 롤백 범위가 아니다.
8. 잔여 위험: 각 예제 변경 시 정상·실패 분기를 재실행한다. 지원 버전·실기·원격 CI·MSan·deadlock 검사·suppression의 실제 적용은 아래 실행 목록에 없는 경우 문서 대조 범위다.

| 장 | 확인 문제·수정 | 실제 검증 |
| --- | --- | --- |
| 01 intro | 기본 seq_cst store/load 예제를 잘못 레이스라고 한 표시 정정. LSan reachability·MSan 지원·모든 오류 검출·배율 단정 정리 | publication.cpp를 TSan으로 빌드·실행, data=42와 무경고 정상 종료 |
| 02 ASan/UBSan | 누락 링크 플래그 결과, ASan halt 기본값, frame pointer 보장, O0 오탐 단정, suppression 분리·vector annotation·시그널 탐지 한계 정정 | bounds 정상 value=42/heap-buffer-overflow 실패, 계측 오브젝트 런타임 누락 링크 실패, UBSan 기본 복구(continued)/halt 중단, trap 무진단 SIGTRAP |
| 03 LSan | 살아 있는 모든 할당이라는 설명, 플랫폼·suppression 정규식, 이중 실행 루프, recoverable 반환값, static string/가상 소멸자/no_sanitize 설명 정정 | 별도 leak 런타임으로 reachable=0 after=1, direct/indirect 총88바이트 보고. free 분기 reachable=0 after=0. recoverable 보고 후 정상 반환 |
| 04 TSan | relaxed 실제 레이스를 오탐으로 분류한 제목, const 게시·mutex/atomic 동기화 조건, signal lock-free 조건, deadlock 검사 범위 정정 | 기본 relaxed 분기 data race·비정상 종료, SAFE release/acquire 분기 data=42·무경고 정상 종료 |
| 05 CMake/CI | ENABLE_SANITIZERS/ENABLE_ASAN 불일치, preset v6 최소3.25, 미지원 요청 silent skip, 정적 라이브러리 런타임 전파, Ubuntu 패키지·러너 매트릭스·미측정 시간 정정 | release/ASan+UBSan/TSan+UBSan 구성·빌드·CTest, 두 검사 동시 요청 실패, macOS MSan 요청 실패, 정적 라이브러리만 계측한 소비자 링크·CTest |

04 첫 예제에서는 producer가 consumer 생성 전에 끝나 경고가 관찰되지 않았다. consumer 시작 신호를 추가해 두 스레드의 생존 구간을 겹치게 한 뒤 재실행하여 실제 data race를 확인했다. 신호는 consumer→producer 방향이며 data 전달의 producer→consumer 동기화를 대신하지 않는다. 이 차이는 동적 실행의 표본 한계를 보여 주며 실패한 검사를 통과로 덮지 않았다.

03에서 런타임의 atos symbolization 경고가 있었지만 direct/indirect 보고와 반환값은 확인됐다. 정확한 소스 줄 출력까지 검증 완료로 표시하지 않는다.

## 재현과 출처

`node scripts/verify-sanitizer-article-examples.mjs NN` (01~05). 필요 시 SAN_CXX로 설치된 compiler를 지정한다. 각 장 `sanitizers-chNN-examples.log`에 명령·종료 상태·시그널을 보존한다. 기사 블록을 직접 추출하며 임시 디렉터리에서 실행한다.

- [ASan](https://clang.llvm.org/docs/AddressSanitizer.html), [UBSan](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html), [LSan](https://clang.llvm.org/docs/LeakSanitizer.html), [TSan](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [C++ atomic order](https://eel.is/c++draft/atomics.order), [signal-safe atomic](https://eel.is/c++draft/support.signal)
- [libstdc++ vector 계측](https://gcc.gnu.org/onlinedocs/libstdc++/manual/debug.html), [TSan suppression 구현](https://raw.githubusercontent.com/llvm/llvm-project/main/compiler-rt/lib/tsan/rtl/tsan_suppressions.cpp)
- [CMake preset](https://cmake.org/cmake/help/v3.25/manual/cmake-presets.7.html)

최종 gate·빌드·앵커·읽기·점수 보존 결과는 이번 연속 수정 종료 시 덧붙인다. 문서 점수를 높였다는 판정은 하지 않는다.


[최종 공통 검증](repair-loops-final-2026-10-22.md)에서 최종 사이트 빌드·gate·앵커·읽기·메타데이터·점수 보존 검사를 확인한다.
