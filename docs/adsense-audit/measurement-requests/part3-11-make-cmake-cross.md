# 작성자 측정 요청 — `part3-11-make-cmake-cross.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part3-11-make-cmake-cross.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 74)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. 글에 나온 Make·CMake·preset 구성을 그대로 빌드한 로컬 빌드 기록 (F4·H7 두 family)

- **준비:** 작성자의 로컬 작업 디렉터리에 글의 파일을 수정 없이 넣는다: Makefile, toolchain-arm-none-eabi.cmake, CMakeLists.txt(두 family 블록 포함), CMakePresets.json, (CI 설정 없이 로컬에서 직접 실행). Drivers는 STM32CubeF4 v1.28.3 / STM32CubeH7 v1.13.0 submodule로 받는다. runner는 ubuntu-24.04, toolchain은 Arm GNU Toolchain 14.2.rel1 x86_64 arm-none-eabi. MCU_FAMILY=F4·H7을 matrix로 돌린다(-DMCU_FAMILY는 preset cacheVariables나 configure 인자로 준다). AP-C-14 때문에 개발 머신 출력은 쓰지 않는다. 누구나 열어 볼 수 있는 CI 로그만 쓴다.
- **절차:** 1) 저장소에 push해서 workflow를 돌린다. 2) Configure 단계에 `cmake --version`과 `arm-none-eabi-gcc --version`을 넣는다. 3) `cmake --preset release-arm -DMCU_FAMILY=F4`(그리고 H7), `cmake --build --preset release-arm`을 실행한다. 4) 같은 job에서 `make`도 한 번 돌린다(F4 전용 Makefile). 5) 실행 URL과 commit SHA를 적어 둔다.
- **기록할 것:** Actions 실행 permalink, commit SHA, Set up job 로그에 찍힌 runner image 버전, cmake·gcc 버전 문자열을 기록한다. configure 로그에서는 'The C compiler identification is GNU 14.2.1'과 'Check for working C compiler ... - skipped' 또는 'works' 줄을 원문 그대로 남긴다. F4·H7 각각의 POST_BUILD `arm-none-eabi-size` 출력(text/data/bss/dec)과 Makefile 빌드의 size 출력도 원문 그대로 둔다. 숫자는 로그에서 복사만 하고 반올림하지 않는다.
- **글에 넣을 위치:** '5) 빌드 실행' 절(L180-191) 바로 아래와 'CI 빌드' 절(L281-307) 끝에 '관찰 결과' 블록을 둔다. 로그 발췌, 실행 링크, 확인 날짜를 넣고, frontmatter에는 `lastVerified:`를 단다(AP-C-08 지적도 함께 해소된다).
- **오르는 항목:** C: 지금은 출처에서 유도한 기대값뿐이라 rubric 3-1 / AP-C-24에 따라 9가 상한이다. 환경이 고정된 관찰 결과가 생기면 8~11 대역 위쪽으로 갈 수 있고, F4·H7 환경 차이까지 기록하면 12 이상도 노릴 수 있다. G: 날짜 신뢰성도 좋아진다.

## 2. '자주 보는 함정' 두 개를 같은 CI에서 일부러 재현한 실패 로그

- **준비:** 항목 1과 같은 저장소와 runner, toolchain 14.2.rel1, CMake 버전. 실패 재현용 job 두 개를 `continue-on-error: true`로 추가하거나 별도 브랜치에 둔다.
- **절차:** (a) toolchain file에서 `set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)`를 지우고 `cmake --preset release-arm`을 실행한다. (b) 원래 toolchain file로 돌아간 뒤 CMakeLists.txt의 `add_link_options()`에서 `${MCU_FLAGS}`만 빼고 빌드한다. 소스에 float 인자를 받는 함수가 최소 하나 있어야 한다(예: `float scale(float x)`를 다른 파일에서 호출). (c) 같은 job에서 `arm-none-eabi-gcc -print-multi-directory`를 플래그 없이 한 번, `-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard`를 붙여 한 번 실행한다. (d) 실패한 링크 직전에 오브젝트 하나와 libc 멤버 하나에 `arm-none-eabi-readelf -A`를 돌려 Tag_ABI_VFP_args 값을 찍는다.
- **기록할 것:** (a) configure가 멈출 때의 'is not able to compile a simple test program' 블록 전체와, 그 아래 붙은 링커 오류 줄(예: 정의되지 않은 심볼, _exit 등)을 원문 그대로 남긴다. (b) GNU ld 오류 줄을 원문 그대로 남기고, 실제로 'uses VFP register arguments' 형태인지 다른 오류인지(예: multilib 경로 차이로 생긴 다른 메시지)를 그대로 기록한다. (c) 두 `-print-multi-directory` 출력. (d) readelf의 Tag_ABI_VFP_args 줄들. 실행 permalink도 남긴다.
- **글에 넣을 위치:** '자주 보는 함정' L321-323(첫 함정)과 L325-327(두 번째 함정)에 각각 '재현 로그' 발췌를 붙인다. (c)(d)는 L327의 multilib 설명 바로 뒤에 둔다. ld 조건 문장(AP-C-07, AEABI_VFP_args_compatible 예외)은 관찰한 tag 값과 맞게 고친다.
- **오르는 항목:** C: 실패를 실제로 관찰하고 환경까지 적으면 '실제 측정·실패' 조건을 채워 12~15 대역 근거가 된다. A: 공식 문서를 되풀이하는 데서 그치지 않고 재현한 실패 사례가 생겨 13~19 대역을 굳힌다. B: L327 조건 문장 정확도도 올라간다.

## 3. toolchain file에 -mcpu를 둔 경우와 뺀 경우의 H7 compile_commands.json과 결과 오브젝트 속성 비교

- **준비:** 항목 1과 같은 CI 환경에 `CMAKE_EXPORT_COMPILE_COMMANDS=ON`을 켜고 MCU_FAMILY=H7로 둔다. 변형 A: 3-01처럼 toolchain file에 `set(CMAKE_C_FLAGS_INIT "-mcpu=cortex-m4 -mthumb")`를 넣는다. 변형 B: 이 글의 toolchain file을 그대로 쓴다. 두 변형 모체 C 소스 1개, C++ 소스 1개, startup.s를 둔다.
- **절차:** 변형마다 configure하고 빌드한다. 그다음 `jq '.[] | select(.file|test("main.c|\\.cpp|startup.s")) | .command' build/.../compile_commands.json`으로 C·C++·ASM 명령줄을 뽑는다. Ninja라면 `ninja -t commands`로 링크 명령도 뽑는다. 이어서 main.c.obj, .cpp.obj, startup.s.obj, 최종 .elf 각각에 `arm-none-eabi-readelf -A`를 실행한다.
- **기록할 것:** 변형 A·B의 C, C++, ASM 컴파일 명령줄과 링크 명령줄에서 -mcpu가 나오는 위치와 개수를 원문 발췌로 남긴다. 각 오브젝트와 elf의 Tag_CPU_name, Tag_FP_arch 값도 기록한다. 실제로 cortex-m7이 이기는지, C와 C++/ASM 사이에 차이가 생기는지를 관찰된 그대로 적는다.
- **글에 넣을 위치:** L107의 '-mcpu를 toolchain file에서 뺀 이유' 문장 바로 뒤. 관찰 결과에 따라 근거 문장을 '실제 해악'(언어 사이 불일치 등)으로 고치거나 '수정할 곳을 한 곳으로'로 약화한다. 3-01 L167에 3-11을 가리키는 한 줄을 넣을 근거도 된다.
- **오르는 항목:** A/B: AP-C-04 지적(근거가 효과까지 추적되지 않음)을 관찰로 닫아 작성자의 분석과 선택 기준이 뚜렷해진다(A 13~19 → 20 근처). C: 명령줄과 오브젝트 속성 관찰이 추가된다.

## 4. 실제 보드 두 장에서 F4·H7 빌드를 플래시하고 부팅을 확인한 기록(같은 CMakeLists 한 벌)

- **준비:** STM32F429I-DISC1(STM32F429ZI)과 NUCLEO-H743ZI(STM32H743ZI) 보드, 항목 1의 CI 아티팩트로 받은 .elf/.bin(로컬 재빌드 아님), 프로그래머는 ST-LINK와 STM32CubeProgrammer 또는 OpenOCD(버전 기록), 최소 앱은 LED 토글 + SysTick HAL_InitTick 사용 + float 연산 한 줄.
- **절차:** 1) CI 아티팩트 F4.elf를 DISC1에, H7.elf를 NUCLEO-H743ZI에 `STM32_Programmer_CLI -c port=SWD -w <elf> -v -rst`로 쓴다. 2) LED가 정해진 주기로 토글되는지, 디버거로 HAL_GetTick()이 증가하는지 확인한다. 3) 선택: H7 빌드를 일부러 `-mfpu=fpv4-sp-d16`(단정밀도만)으로 바꿔 빌드한 뒤 double 연산 루프의 DWT CYCCNT를 fpv5-d16 빌드와 비교한다.
- **기록할 것:** 보드 리비전, 칩 마킹, 프로그래머 이름과 버전, 플래시·verify 로그 원문, 부팅 확인 방법과 결과(LED 주기, 디버거에서 본 tick 값)를 기록한다. 선택 실험을 했다면 두 빌드의 CYCCNT 원시값, 반복 횟수, 실행 횟수, 클록 설정을 적는다. 실패했다면 그 사실과 fault 레지스터(CFSR/HFSR)를 그대로 적는다.
- **글에 넣을 위치:** '두 family를 한 CMakeLists로' 절 끝(L279 뒤)에 '보드에서 확인' 소절을 두고, 선택 실험은 FPU 옵션 문단(L279)의 트레이드오프 근거로 쓴다.
- **오르는 항목:** C: '실제 측정·환경 차이' 조건을 채워 12~15 대역에 들어간다. A: 두 family 선택 기준을 실측으로 뒷받침해 20~25 대역 조건(작성자의 분석과 선택 기준)에 다가간다.

## 5. 작성자 본인이 실제로 겪은 크로스 빌드 실패 사례 1건(기억이나 재구성이 아니라 남아 있는 기록이 있을 때만)

- **준비:** 작성자의 실제 프로젝트 이력: 커밋, CI 실패 로그, 이슈 트래커, 사내 위키 등에서 날짜와 toolchain·CMake 버전이 확인되는 것. 예: GLOB로 넣은 HAL _template.c 때문에 생긴 HAL_InitTick multiple definition, 링크 단계에 FPU 플래그가 빠져 생긴 VFP 오류, toolchain file 상대 경로 문제.
- **절차:** 남아 있는 로그나 커밋을 찾아 원문 오류 줄, 원인, 고친 변경(diff)을 추린다. 기록이 없으면 이 항목은 건너뛴다. 기억으로 재구성한 로그는 넣지 않는다.
- **기록할 것:** 발생 시기, toolchain·CMake 버전, 원문 오류 메시지, 원인 판단 근거, 수정 diff(민감 정보는 제거), 다시 생기지 않게 바꾼 규칙.
- **글에 넣을 위치:** '자주 보는 함정' 안에서 해당 함정 아래에 '실제 사례' 문단으로 넣거나, 한 줄 요약 다음에 이 글을 쓴 동기로 짧게 넣는다.
- **오르는 항목:** A: 평가자가 요구한 '작성자 실패 사례'로, 대리 작성자가 만들 수 없는 유일한 A 상한 해제 요소다(20~25 대역). C: 실패와 환경 기록이 더해진다.
