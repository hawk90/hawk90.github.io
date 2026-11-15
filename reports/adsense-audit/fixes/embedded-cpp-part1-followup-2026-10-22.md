# Embedded C++ Part 1 후속 수정 기록 (2026-10-22)

기존 평가 `published-loop-13.md`의 05~08편을 전문 대조하고 수정했습니다. 재채점·기존 점수·판정·factcheck 파일은 변경하지 않았습니다. URL·날짜·seriesOrder를 포함한 frontmatter 전체를 HEAD와 비교해 보존했습니다. 장별 SHA는 같은 이름의 JSON에 있습니다. `remediated`는 아래 본문 오류의 수정 상태이며 모든 제품 환경의 검증 완료를 뜻하지 않습니다.

공통 실행 환경은 macOS arm64, Homebrew Clang/LLVM 23.1.3입니다. 전용 검증기는 기사에 명명된 코드블록을 직접 추출합니다. 실제 host 프로그램 실행과 ARM Cortex-M4 Thumb ELF 오브젝트 검사를 구분합니다.

```bash
node scripts/verify-embedded-cpp-part1-followup-examples.mjs 05
node scripts/verify-embedded-cpp-part1-followup-examples.mjs 06
node scripts/verify-embedded-cpp-part1-followup-examples.mjs 07
node scripts/verify-embedded-cpp-part1-followup-examples.mjs 08
```

네 명령 exit 0, 장별 publish gate exit 0, inline math 4편 검사와 diff whitespace 검사 통과입니다. gate의 upstream cited-symbol 검사는 clone 부재로 SKIPPED이며 사실 검증 통과로 계산하지 않습니다. 전체 사이트 빌드·렌더 결과 검사는 parent가 통합 수행합니다.

## Part 1-05 ABI compatibility

1. **맥락·범위:** C HAL과 C++ application 사이의 linkage·handle·layout 경계. `part1-05-abi-compatibility.md` 한 편을 수정했습니다.
2. **신호·반증:** 불완전 타입 포인터를 C 컴파일 오류라고 한 설명, namespace 안 C linkage가 구현마다 다르다는 설명, FPU 존재만으로 hard-float ABI를 가정한 설명이 독자를 잘못된 수정으로 이끕니다. 같은 대상 ABI·옵션과 실제 성공 링크가 있는 경우는 오류 사례와 구별합니다.
3. **가설·대안:** 언어 linkage, target ABI, 객체 표현과 wire encoding을 한 규칙으로 일반화한 것이 원인입니다. C-compatible 헤더와 명시적 free-function wrapper, 생성·실패·해제 계약, 대상별 offset 검사를 대안으로 반영했습니다.
4. **증거:** C++ draft dcl.link, Itanium ABI의 data layout/vtable/mangling, Arm AAPCS32를 확인했습니다. C11 caller/C++17 구현의 정상 링크 실행, BAD_LINKAGE의 의도한 undefined symbol, ARM ELF 네 심볼을 실제 확인했습니다. 로그: `embedded-cpp-part1-05-examples.log`.
5. **표본:** 정상 C linkage, 기본 C++ linkage 실패, namespace C linkage 성공, C opaque 포인터 선언을 포함합니다. 다른 vendor ABI와 hard-float 혼합 링크는 실행하지 않았습니다.
6. **결정:** remediated. 잘못된 문장을 수정하고 임의의 nm 측정 출력을 실행 가능한 두 파일로 대체했습니다. standard-layout/trivially-copyable 검사는 C·wire ABI의 충분조건이 아님을 명시했습니다.
7. **최소 변경·경계:** 기존 URL·frontmatter·시리즈 구성과 주제는 보존했습니다. logger 코드의 누락 include, null 실패 경로, padding 계산을 수정했습니다. 삭제·병합·발행 상태 변경은 없습니다.
8. **검증·잔여 위험:** 정상/실패 예제 및 gate 통과. opaque logger의 allocator 예외 정책, callback 실제 library 등록, ARM board 호출과 packed MMIO는 검증 범위 밖입니다. target/toolchain 또는 공유 헤더 옵션 변경 시 재검증합니다.

## Part 1-06 Startup code

1. **맥락·범위:** GNU/newlib 계열 Cortex-M reset와 C++ static 초기화. `part1-06-startup-code.md` 한 편을 수정했습니다.
2. **신호·반증:** constexpr 사용자 제공 생성자의 trivial static_assert가 실패하고, init-array entry 수와 객체 수를 동일시하며, fno-use-cxa-atexit가 소멸자를 제거한다고 설명했습니다. 상수 초기화와 triviality는 다른 조건입니다.
3. **가설·대안:** 언어 보장·runtime 구현·vendor boot 절차를 섞은 것이 원인입니다. CMSIS startup·newlib init.c·언어 초기화 규칙을 나눠 설명하고 constinit probe와 relocation 관찰로 대체했습니다.
4. **증거:** CMSIS startup, newlib init.c, GCC C++ dialect options, C++ draft static/dynamic initialization을 확인했습니다. host Counter의 constinit 실행 exit 0과 BAD_TRIVIAL_ASSERT 실패, ARM 객체 두 개에 init-array entry 4바이트 한 개 및 wrapper relocation을 확인했습니다. 로그: `embedded-cpp-part1-06-examples.log`.
5. **표본:** 상수 초기화와 동적 초기화, 성공·실패 assertion을 포함합니다. 실제 reset·FPU·newlib 최종 링크와 소멸자 종료 경로는 실행하지 않았습니다.
6. **결정:** remediated. 고정 vector 크기·항상 boot ROM 진입·모든 RTOS 사전 API crash·객체당 포인터 수·무근거 바이트/시간 절감 주장을 수정했습니다. compiler 생성자 호출을 직접 C++ 문장처럼 쓴 가짜 코드도 선언 설명으로 바꿨습니다.
7. **최소 변경·경계:** 기존 교육용 startup 골격은 설명 조각임을 표시하고 누락된 platform 요구와 copy-loop helper 의존을 밝혔습니다. frontmatter·URL은 보존했습니다.
8. **검증·잔여 위험:** 예제와 gate 통과. board boot, SystemInit 순서, interrupt masking, guard runtime 및 .preinit_array 포함 여부는 제품 startup으로 재검증해야 합니다. 독립적으로 완성된 board firmware라고 주장하지 않습니다.

## Part 1-07 Linker scripts

1. **맥락·범위:** STM32F407VG 메모리 영역과 GNU ld C++ section 배치. `part1-07-linker-scripts.md` 한 편을 수정했습니다.
2. **신호·반증:** DMA는 CCM 접근 불가라고 설명하면서 DMA buffer를 CCM으로 옮긴 성공사례가 정반대 결론을 보였습니다. 일반 SRAM 128KiB와 CCM 64KiB를 연속 192KiB로 선언하는 것도 잘못입니다. 다른 SKU의 실제 메모리 구성과 혼동하지 않습니다.
3. **가설·대안:** 총 SRAM 용량, bus 접근성, 초기 이미지와 runtime zero 경로를 구분하지 않은 것이 원인입니다. DMA→일반 SRAM, CPU scratch→CCM으로 구분하고 NOLOAD 영역의 명시적 초기화 계약을 추가했습니다.
4. **증거:** GNU ld MEMORY/LMA/KEEP/NOLOAD 문서, ST 제품 자료와 RM0090의 분리 영역을 대조했습니다. ARM 입력 오브젝트 .dma/.ccmram 각 4096바이트·정렬 4/8, vtable 심볼과 객체의 vtable relocation을 확인했습니다. 로그: `embedded-cpp-part1-07-examples.log`.
5. **표본:** DMA용 buffer와 CPU 전용 scratch, virtual object를 포함합니다. LLVM 도구 환경에 ELF 최종 linker가 없어 GNU ld script 실제 링크와 overflow 실패 검사는 아직 실행하지 않았습니다.
6. **결정:** remediated. 모순된 배치/측정 출력과 라이브러리 전체 DISCARD를 제거하고 교육용 MEMORY script 및 ASSERT를 제시했습니다. vtable 표와 객체 vptr 저장 공간을 구분했습니다. 관련 pool link의 잘못된 후행 설명도 바로잡았습니다.
7. **최소 변경·경계:** 공개 URL·frontmatter와 기존 그림은 유지했습니다. 그림의 중간 주소가 설명용임을 밝혔습니다. .dma/.ccmram은 .bss zero 범위 밖임을 명시해 NOLOAD=자동 zero라는 잘못된 가정을 막았습니다.
8. **검증·잔여 위험:** 오브젝트 검사와 gate 통과. **GNU ld 최종 placement·NOLOAD·ASSERT overflow·startup copy/zero·실제 DMA는 검증 대기**입니다. 최종 ELF/보드 증거 없이 성공으로 계산하지 않습니다. 제품 통합 때 우선 확인합니다.

## Part 1-08 Standard choice

1. **맥락·범위:** C++11~23 기능을 임베디드 toolchain에서 선택하는 독자 흐름. `part1-08-cpp-standard-choice.md` 한 편을 수정했습니다.
2. **신호·반증:** ISO mode에서 attribute를 쓰면 자동 GNU mode가 된다는 설명, vendor 이름별 최대 표준, 인증 예상 연도와 재현 불가능한 KB/% 개선 수치가 판단을 왜곡했습니다. 정확한 release와 library probe가 있으면 구체적으로 판단할 수 있습니다.
3. **가설·대안:** language mode, compiler 기능, library 구현, target runtime, safety qualification을 하나의 지원 버전으로 압축한 것이 원인입니다. 실제 build 정보와 기능별 compile/link/runtime probe로 대체했습니다.
4. **증거:** GCC/Clang 공식 C++ status, GCC Standards, C++ draft span/expected 계약을 확인했습니다. host C++17의 pedantic-errors attribute 허용과 cplusplus=201703, C++20 span=42, C++23 expected 성공42/오류5를 실행했습니다. C++17+span·C++20+expected는 feature 요구 #error로 의도한 실패를 확인했습니다. 로그: `embedded-cpp-part1-08-examples.log`.
5. **표본:** 세 언어 mode, library 두 기능, 성공/오류값, 잘못된 mode 두 가지를 포함합니다. ARM target library, vendor compiler, library 크기/실시간/인증 근거는 관찰하지 않았습니다.
6. **결정:** remediated. unsupported 성능/인증/버전 표를 제거하고 조사해야 할 증거 표로 바꿨습니다. span 수명·범위 계약, constinit 의미와 C++ designated initializer 제약을 보강했습니다. vector를 string_view 대안처럼 보인 배열 예시도 고쳤습니다.
7. **최소 변경·경계:** 기존 표준별 기능 개관·공개 URL·frontmatter는 보존했습니다. 단편 나눗셈 코드는 표현 가능한 몫·유효한 포인터를 전제로 한다고 명시했습니다.
8. **검증·잔여 위험:** host 예제와 gate 통과. vendor target/library 또는 safety plan 변경 시 해당 기능의 probe와 회귀 시험을 반복해야 합니다. host 지원을 bare-metal 지원으로 환산하지 않습니다.
