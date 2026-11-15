# 연속 수정 4개 루프 최종 확인 — 2026-10-22

이번 범위는 Sanitizers 5편, Valgrind 5편, DWARF·ELF 6편, Embedded C++ part1-02·03 2편으로 **18편**이다. 앞선 21편과 합쳐 **39편 수정**이다. 전체 406편의 수정 완료나 점수 상승을 선언하지 않는다.

## 실행과 범위

- Sanitizers 01~05: 장별 예제 실행기 exit 0. 실제 ASan/UBSan/LSan/TSan 동작과 CMake/CTest를 확인했다. 정확한 실행 범위·실패 사례·symbolization 한계는 [기록](sanitizers-loop-2026-10-22.md)을 따른다.
- Valgrind 01~05: 명시적 --fixtures-only 실행기 exit 0. 정상 소스의 컴파일·실행만 확인했으며 **실제 Valgrind 분석은 NOT RUN**이다. 미지원 Mac에서 설치 성공이나 Linux 도구 보고를 만들어 기록하지 않았다. [기록](valgrind-loop-2026-10-22.md)
- DWARF·ELF 01~06: 장별 실행기 exit 0. ELF/DWARF 생성·파싱, ULEB128 부정 입력, line table 경계, typed operand, CFI 규칙, split/압축을 확인했다. 크로스 타깃 코드를 호스트에서 실행했다는 뜻은 아니다. [기록](dwarf-elf-loop-2026-10-22.md)
- Embedded C++ 02·03: 실행기 exit 0. 금지 코드 컴파일 실패·런타임 심볼·ARM 타입/헬퍼 참조·네이티브 UBSan 힙 경계를 확인했다. 실제 보드 firmware 링크·Flash 크기는 검증하지 않았다. [기록](embedded-cpp-basics-loop-2026-10-22.md)

장마다 원문 대조→수정→검증을 진행했다. 후속 장에서 앞선 주제의 반복 설명은 해당 정본으로 연결했다. 위 실행기 PASS를 원문 전체의 모든 구체 주장에 대한 검증 완료로 확대하지 않는다.

## 최종 공통 검사

| 검사 | 결과·증거 |
| --- | --- |
| Sanitizers publish gate | exit 0, [로그](sanitizers-loop-gate-2026-10-22.log) |
| Valgrind publish gate | exit 0, [로그](valgrind-loop-gate-2026-10-22.log) |
| DWARF·ELF 최종 publish gate | exit 0, [로그](dwarf-elf-loop-gate-2026-10-22.log) |
| Embedded C++ 두 파일 publish gate | exit 0, [로그](embedded-cpp-basics-loop-gate-2026-10-22.log) |
| 최종 npm run build | exit 0, 1,135페이지, [로그](repair-loops-build-2026-10-22.log) |
| 빌드 후 anchor links | exit 0, 67건 검사·0 finding, [로그](repair-loops-anchors-2026-10-22.log) |
| 빌드 후 reading --quiet | exit 0, 출력 없는 정상 종료, [로그](repair-loops-reading-2026-10-22.log) |
| 18편 inline math | 의도하지 않은 수식 없음, [로그](repair-loops-inline-2026-10-22.log) |
| git diff --check / 새 실행기 node --check | 통과 |

publish gate에서 외부 upstream clone이 없어 cited-symbol 검사는 SKIPPED다. 그 항목은 검증 통과가 아니다. reading은 기계적 검사이며 모바일 육안 확인이 아니다. 16편 완료 시 첫 빌드 이후 Embedded C++ 두 편을 추가해 최종 18편 내용으로 다시 빌드했고, 그 뒤 앵커·읽기 검사를 실행했다.

## 원문·점수 보존

- 18편의 frontmatter는 HEAD와 바이트 단위로 동일하다. 공개 URL·date·공개 상태를 변경하지 않았다.
- 18편 수정 전 SHA는 정본 점수 JSON의 sourceSha256과 모두 일치한다. 수정 후 SHA는 각 루프 JSON에 기록했다.
- 시작 전에 기록한 기존 점수 파일 44개 SHA와 최종 SHA가 모두 동일하다. 점수·판정·factcheck를 쓰거나 재계산하지 않았다. 사용자 작업으로 이미 수정된 평가 보고서·package.json·기존 수정 파일은 보존했다.
- [전후 무결성 기록](repair-loops-integrity-2026-10-22.json)은 실제 작업 시작 전 점수 스냅샷과 종료 스냅샷을 함께 보존한다. 앞선 10-21 종료 시점만 기록한 스냅샷과 구분한다.
- [Sanitizers 원문 SHA](sanitizers-loop-2026-10-22.json), [Valgrind 원문 SHA](valgrind-loop-2026-10-22.json), [DWARF·ELF 원문 SHA](dwarf-elf-loop-2026-10-22.json), [Embedded C++ 원문 SHA](embedded-cpp-basics-loop-2026-10-22.json)

pyelftools 0.32는 승인 후 임시 디렉터리에만 받았다. 기본 Python 환경·시스템 compiler를 설치/교체하지 않았다. Linux 도구 환경을 새로 만들거나 실제 CI에 작업을 전송하지 않았고 커밋·푸시도 수행하지 않았다.

## 남은 수정·검증

평가 대상 406편 중 이 수정 기록에 포함된 글은 39편, 미포함은 367편이다. 미포함이 모두 확정 오류라는 뜻은 아니다. Valgrind 5편·앞선 py-spy 1편의 실제 외부 도구 검증은 별도 대기 상태이며, debugpy IDE attach·원격 CI·실기 실행 등 각 기록의 잔여 항목도 유지한다.

다음 후보는 Embedded C++ part1-04~07의 코드 크기·메모리 배치·startup·링커 설명이다. 문서의 확인 오류와 실행 가능한 예제부터 자동 선정하고 재채점은 전체 수정 뒤에 진행한다. 정본 진행 상태는 [수정 진행표](../fix-progress.md)를 따른다.
