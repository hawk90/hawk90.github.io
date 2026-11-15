# Embedded C++ 기초 확인 오류 수정 — 2026-10-22

전체 시리즈 41편 중 published-loop-12가 확인한 part1-02·03의 오류를 우선 수정했다. 두 편의 전문을 읽고 고쳤으며 전체 시리즈 완료를 뜻하지 않는다. 점수·판정·factcheck는 갱신하지 않는다.

## 결정 근거와 경계

1. 맥락: 컴파일러 옵션과 최소 런타임을 firmware에 적용하는 공개 C++ 글 2편이다.
2. 신호·반증: throw 코드를 예외 비활성 상태로 성공 측정했다고 한 표, 소멸자 등록 방식 옵션을 등록 제거로 설명한 문장, 32-bit 헬퍼를 long long용이라 한 설명은 실제 컴파일·심볼/타입과 대조할 수 있다. 보드별 크기 차이는 조건 없는 숫자만으로 오류 판정하지 않고 재현 불가 수치를 제거한다.
3. 원인·대안: 언어 기능 금지·코드 생성·라이브러리 정책을 혼동하고 없는 보드 실측 결과를 단정했다. 기능을 모두 끄는 템플릿 대신 동시 초기화·ABI·종료 정책을 확인하고 실제 참조 심볼을 읽도록 고쳤다.
4. 증거: GCC 공식 옵션과 newlib syscall 문서, Clang 23.1.3의 ELF/ARM 오브젝트·미정의 심볼, 네이티브 UBSan 경계 검사다. 점수나 가짜 STM32 크기 표에 의존하지 않는다.
5. 표본: macOS arm64 호스트, x86-64 Linux ELF와 ARM Cortex-M0 오브젝트, 네이티브 heap 계산 프로그램이다. GCC 자체나 newlib 전체·STM32 실행은 미검증이다.
6. 결정: 아래 설명 오류를 수정(remediated)했다. 안전한 보드 런타임 구현·전체 firmware 크기를 완성했다고 주장하지 않는다.
7. 경계·롤백: 두 글 본문·명명 예제·검증기·수정 기록이다. frontmatter와 공개 URL을 보존한다. 다른 장과 사용자 기존 변경·점수 파일은 롤백 대상이 아니다.
8. 잔여 위험: 실제 target 라이브러리의 no-exception 모드·정렬·allocator lock·startup·링커 스크립트·RTOS/ISR 동시 초기화는 해당 환경에서 별도 검증한다. 옵션이나 예제 변경 시 아래 실패/정상 사례를 다시 실행한다.

| 글 | 수정 | 실행 증거 |
| --- | --- | --- |
| part1-02 compiler-flags | no-exception throw 성공 크기 표 제거, at() 경로와 라이브러리 설정 구분, RTTI downcast/upcast 구분, 상수 static vs 동적 guard·단일 코어 선점 조건, no-use-cxa-atexit 등록 방식, 임의 KB·배율·unwind 전체 제거 단정 정정 | no-rtti upcast 성공/downcast 원인 메시지로 실패, no-exceptions throw 실패, 동적 초기화의 guard 심볼/비활성 구성의 guard 부재, 기본 __cxa_atexit와 반대 옵션 atexit 심볼 확인 |
| part1-03 runtime-requirements | SI/DI 정수 헬퍼, FPU 없는 MCU에 hard-float 제안, 네 라이브러리 고정·startup 전 객체 금지·가짜 syscall 성공·무경계 sbrk·picolibc/GCC 기본값·임의 비교 수치 정정 | ARM long=4/long long=8 static_assert, Cortex-M0 오브젝트의 __aeabi_uidiv/uldivmod/fmul 참조 확인. 네이티브 reserve 계산을 UBSan으로 실행해 증가/축소/상·하한/ptrdiff_t 최소값 검사 |

힙 예제는 newlib _sbrk의 직접 ABI 구현이 아니라 경계 계산을 분리한 진단 코드다. 실패 nullptr를 실제 포트의 (void*)-1/errno와 혼동하지 않도록 본문에 명시했다. 이 프로그램에서 mutex나 allocator를 구현한 것은 아니다.

`node scripts/verify-embedded-cpp-basics-examples.mjs 02`·`03`의 로그를 embedded-cpp-basics-NN-examples.log로 보존했다. 컴파일러·타깃·옵션과 성공/실패 원인을 함께 남긴다.

## 1차 자료

- [GCC C++ Dialect Options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html): RTTI·threadsafe static·cxa_atexit 선택
- [newlib syscall 인터페이스](https://sourceware.org/newlib/libc.html#Syscalls)
- [GCC udivmodsi4 구현](https://raw.githubusercontent.com/gcc-mirror/gcc/master/libgcc/udivmodsi4.c): ARM 조건에서의 SI/DI 폭은 이번 cross compile로 추가 확인

picolibc 공식 사이트는 접근에 실패했으므로 해당 사이트의 최신 현황을 검증했다고 기록하지 않았다. 근거 없는 유지보수·기본 채택 주장을 삭제하고 타깃 배포 구성을 확인하도록 바꿨다. 최종 gate·사이트·점수 보존은 공통 종료 기록을 따른다.


[최종 공통 검증](repair-loops-final-2026-10-22.md)에서 최종 사이트 빌드·gate·앵커·읽기·메타데이터·점수 보존 검사를 확인한다.
