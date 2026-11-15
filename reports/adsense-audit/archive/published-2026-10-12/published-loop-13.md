# 공개 글 AdSense 평가 — 루프 13

> 대상: 공개 글 10편 (Embedded C++ for Real Systems, `seriesOrder` 4~13)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열세 번째 루프다. 대상은 `src/content/blog/embedded/embedded-cpp/`의 `part1-04-code-size-analysis.md`~`part2-05-consteval-constinit.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-04-code-size-analysis.md` | 11 | 11 | 7 | 9 | 6 | 7 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part1-05-abi-compatibility.md` | 11 | 11 | 6 | 10 | 4 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part1-06-startup-code.md` | 10 | 11 | 5 | 8 | 5 | 7 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part1-07-linker-scripts.md` | 11 | 10 | 6 | 8 | 5 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part1-08-cpp-standard-choice.md` | 11 | 12 | 6 | 12 | 7 | 7 | 1 | **56** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part2-01-raii-basics.md` | 10 | 11 | 6 | 9 | 7 | 5 | 1 | **49** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-02-raii-patterns.md` | 11 | 10 | 5 | 6 | 6 | 7 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part2-03-constexpr-basics.md` | 11 | 11 | 6 | 10 | 6 | 7 | 1 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part2-04-constexpr-advanced.md` | 11 | 10 | 6 | 9 | 4 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-05-consteval-constinit.md` | 12 | 12 | 5 | 11 | 5 | 6 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |

평균 49.7점(10편 합 497), 범위 46~56점이다. 판정은 우선 조치 8편, 병합 검토 2편(2-01·2-03)이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 8편이다. 6편(1-04·1-05·1-07·1-08·2-02·2-04)은 원문 내부 모순(루브릭 3-1)으로, 2편(1-06·2-05)은 평가 중 직접 연 1차 자료(GCC 16 컴파일 결과·매뉴얼, WG21 P0784R7)로 판정했다. 점수 구간으로는 10편 모두 병합 검토(40~59)다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 여부까지이고, 렌더링·광고 배치·외부 사이트와의 유사도는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part1-04-code-size-analysis.md` | 52 | 52 | 0 | 없음 |
| `part1-05-abi-compatibility.md` | 49 | 49 | 0 | 없음 |
| `part1-06-startup-code.md` | 51 | 47 | -4 | 있음 |
| `part1-07-linker-scripts.md` | 49 | 46 | -3 | 없음 |
| `part1-08-cpp-standard-choice.md` | 56 | 56 | 0 | 없음 |
| `part2-01-raii-basics.md` | 49 | 49 | 0 | 없음 |
| `part2-02-raii-patterns.md` | 46 | 46 | 0 | 없음 |
| `part2-03-constexpr-basics.md` | 53 | 52 | -1 | 없음 |
| `part2-04-constexpr-advanced.md` | 48 | 48 | 0 | 없음 |
| `part2-05-consteval-constinit.md` | 52 | 52 | 0 | 없음 |

1차 합 505에서 최종 497로 8점 내려갔다. 부풀림(AP-C-24)은 1-06 한 편이다. 평가자가 E를 7로 줬지만 본문이 '분석' 산출물 없이 개념 소개 수준이라 루브릭 E 주석(3~5)을 넘었다.

- 기각한 오류 확인: 1건.
  - 1-07: 357~361행 map 예시(`.text`가 0x08000000에서 시작, 스크립트에 없는 `_stext`)와 170~173행 스크립트(`.isr_vector`를 FLASH 맨 앞에 둠)의 불일치. 346행이 이 map을 154~274행 스크립트의 출력이라고 밝히지 않아 '동시에 참일 수 없음' 기준을 충족하지 않는다. uncertainties와 C 감점으로 옮겼다. 같은 글의 RAM 192K/128K 모순은 성립해 판정은 유지했다.
- 추가한 오류 확인: 5건, 4편 (1-08은 같은 건의 위치 보강).
  - 1-04: 311~312행 size -A 출력에서 .text(0x80001cc + 18432B = 0x80049cc 끝)와 .rodata 시작 0x80043cc가 1536B 겹친다.
  - 1-06: 305행 `static_assert(std::is_trivially_default_constructible_v<Counter>)`는 299행 사용자 제공 constexpr 생성자 때문에 g++-16 -std=c++17에서 실패한다. 334행 '-fno-use-cxa-atexit … 소멸자는 완전히 제거'는 GCC 16 매뉴얼 -fuse-cxa-atexit 항목('atexit 대신 __cxa_atexit로 등록')과 맞지 않는다. 판정이 병합 검토 → 우선 조치로 바뀌었다.
  - 1-07: 281~283행 '큰 DMA buffer를 CCM RAM에'·408~419행 측정 사례(성공으로 제시) vs 292·396·439행 'CCM은 DMA가 접근하지 못함/bus fault/DMA buffer는 일반 SRAM에'.
  - 2-05: 279~280행 'consteval 안에서 dynamic alloc — C++20에서는 불가능, C++26까지' vs WG21 P0784R7 [expr.const](평가 안에서 해제하는 할당 허용, C++20 채택). 판정이 병합 검토 → 우선 조치로 바뀌었다.
  - 1-08(위치 보강): 143행 모순에 71행 'ARM Compiler 6도 완전히 지원'(C++17)과 161행 '벤더 컴파일러(ARM, IAR, Keil) → C++17 (최대)' vs 145행 Keil 'C++11 (armclang)'을 더했다.
- 점수 변경: 1-06 A 11→10·C 6→5·E 7→5(고유 절 두 개가 틀린 내용, 예제가 컴파일되지 않음, '분석' 약속 미이행), 1-07 A 12→11·B 11→10·C 7→6(DMA-CCM 모순으로 측정 절 결론이 함정 절과 반대), 2-03 B 12→11(110행 정의 전 호출, 298·301행 설명 부족, RAM 비교 기준 불일치). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: 1-04 D의 part2-07 범위(28~56행), 1-05 D의 part1-04 412행·part8-02 48~67행, 2-02 D의 PoolDeleter 비교 대상(2-01 → part3-09 67~84행), 2-03 D의 item15 108~122행, 2-04 D의 part2-05 210~235행과 merge_note 함정 번호(1·2·4번), 2-05 D의 part2-03 332행. 2-02 B에서 1차 자료 위치 없는 FreeRtosMutex 한계는 AP-C-31에 따라 감점 근거에서 빼고 uncertainties로 옮겼다(점수 유지).
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 대상과 다른 라벨(1-07 446행 Part 3-03 'custom 섹션에 pool 배치'), 링크 없는 draft 대상 관련 항목(2-01 488행 GoF 14)이다.

## 글별 근거

### `part1-04-code-size-analysis.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치 네 건이다.
- 391행 size 출력 dec 94816 vs 같은 줄 hex 1722c: 68192+2048+24576=94816은 맞지만 0x1722c는 94764이고 94816은 0x17260이다.
- 167행 '함수가 8바이트' vs 160~164행 디스어셈블(b510 2 + 4604 2 + f7ff fffe 4 + bd10 2 = 10바이트, 주소 0x234~0x23d).
- 408행 'HAL과 FreeRTOS가 절반을 차지' vs 396~397행 18.4%+14.2%=32.6%.
- 311행 .text가 0x80001cc부터 18432B(0x80049cc까지) vs 312행 .rodata 시작 0x80043cc: 두 섹션이 1536B 겹친다. 같은 표의 다른 주소는 크기 합과 맞아 .rodata 주소만 틀렸다.

git log(025aadd5 작성, 815510c8·39149f68 문체, 400892d7 linter, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | size·nm·objdump·bloaty 옵션 나열(43~210행)은 binutils·bloaty 사용법과 같은 일반 내용이다. 이 글만의 것은 '자주 보는 큰 함수 후보'와 원인 플래그 목록(230~237행), vtable 추적 절(288~302행) 정도이고 출처와 선택 기준 설명이 한 줄씩이다. 384~408행 측정 절은 환경·출처가 없고 결론(408행)이 출력(396~397행)과 어긋나 고유 분석으로 인정하지 않았다. |
| B | 11 | 문제(17~23행) → ELF 섹션 표(29~41행) → 도구 4개(43~210행) → 워크플로 5개(212~334행) → 함정 6개(358~382행) → 정리(410~416행)로 흐름은 끝까지 간다. 제목의 예외 비용은 232·237행 불릿 두 줄뿐이다. 96행은 nm 출력 형식을 '<주소> <크기> <type> <심볼>'로 설명하는데 87~93·123·275~277·295~297행 예시에는 열이 셋뿐이다. 내부 모순 네 곳과 열린 불확실로 AP-C-24에 따라 B ≤ 13, 11점. |
| C | 7 | 그대로 돌릴 수 있는 명령은 있다(47~71·216~228·241~249·331~353행). 툴체인·bloaty 버전과 대상 보드는 없다. 386행 '실제 STM32F4 + FreeRTOS + UART 프로젝트' 수치(391~404행)는 출처·측정 환경이 없어 C ≤ 8을 적용했다. 그 출력은 dec/hex가 맞지 않고(391행) bloaty -d symbols가 'HAL driver functions' 같은 묶음 행을 내놓아(396~404행) 실제 측정인지 의심된다. 311~312행 섹션 주소도 겹쳐 1점 더 뺐다. |
| D | 9 | 같은 시리즈 part1-03-runtime-requirements.md(310·317행이 이 글로 넘김)와 part1-05-abi-compatibility.md는 역할이 겹치지 않는다. part2-07-templates-cost.md와 반복이 크다. 258~278행 process<T> 예제와 nm 명령이 part2-07 28~56행과 같고, 193~198·249행 bloaty 두 빌드 비교는 part2-07 243~254행과 같다. 다른 시리즈: 47~57행 size 열 설명은 tools/debugging/embedded/chapter05-elf-map.md 496~511행, 304~317행 size -A 표는 같은 글 513~523행과 같다. modern-recipes/part8-10-code-size-optimization.md 136~155행, modern-recipes/part3-03-elf-format.md 125행도 같은 도구 소개다. |
| E | 6 | 제목은 '가상 함수·템플릿·예외 비용 추적'을 약속한다. 가상 함수는 288~302행, 템플릿은 254~286행에서 다루지만 예외는 232·237행 불릿 두 줄뿐이다. 키워드 하나를 거의 다루지 않은 부분 미이행이라 6~8 구간 하단. description(5행)은 본문과 맞다. |
| F | 7 | 427행 다음 글 'Part 1-05: ABI 호환성'은 seriesOrder 5 part1-05-abi-compatibility.md와 맞다. 관련 항목 420~423행(part1-02 seriesOrder 2, part1-03 3, part2-07 15, part4-02 30)과 본문 링크 286행(part2-07), 302행(part2-08 CRTP, 16)을 열어 라벨과 제목이 맞음을 확인했다. '워크플로 1~5' 단계 구분(212~334행)이 이 글 고유 구조다. 전제 지식 안내가 없고 audit:reading·모바일 확인을 하지 않아 9 이상은 아니다. |
| G | 1 | 본문에 1차 출처 링크가 없다(binutils 문서, bloaty 저장소, Itanium C++ ABI 모두 없음). arm-none-eabi 툴체인·bloaty 버전도 없다. 323행 'STM32F407 = 1MB Flash, 192 KB RAM'에 데이터시트 인용이 없고, 300행 vtable 크기 공식에도 ABI 출처가 없다. |

uncertainties:
- 300행 'vtable은 virtual 함수 수 × 4바이트': Itanium C++ ABI vtable에는 offset-to-top·typeinfo 포인터도 들어간다는 기억(ABI 문서로 확인하지 않음). 295~297행 크기(32·64·24B)는 ×4 공식과 모순되지 않는다.
- 77행 awk가 보는 $4는 dec(text+data+bss)라 bss까지 더한 값이다. Flash 임계치처럼 쓴 것이 의도인지 미확인.
- 87~93·123행: --print-size를 줬는데 출력에 크기 열이 없다(B에 반영).
- 93행 __libc_init_array 크기 0x18f0(6384B)는 그럴듯하지 않은 값이고 출처가 없다.
- 163행: 링크된 ELF인데 bl 인코딩이 f7ff fffe(미재배치 형태)이면서 대상이 400 <printf>로 풀려 있다. 실제 출력인지 의심된다.
- 396~404행 bloaty 출력의 묶음 행('HAL driver functions', 'FreeRTOS internals')은 실제 측정 출력인지 의심된다.
- 205~207행 bloaty diff 백분율 기준을 bloaty 문서로 확인하지 않았다.
- 370행 'nm에 없는 함수는 인라인된 상태': --gc-sections로 제거된 경우도 있다. 확인하지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로는 병합 후보가 같은 시리즈 `part2-07-templates-cost.md`(템플릿 bloat 예제·bloaty diff 중복)지만, 'C++ 바이너리 크기 도구 워크플로'라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다. 391·167·408·312행 산술 오류를 먼저 고치고, 384~408행 측정 절은 출처·환경이 없으면 지운다. 그다음 254~286행을 part2-07 링크 한 줄로 줄이고 예외 비용 추적 절(__cxa_*·unwind 테이블 크기 확인 절차)을 보강한다.

### `part1-05-abi-compatibility.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- 374·376행 주석은 패딩을 3바이트씩 적고 멤버 합은 1+4+1+4=10바이트, 총 16바이트 vs 378행 '4 wasted on padding': 16-10=6이라 동시에 참일 수 없다.
- 503행이 컴파일한다는 logger.cpp(177~201행)에는 `LoggerImpl`와 extern "C" 함수 logger_create·logger_destroy·logger_log만 있다 vs 506·512행 없는 함수 `logger_init`, 507·513행 없는 클래스 `Logger`의 `_ZN6Logger3logEPKc` 출력. 또 52행 길이 접두 규칙(`_Z3add`)대로면 11글자 logger_init은 `_Z11`이어야 하는데 506행은 `_Z12`다.

git log 7개 커밋(025aadd5, 815510c8, 39149f68, 400892d7, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | extern "C"(78~118행), __cplusplus 헤더 패턴(122~154행), opaque pointer(156~217행), 콜백 해결 세 가지(229~275행)는 C/C++ 혼합 입문 자료에 흔한 목록이다. 이 글만의 예는 Thumb 어셈블리로 this가 r0에 들어가는 것을 보인 부분(303~320행)과 static_assert로 C 인터페이스 struct를 지키는 예(348~365행) 정도다. 95·449·497행은 근거 없이 완곡 표현으로 끝난다. |
| B | 11 | 문제 정의(21~27행) → mangling(29~58행) → extern "C" → 헤더 패턴 → opaque pointer → 콜백 → calling convention(277~320행) → struct layout(322~415행) → 혼합 빌드(417~449행) → 함정(451~497행) → 측정(499~516행) → 정리(518~524행)로 흐름은 끝까지 간다. 제목의 vtable 레이아웃은 334~344행 vptr 위치 한 예뿐이다. 455행은 '누락' 함정을 설명하며 C에서 extern "C"가 무시된다고 써 상황과 맞지 않는다. 내부 모순 두 건으로 AP-C-24 B ≤ 13, 11점. |
| C | 6 | 코드 조각과 nm 명령(501~514행)은 있지만 툴체인 버전·대상 코어·빌드 옵션이 없다. 유일한 관찰 결과인 nm 출력(506~513행)이 같은 글의 logger.cpp(177~201행)와 맞지 않아 재현할 수 없다. 340행 'size = 12 또는 16', 407행 'ARM은 unaligned access가 bus fault'는 환경 없는 단정이라 C ≤ 8을 적용했다. 측정 결과가 없어 4~7 구간. |
| D | 10 | 같은 시리즈: part1-04-code-size-analysis.md는 mangling을 412행 '--demangle 필수' 한 줄로만 다루고 427행에서 이 글로 넘긴다. part1-06-startup-code.md는 __libc_init_array(15·56행) 중심이라 겹치지 않는다. part1-01-cpp-vs-c.md 279행은 한 문단 요약 뒤 이 글로 링크한다. 다른 시리즈: modern-recipes/part8-02-memory-alignment.md의 struct 재배치(48~67행)와 packed·memcpy 우회(109~126행)가 이 글 371~415행과 같다. part2-03-arm-registers.md AAPCS 표(30~39행)가 281~289행과 겹친다. C/C++ 링크 경계는 이 글만 다룬다. |
| E | 4 | 제목(2행)은 'Itanium ABI·name mangling·vtable 레이아웃'을 내건다. name mangling은 29~58·499~516행에서 다루지만 Itanium ABI는 48행 괄호 한 번, vtable 레이아웃은 334~344행 vptr 위치 한 예뿐이다. 키워드 셋 중 둘이 거의 빠져 3~5 구간. description(5행)은 본문과 맞아 2 이하로는 내리지 않았다. |
| F | 6 | 534행 다음 글 안내(Part 1-06)는 seriesOrder 6 part1-06-startup-code.md와 맞다. 관련 항목 528~530행 대상 part1-03(seriesOrder 3), part1-06, part5-03-peripheral-abstraction.md(seriesOrder 39)를 열어 라벨·제목이 맞음을 확인했다. 전제 지식 안내나 긴 절 사이 안내가 없고 나머지는 템플릿이라 7 이상 근거가 없다. |
| G | 1 | 본문에 출처 링크가 없다. 48행 Itanium C++ ABI, 281행 AAPCS는 이름만 있고 판·링크가 없다. 503행 arm-none-eabi-g++ 버전, 대상 코어(298행 Thumb), float ABI(291행 VFP)도 없다. |

uncertainties:
- 468행: C에서 `struct Logger* l;`은 불완전 타입 포인터 선언이라 컴파일될 것으로 보이는데 '컴파일 에러'라고 적었다. C 표준으로 확인하지 않았다.
- 407·487행 'ARM은 unaligned access가 bus fault': Cortex-M3 이상은 일반 LDR/STR unaligned 접근을 허용한다는 기억(ARMv7-M ARM 미확인). part8-02 116행과도 다르다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 497행 namespace 안 extern "C"를 '컴파일러마다 동작이 다릅니다'라고 했는데 C++ 표준 [dcl.link]이 정한다는 기억, 미확인.
- 93~95행 extern "C"가 calling convention까지 바꾼다는 설명과 '둘 다 명시합니다'의 뜻이 불분명하다.
- 291행 'VFP가 있으면 float 인자가 s0-s15로 전달'은 hard-float(AAPCS-VFP) 변형에서만 해당한다는 기억, 원문 미확인.
- 340~341행 레이아웃 [vptr:4][x:4][y:4](12바이트)와 '12 또는 16': 4바이트 vptr 전제에서 16이 나올 수 없어 보이나 '또는'으로 열어 둔 문장이라 오류 확인에 넣지 않았다.
- 455행 함정 1의 설명이 누락 상황과 맞지 않는 문장 구성.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 대상 없음 — C/C++ 링크 경계(extern "C"·헤더 패턴·opaque pointer)는 공개 글 중 이 글만 다룬다. 다음 조치는 보강: 378행 패딩 산술과 506~513행 nm 출력을 글의 logger.cpp와 맞게 고치고(실제 툴체인 출력과 버전 명시), padding·packed 절(367~415행)은 `modern-recipes/part8-02-memory-alignment.md` 링크로 줄이며, 제목의 Itanium ABI·vtable 레이아웃을 본문에서 다루거나 제목을 좁힌다.

### `part1-06-startup-code.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 평가 중 1차 자료 두 개를 직접 열어 확인했다.
- 305행 `static_assert(std::is_trivially_default_constructible_v<Counter>)` vs 299행 사용자 제공 `constexpr Counter() : count(0) {}`: 297~305행을 g++-16 -std=c++17 -c로 컴파일하면 'static assertion failed … Counter::Counter is non-trivial'이 나온다. 310행 'trivial constructor는 .init_array에 추가되지 않습니다'의 예로 든 Counter가 trivial이 아니다.
- 334행 '-fno-use-cxa-atexit … 소멸자는 완전히 제거됩니다' vs GCC 16 매뉴얼 -fuse-cxa-atexit 항목('Register destructors for objects with static storage duration with the __cxa_atexit function rather than the atexit function'): -fno- 형태는 atexit로 등록할 뿐 소멸자를 제거하지 않는다. 같은 항목에 따르면 328행 'C++ 표준은 … __cxa_atexit로 등록'도 표준 규정이 아니라 GCC 구현이다.

git log(fce8a288 초안, 815510c8·39149f68 다듬기, 400892d7 linter, e9ea2b8e/86fff64f cross-link와 revert, ac24bb76 제목, be973200 topic, 68525f0c 코드 블록 산문, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 40~64행 부트 흐름, 66~90행 vector table, 206~249행 같은 TU·다른 TU 초기화 순서는 입문 자료의 표준 목록이다. 고유한 부분은 338~356행 .init_array 크기와 nm으로 _GLOBAL__sub_I_ 확인, 324·382~384행 KEEP 누락 함정, 255~289행 GPIO 예다. 고유 절 둘(292~310행 trivial 강제, 326~334행 -fno-use-cxa-atexit)이 틀렸다. 269행은 언제 깨지는지를 완곡 표현으로 대신했다. 앵커 part1-04(10)와 같은 수준. |
| B | 11 | 문제(17~38행) → 부트 흐름 → Reset_Handler 코드(96~131행) → __libc_init_array(136~173행) → 초기화 순서 → 함정(360~384행) → minimal startup(386~421행) → 정리(423~430행)까지 흐름은 끝까지 간다. 51행은 Reset_Handler가 SP를 맞춘다고 하는데 105~131행 코드에는 SP 설정이 없고 90행은 CPU가 하드웨어로 SP를 로드한다고 한다. 54행 FPU 활성화도 코드에 없다. 오류 확인으로 AP-C-24 B ≤ 13. |
| C | 5 | 340·349행 명령과 342·351~353행 예시 출력이 있지만 툴체인 버전, 대상 MCU, 빌드 옵션이 없다. 358행 '수 ms', 334행 '수십에서 수백 바이트', 421행 '수 KB Flash'는 출처·환경 없는 수치라 C ≤ 8. 297~305행 예제는 GCC 16에서 컴파일되지 않는다. 343행 생성자 8개 vs 351~353행 nm 출력 3개, 함수 주소 0x00000a40이 342행 0x80014c0·90행 Flash 시작과 다른 영역이라 예시 출력이 실제 빌드 결과로 보이지 않는다. |
| D | 8 | 같은 시리즈: part1-03-runtime-requirements.md 128~146행 부트 시퀀스가 이 글 40~64행과 항목·순서까지 거의 같다. part1-07-linker-scripts.md 104~111·204~209행 .init_array 링커 조각이 이 글 163~171행과 같고, 이 글은 316~322행에서 한 번 더 싣는다. 다른 시리즈: modern-recipes/part3-06-startup-code.md 41~61·118~128·163~196행이 이 글 70~88·140~158·390~419행과 겹친다. modern-recipes/part3-07-c-runtime.md 83~105행도 같다. 이 글에만 있는 것은 TU 간 순서, GPIO 생성자 함정, nm 확인이다. |
| E | 5 | 제목 '.init_array·전역 생성자 호출 순서'와 description은 66~249행이 다룬다. 그러나 '분석'에 비해 실제 산출물은 출처·환경 없는 예시 출력(342~353행)뿐이고 서로 맞지 않는다. 루브릭 E 주석('분석' 약속에 개념 소개 수준이면 3~5) 적용. 제목에 아키텍처가 없는데 42행이 'ARM Cortex-M 기준', 260·277행이 STM32 레지스터를 쓴다(AP-C-24 E ≤ 8). |
| F | 7 | 438~440행 다음 글은 part1-07-linker-scripts.md이고 seriesOrder 7과 맞다. 434행 1-03(128~146행이 __libc_init_array), 435행 1-07(104행 절), 249·436행 4-08 Construct-On-First-Use(31행 절)를 열어 라벨과 맞음을 확인했다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9 이상은 아니다. |
| G | 1 | 본문에 외부 링크가 없다. 138·141행 newlib 언급에 버전·소스 경로가 없다. 328행 '__cxa_atexit 등록'에 표준·ABI 인용이 없고 실제로는 GCC 옵션 동작이다. GCC·binutils 버전과 대상 MCU도 없다. |

uncertainties:
- 342~343행 '.init_array 32바이트 = 생성자 8개'와 351~353행 nm 출력 3개(356행 'TU당 하나')의 관계가 설명되지 않는다. 339행 '생성자 수 × 4'와 356행 'TU당 초기화 함수 하나'는 단위가 섞여 있다.
- 351~353행 함수 주소 0x00000a40 등은 342행 .init_array 주소, 90행 Flash 시작 0x08000000과 다른 영역이다.
- 351~353행 _GLOBAL__sub_I_g_logger 이름 규칙이 GCC 실제 이름(파일명 기반 여부)과 맞는지 미확인.
- 68행 'Cortex-M의 첫 256 바이트는 vector table': 벡터 수가 구현마다 달라 고정 크기가 아닐 수 있다. ARMv7-M ARM 미확인.
- 51행 'Reset_Handler가 SP 초기화' vs 90행 'CPU가 첫 4 바이트를 SP로 로드': 재설정을 뜻하는지 정리되지 않았다.
- 260행 주석 '… 안 했다면 실패'는 그 줄 자체가 클럭을 켜는 코드라 무엇이 실패하는지 알 수 없고, 278행 '안전' 예도 같은 RCC 쓰기를 한다.
- 380행 'static 생성자에서 mutex 사용을 하면 crash': FreeRTOS는 스케줄러 시작 전 mutex 생성이 가능하다는 기억, 문서 미확인.
- 239행 'C++11+ thread-safe init': __cxa_guard_acquire 의존과 -fno-threadsafe-statics 영향은 1차 자료 위치가 없어 감점하지 않았다.
- 358행 '수 ms', 334행 '수십에서 수백 바이트', 421행 '수 KB Flash'는 출처 없는 수치다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준 겹치는 글은 `part1-03-runtime-requirements.md`(부트 시퀀스), `part1-07-linker-scripts.md`(.init_array 링커 조각), `modern-recipes/part3-06-startup-code.md`(vector table·Reset_Handler)다. 'C++ 전역 생성자 호출 순서'라는 검색 의도가 있어 병합보다 보강을 다음 조치로 둔다. 305행 예제와 334행 옵션 설명을 GCC 매뉴얼 기준으로 먼저 고치고, 부트 시퀀스·링커 조각 반복은 링크로 줄인다.

### `part1-07-linker-scripts.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- RAM 크기: 34행 `RAM ... LENGTH = 192K`, 49행 'RAM은 0x20000000부터 192KB(main SRAM)', 155행 주석 '192KB RAM' vs 같은 코드 블록 159행 `LENGTH = 128K`(352행 map 0x20000, 428행 128 KB도 128K 쪽). main SRAM 길이가 192K이면서 128K일 수 없다.
- DMA buffer와 CCM: 281~283행 '큰 DMA buffer를 CCM RAM에', 408~416행 측정 사례 'DMA buffer를 CCM에'(419행 'main SRAM에 4KB의 여유'로 성공처럼 제시) vs 292행 'CCM은 DMA가 접근하지 못합니다', 396행 'DMA controller가 접근하지 못해 bus fault가 납니다', 439행 'DMA buffer는 일반 SRAM에 두어야 합니다'.

평가자가 든 map 출력 불일치(357~361행)는 기각해 uncertainties로 옮겼다. git log(fce8a288 작성, 815510c8·39149f68 폴리싱, 400892d7 linter, e9ea2b8e/86fff64f, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 27~98행 MEMORY·SECTIONS·VMA/LMA, 154~274행 완성 스크립트, 310~336행 심볼 정의는 벤더 기본 링커 스크립트 설명 수준이다. 이 글만의 것은 100~148행 C++ 섹션 정리와 292·396행 CCM-DMA 경고인데, 그 경고마저 281~283행 예제와 408~419행 사례가 뒤집는다. 132·136·308행은 근거 없는 일반론이다. 제목의 vtable은 본문에 없다(2행 제목, 76행 'Virtual Memory Address'뿐). |
| B | 10 | 17~21행 문제 정의 → MEMORY/SECTIONS → VMA/LMA → C++ 섹션 → 완성 스크립트 → custom 섹션 → map(338~374행) → 함정 7개(376~404행) → 측정(406~419행) → 정리(434~440행)로 흐름은 끝난다. 제목의 vtable 배치가 없고, 262행 `.ccmram`을 `AT >FLASH`로 두면서 복사 코드나 NOLOAD 선택을 설명하지 않는다. RAM 크기·DMA-CCM 모순으로 AP-C-24 B ≤ 13, 측정 절 결론이 함정 절과 반대라 10. |
| C | 6 | 빌드 명령(343·424행)과 map·`--print-memory-usage` 예시(348~372·426~430행)는 있지만 toolchain 버전·보드·소스가 없다. 408~419행 측정은 출처·환경 없는 수치라 C ≤ 8이고, 396행이 bus fault라고 한 배치를 성공으로 보여 줘 결과로 쓸 수 없다. 148행 '수 KB가 절약됩니다'도 근거가 없다. 357~361행 map 예시는 170~173행 스크립트와 맞지 않는다. |
| D | 8 | 같은 시리즈 part1-06-startup-code.md와 `.init_array` 조각·KEEP 설명이 겹친다(이 글 106~119·378~380행 ↔ 1-06 162~169·316~324행). 다른 시리즈 modern-recipes/part3-04-linker-script-basics.md의 MEMORY(28~34·72~81행), `> RAM AT > FLASH`(106~114행), 심볼 정의(122~132행), `_estack` 함정(292~293행)이 이 글 31~98·310~319·386~388행과 같다. tools/debugging/embedded/chapter05-elf-map.md 138~145·248~255·327~328·400~411행이 이 글 154~274·365~371·280~292행과 겹친다. 이 글만의 몫은 C++ 섹션 관점이다. |
| E | 5 | 2행 제목 키워드 'vtable'·'정적 객체 배치'·'추적' 중 vtable은 본문에 없고, '추적'은 338~374행 map 절 하나로만 이행한다(절반 미이행 → 3~5). description(5행)은 본문과 맞다. 일반 임베디드 C++ 제목에 본문은 STM32F407 하나(46·150행)라 AP-C-24 E ≤ 8도 걸린다. |
| F | 5 | 450행 다음 글은 seriesOrder 8 part1-08-cpp-standard-choice.md와 맞다. 444행 1-06, 445행 1-04는 라벨과 맞는다. 그러나 446행 'Part 3-03: Pool Allocator 구현 — custom 섹션에 pool 배치'의 대상 part3-03-pool-allocator.md(seriesOrder 21)에는 section·CCM·링커 언급이 없다(258행 'critical section'뿐). 라벨이 대상과 다른 관련 링크라 F ≤ 5. |
| G | 1 | 본문에 1차 출처가 없다. GNU ld 매뉴얼, STM32F407 RM0090·datasheet 판, arm-none-eabi toolchain 버전 표기가 없다. 46~50행 메모리 크기도 출처 없이 제시되고 34·159행에서 서로 다르다. |

uncertainties:
- 357~361행 map 예시: `.text`와 Reset_Handler가 0x08000000에서 시작하고 스크립트에 없는 `_stext`(358행)가 나온다. 346행이 이 스크립트의 출력이라고 밝히지 않아 오류 확인 근거로 쓰지 않았다.
- 132행 '-fno-use-cxa-atexit를 추가하면 공간이 절약됩니다'의 방향과 근거를 GCC 문서로 확인하지 않았다.
- 136행 'C++17 이후로는 대부분 자동으로 처리됩니다' 미확인.
- 265~269행 `/DISCARD/ : { libc.a (*) ... }`가 119행 `__libc_init_array` 사용과 충돌하지 않는지 GNU ld 매뉴얼로 확인하지 않았다.
- 292·396행 STM32F4 CCM에 DMA가 접근하지 못한다는 점과 'bus fault'라는 결과를 RM0090으로 확인하지 않았다(내부 모순 판정은 이와 무관하게 성립).
- 49행 192KB와 159행 128K 중 어느 쪽이 RM0090과 맞는지 1차 자료로 확인하지 않았다.
- 404행 STM32F4 외부 메모리 초기화에 'MMU'가 필요하다는 표현 미확인.
- 262행 `.ccmram`을 `AT >FLASH`로 두면 283행 미초기화 버퍼도 Flash를 차지하는지, 복사 코드가 어디 있는지 설명이 없다.
- 380행 KEEP 누락 시 '객체가 zero-init만으로 시작' 동작 미확인.
- 428행 30432/131072 = 23.22%인데 23.21%로 적혔다. ld의 반올림 방식 미확인.
- 408~419행 CCM 이동 측정과 426~430행 사용량은 출처·환경 없는 수치다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `modern-recipes/part3-04-linker-script-basics.md`(일반 링커 스크립트 기초)와 `tools/debugging/embedded/chapter05-elf-map.md`(map 분석·CCM 다중 영역)다. 이 글은 C++ 섹션 관점이라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다. RAM 크기 모순과 DMA-CCM 모순을 RM0090·GNU ld 매뉴얼로 먼저 고치고, 공통 설명을 줄여 vtable·.rodata·.init_array 배치 추적으로 좁히며, 446행 관련 항목 라벨을 고친다.

### `part1-08-cpp-standard-choice.md` — 56점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 143행 toolchain 표 'ARM Compiler 6 (armclang) — C++17 (완전), C++20 부분', 71행 'ARM Compiler 6도 완전히 지원합니다'(C++17), 161행 결정 트리 '벤더 컴파일러(ARM, IAR, Keil) → C++17 (최대)'
- 145행 Keil MDK 행의 최대 표준 'C++03 (legacy), C++11 (armclang)'

글 스스로 143행에서 armclang = ARM Compiler 6으로 정의했으므로 같은 컴파일러의 최대 표준이 C++17이면서 C++11일 수 없다. git 이력에 1차 자료 대조 커밋은 없다. b12f53a8 'Correct embedded C++ standard guidance'는 출처 없이 133행 한 줄을 완곡 표현으로 바꾼 것이라 검증으로 치지 않는다. 8bf4703f·0a9dd7bc·68525f0c는 링크·slug·코드 블록 산문 정리다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | C++11~23 기능 표(34~50, 58~65, 73~85, 93~106, 122~129행)는 표준별 신기능 목록이라 흔한 내용이다. 이 글만의 것은 임베디드 toolchain 표(139~150행), 결정 트리(158~163행), 같은 일을 표준별로 쓴 코드(227~271행)다. toolchain 표는 137행 '2026년 기준(대략)'으로 출처가 없고, 133행은 b12f53a8 이후 '함께 보고 결정합니다 … 좁힐 수 있습니다'라는 완곡 표현이다. |
| B | 12 | 문제 정의(17~26행) → 표준별 기능 → toolchain 지원(135~152행) → 결정 트리 → 플래그(167~178행) → feature test macro(196~206행) → 코드 크기 → 함정(291~315행) → 정리로 흐름은 끝까지 간다. 161행 'C++17 (최대)'와 143~144행 'C++20 부분'의 관계 설명이 없고, 인증 절(277~283행)은 도구 이름과 예상 연도뿐이다. AP-C-24 B ≤ 13. |
| C | 6 | 플래그 예(167~176행)와 `__cpp_lib_*` 확인 코드(196~206행)는 그대로 쓸 수 있다. 코드 크기 표(210~217행)는 'STM32F4, GCC 13, -Os -flto'만 적고 '같은 코드'가 무엇인지, 어떻게 쟀는지 없다. 319~324행 '약 5K 줄' 업그레이드 결과(-2.4%, -3%, -8%, -12%)도 출처·측정 방법이 없다. C ≤ 8, 재현 절차가 없어 4~7 구간. |
| D | 12 | 같은 시리즈 인접 part1-07(링커 스크립트)·part2-01(RAII)은 겹치지 않는다. part1-02-compiler-flags.md 66~74행 표준 표가 이 글 15·69~131·143행과 같은 결론이지만 1-02 76행이 상세를 이 글로 넘겨 역할이 갈린다. part3-07-expected.md 88~96행 가용성 표와 이 글 163행이 같은 주제, part2-10-concepts.md 412행이 이 글 91행과 같은 문장이다. 다른 시리즈 tools/build/cmake/chapter08-best-practices.md 297~298행은 빌드 설정뿐이다. '표준 선택'·armclang으로 검색했으나 다른 시리즈의 같은 주제 글은 없다. |
| E | 7 | 제목의 C++11/14/17/20/23과 description의 '컴파일러 지원, 표준 라이브러리 변화, 핵심 기능 비교'는 28~131·135~152·180~206행이 다룬다. '트레이드오프'는 대부분 기능 나열이고 비용 근거는 출처 없는 크기 수치(210~219·319~326행)뿐이라 9 이상은 아니다. |
| F | 7 | 345행 다음 글 'Part 2-01: RAII 기초'는 seriesOrder 9 part2-01-raii-basics.md와 맞다. 관련 항목 338~340행 대상(part1-02, part2-10, part3-07)과 131행 본문 링크(part3-07)를 열어 라벨과 맞음을 확인했다. 341행 AUTOSAR는 외부 문서 이름이다. 156~163행 결정 트리는 '위에서부터 차례로 답한다'는 이 글 고유의 읽기 순서다. 전제 지식 안내와 렌더 확인이 없어 9 이상은 아니다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 32·56·71·91·120행 컴파일러 버전 지원 주장과 139~150행 toolchain 표에 GCC·Clang 지원 상태 페이지나 벤더 문서 인용이 없다. 287~289행 AUTOSAR C++14·JSF C++·MISRA C는 이름만 있다. 137행 '2026년 기준'과 71행 '2025년 임베디드의 기본'처럼 기준 시점도 섞여 있다. |

uncertainties:
- 303·178행 '`__attribute__`나 inline asm을 쓰면 gnu++17이 됩니다': GCC는 -std=c++17에서도 `__attribute__`·`__asm__`을 받아들이는 것으로 기억한다. GCC 매뉴얼 미확인.
- 120행 C++23 'Clang 15+'와 142행 'Clang 16+ C++23 (대부분)'의 버전 기준이 다르다. clang C++ status 페이지 미확인.
- 163행 std::expected 'GCC 13+ 필수' vs part3-07-expected.md 92행 'GCC 12+ OK'. 다른 글과의 모순이라 libstdc++ 문서로 정해야 한다.
- 280·281행 C++20·C++23 인증 관련 주장은 출처가 없고 정적 분석 도구와 컴파일러 도구 인증을 구분하지 않는다.
- 289행은 MISRA C만 들고 MISRA C++ 지침은 언급하지 않는다.
- 210~217행(C++14 42 KB, C++17 41 KB)과 319~321행('41KB → 40KB')이 같은 프로젝트라면 C++14 크기가 서로 다르다.
- 210행은 'C++14, C++17, C++20'이라 하고 216행에 C++23 행을 추가했다(개수 표기 실수).
- 255행 'C++17 — string_view 유사'의 예가 `const std::vector<int>&`라 주석과 맞지 않고 동적 할당을 피하는 시리즈 방향과도 어긋난다.
- 71행 '2025년'은 137·279·299행 '2026년' 기준과 섞인 날짜 앵커라 audit:staleness 대상 후보다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 대상 없음 — `part1-02-compiler-flags.md`는 76행에서 상세를 이 글로 넘긴다. 다음 조치는 보강: 143·145·161행 armclang 최대 표준 모순을 Arm Compiler 6 문서로 먼저 고치고, toolchain 표와 크기 수치에 출처·측정 환경을 붙이거나 지운다.

### `part2-01-raii-basics.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(c6b76ff5 최초 작성, 815510c8 TikZ·정리 폴리싱, 39149f68 번역투 폴리싱, 400892d7 린터, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 C++ 표준·CMSIS-RTOS2·STM32 RM과 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 두 구체 진술이 동시에 성립할 수 없는 모순은 찾지 못했다. 코드 결함 의심은 언어·API 지식이 필요해 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | RAII 정의(61~74행), C 짝 맞추기 vs C++ 예(21~57행), Rule of Three/Five/Zero(303~307행), defer·try-with-resources 비교(309~338행)는 C++ 입문서의 표준 목록이다. 이 글만의 부분은 임베디드 자원 다섯 분류(76~86행), UartGuard로 clock까지 끄는 예(143~166행), PRIMASK 보존 InterruptGuard(185~206행)인데 InterruptGuard는 2-02·RTOS 4-13에도 같은 형태로 있다. 59행 '원천적으로 불가능', 473행 '오버헤드가 0'은 조건 없는 단정, 376행은 완곡 표현이다. |
| B | 11 | 문제(17~46행) → 정의(61~74행) → 다섯 패턴(88~281행) → Rule of 3/5/0(283~307행) → 함정 6개(373~443행) → 측정(445~473행) → 정리(475~481행)로 흐름은 갖췄다. UartGuard(144~154행)는 같은 USART2·clock을 다른 코드가 쓰는 경우를 다루지 않고, DmaChannel(252~271행)은 본문이 비어 있으며, 421~425행은 410행 public `Uart(int)`와 맞지 않는 생성자를 부른다. AP-C-24 B ≤ 13. |
| C | 6 | 코드는 많지만 대상 MCU·툴체인이 없다. 147~161행은 STM32F4식 APB1ENR·DR·SR, 256·259행은 `DMA->CCR[channel_]`, 261행은 F1식 `DMA1_Channel1_IRQn`, 276행은 `&UART->TX`를 섞어 한 보드에서 재현되지 않는다. 측정 절(447행)은 'ARM Cortex-M4, -O2'만 적고 컴파일러·버전·소스를 보이지 않으며 두 목록(450~459, 461~470행)이 글자 하나 다르지 않다. C ≤ 8, 4~7 구간. |
| D | 9 | 비교: 같은 시리즈 part1-08-cpp-standard-choice.md(겹침 없음), part2-02-raii-patterns.md, 다른 시리즈 rtos/practical-internals/part4-13-cpp-in-rtos.md. InterruptGuard 185~206행 ↔ 2-02 375~393행 ↔ 4-13 73~105행. 측정 445~473행 ↔ 4-13 423~451행(함수 이름만 다르고 '# 24 bytes — 동일'까지 같음), 2-02 474~492행도 같은 결론. MutexLock 88~137행 ↔ 4-13 26~53행. 함정 6 436~443행 ↔ 2-02 449~455행. 역할은 갈리지만 예제·측정 반복이 커서 5~9 구간. |
| E | 7 | title과 description(5행)의 RAII 원리는 61~74·88~281행이 다룬다. '결정적 소멸 보장'은 69~74행 목록과 404행 외에 정적·전역 소멸 순서, -fno-exceptions에서의 보장 범위를 다루지 않아 부분 미이행으로 6~8 구간. |
| F | 5 | 492행 다음 글 Part 2-02는 seriesOrder 10 part2-02-raii-patterns.md와 맞다. 137·245·485~487행 대상(part2-02, part3-03, part3-05, part3-09)은 라벨과 맞다. 그러나 488행 'GoF 14: Command'는 링크 없는 관련 항목이고 대상 후보 item14-command.md는 draft: true라 틀린 링크로 보아 F ≤ 5. 283행 제목 '3 of 5 규칙'도 303~307행과 맞지 않는다. |
| G | 1 | 본문에 1차 출처가 없다. 69행 'C++ 표준이 ... 보장'에 표준 절 인용이 없고, 95·108행 osMutexAcquire의 CMSIS-RTOS2 버전, 147~161행 레지스터의 대상 MCU·RM, 447행 측정의 컴파일러·버전이 없다. |

uncertainties:
- 388행 `osMutexAcquire(mutex_)`는 인자 하나, 108행은 `osMutexAcquire(mutex_, osWaitForever)`로 둘이다. CMSIS-RTOS2 시그니처로 확인하지 않았다.
- 421~425행 `return Uart(/* private constructor */);`는 410행 public `Uart(int baud)`와 맞지 않는다. 컴파일 가능 여부 미확인.
- 265행 `bool is_done() const { /* */ }`는 반환문이 없다. 256행 `DMA->CCR[channel_]`, 276행 `UART->TX`가 실제 CMSIS 디바이스 헤더에 있는지 미확인.
- 432행 `b1.write(...)`는 344~363행 Buffer에 없는 멤버다(안티패턴 예시라 모순으로 단정하지 않음).
- 449~470행 7개 Thumb-2 명령을 '24 bytes'로 적었다. literal pool·정렬 포함 여부에 따라 달라 단정 못함. part4-13 427~448행과 같아 실측인지 의심.
- 380행 주석 'try/catch로 모든 예외 잡기'에 해당하는 코드가 없다.
- 371행 vector의 copy fallback 설명은 복사 가능한 타입에만 해당하는데 Buffer는 복사 금지다.
- 152행 UartGuard 소멸자의 clock off가 공유 USART2·전송 완료 타이밍에 주는 영향을 RM으로 확인하지 않았다.

병합 대상: `src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md` 후보(critical section 375~393행, 측정 474~492행, scope 함정 449~455행 겹침). 다만 'RAII 기초·원리'는 2-02의 '표준 RAII 도구'와 검색 의도가 달라 다음 조치는 보강이다. InterruptGuard·측정 블록은 2-02 또는 `rtos/practical-internals/part4-13-cpp-in-rtos.md` 한 곳에만 두고 링크로 바꾸며, 이 글은 소멸 보장 범위(-fno-exceptions, 정적 객체, 생성자 실패)를 표준 조항과 함께 다루도록 좁힌다. 측정은 컴파일러·버전·소스를 갖춘 실제 결과가 없으면 지운다.

### `part2-02-raii-patterns.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안에서 동시에 참일 수 없는 진술이다.
- 500행 '모든 RAII는 zero-cost', 492행 'RAII는 zero-cost입니다' vs 219행 소제목 '함수 포인터 deleter — runtime 비용 발생', 227행 'sizeof(UniqueFile)이 8바이트(포인터 + 함수 포인터)', 438행 'sizeof가 두 배', 157행 'unique_lock은 lock_guard보다 약간 무겁습니다', 183행 'new int가 들어가 조금 무겁습니다'.
- 183행 '값 타입을 활용하면 더 가볍게 만들 수 있습니다' vs 186~196행 코드가 여전히 `Fd*`를 받아 194행 `delete fd`로 해제해 heap 할당이 남음(코드와 산문 불일치).

git log에는 0a9dd7bc(slug)·be973200(topic)·ac24bb76(제목) 등 1차 자료 대조가 아닌 커밋뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | lock_guard·scoped_lock·unique_lock·unique_ptr deleter·ScopeGuard(29~304행)는 C++ 입문 자료의 표준 목록이다. 이 글만의 것은 FreeRTOS mutex wrapper(63~98행), pool deleter(201~217행), UART on/off guard(274~288행), `template<auto Enable, auto Disable>` Scoped(310~330행), dismiss rollback(294~303행)이다. 선택 기준은 415~424행 표 한 장뿐이고 실패 사례가 없다. |
| B | 10 | 패턴 8개 → 비교 표 → 함정 6개 → 측정 → 정리 흐름은 끝까지 간다(29~500행). 제목의 DMA는 본문에 한 번도 나오지 않는다(2행 제목뿐). 15·496행은 '표준 RAII 도구 5개'라 하면서 본문은 8개 패턴을 다루고, 500행 정리는 219·227행과 모순된다. AP-C-24 B ≤ 13 안에서 10. FreeRtosMutex의 NULL 처리·ISR 제약은 1차 자료 위치가 없어 감점 근거로 쓰지 않았다(AP-C-31). |
| C | 5 | 대상 MCU·컴파일러·FreeRTOS 버전이 없다. 276~283행 `USART2->SR`·`DR`, 319행 `GPIOA->MODER`를 보드 표기 없이 쓴다. 476~490행 '측정'은 컴파일러·옵션·타깃이 없는 어셈블리다(인접 2-01 447행은 'ARM Cortex-M4, -O2'를 적음). 227행 '8바이트/4바이트'도 32-bit 전제를 밝히지 않았다. C ≤ 8, 실행 조건과 기대 결과가 없어 4~7 구간. |
| D | 6 | part2-01-raii-basics.md와 겹친다: 375~411행 ↔ 2-01 168~206행(PRIMASK), 274~288행 ↔ 2-01 139~166행(UART guard), 61~98행 ↔ 2-01 88~137행(mutex), 332~373행 ↔ 2-01 340~371행(move), 474~492행 ↔ 2-01 445~473행(측정, 결론까지 같음). part3-09-smart-pointer-choice.md와 PoolDeleter(201~217행 ↔ 3-09 67~84행)와 함수 포인터 deleter 함정(434~438행 ↔ 3-09 270~274행)이 겹친다. 다른 시리즈 modern-recipes/part6-05-mutex-usage.md 65~76행이 74~98행과 같은 wrapper다. 2-02만의 몫은 scoped_lock·unique_lock·ScopeGuard/dismiss·Scoped<auto> 정도다. |
| E | 6 | 제목은 'Lock·Pin·DMA·Power 관리'를 약속한다. Lock은 29~159행, Pin은 319~327행 두 줄 함수, Power는 UART UE on/off(272~288행)로만 다루고 DMA는 본문에 없다(DMA Channel 예는 2-01 247행에 있다). 15행 '표준 라이브러리가 5개의 RAII 도구를 제공'은 직접 구현하는 ScopeGuard(235~255행)·GSL(270행)을 표준에 넣어 약속을 부풀린다. |
| F | 7 | 511행 다음 편 안내는 seriesOrder 11 part2-03-constexpr-basics.md와 맞다. 관련 항목 504~507행(2-01, 3-03, 3-09, 4-03)을 열어 라벨과 제목이 맞음을 확인했다. 패턴별 H2와 415~424행 비교 표가 긴 코드의 방향을 잡는다. 전제 지식 안내와 렌더 확인이 없어 9 이상은 아니다. |
| G | 1 | 본문 출처 링크가 없다. C++11(31행)·C++17(46·100·330행) 이름만 있고 cppreference·표준 조항 연결이 없다. 270행 `gsl::finally`에 C++ Core Guidelines 링크가 없고, FreeRTOS 버전·CMSIS(383행 `__get_PRIMASK`)·대상 MCU 레퍼런스 매뉴얼이 없다. |

uncertainties:
- 15·496행 '표준 라이브러리가 제공하는 5개 도구'에 ScopeGuard를 넣었지만 표준 라이브러리에는 scope guard가 없다고 알고 있다(Library Fundamentals TS v3 scope_exit). 1차 자료 미확인. 개수 불일치는 산문 표기라 오류 확인에 넣지 않았다.
- 254행 `_guard_##__LINE__`은 ## 때문에 __LINE__이 확장되지 않아 한 scope에서 두 번 쓰면 이름이 겹칠 수 있다. 전처리 규칙 미확인.
- 114행 'scoped_lock 내부는 보통 try_lock + back-off'의 표준 근거 미확인.
- 478~489행 어셈블리는 `bl` 뒤 lr 저장 없이 `bx lr`로 돌아가 그대로는 성립하지 않는 코드로 보인다(2-01 451~468행은 push {r4, lr}/pop {r4, pc}).
- 227행 '8 → 4바이트'는 32-bit 타깃 전제 값이다.
- 330행 '오버헤드 0'은 인라인 여부에 달린 주장이고 측정 근거가 없다.
- 64~85행 FreeRtosMutex가 생성 실패(NULL)·반환값·ISR 제약을 다루지 않는다. FreeRTOS 문서 미확인.
- 373행·420행 'heap' 서술과 217행 'heap 자체는 사용하지 않습니다'의 결이 다르다.
- 417행 표의 lock_guard 특징 'copy-only-delete'는 뜻이 불분명하다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `part2-01-raii-basics.md`(critical section·UART guard·mutex wrapper·측정 절 중복)와 `part3-09-smart-pointer-choice.md`(PoolDeleter·함수 포인터 deleter 함정 중복)다. 다음 조치는 보강: 500·492행 zero-cost 정리와 183~196행 코드-산문 불일치를 먼저 고치고, 2-01과 겹치는 절은 링크로 줄이며 scoped_lock·unique_lock·ScopeGuard/dismiss·Scoped<auto>와 제목의 DMA를 이 글의 몫으로 차별화한다.

### `part2-03-constexpr-basics.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 7개 커밋(c6b76ff5 작성, 815510c8·39149f68 문체, 400892d7 린터, ac24bb76 제목, be973200 topic, 0a9dd7bc slug) 중 C++ 표준·cppreference·컴파일러 출력과 대조한 커밋은 없다. 원문 안의 수치·산술 모순도 확정하지 못했다(41행 3628800=10!, 257행 3200=100×2^5, 118행 256×4=1024 모두 맞음). V1 어셈블리와 C 코드의 불일치는 ARM 명령 의미를 알아야 판단되는 코드 결함이라 3-1절에 따라 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | constexpr 변수·함수와 const 차이(62~71행), C++14 완화(86~97행), if constexpr(193~220행), static_assert(222~234행), 제약 목록(285~302행)은 C++ 입문 자료에 흔하다. 임베디드 예제는 Taylor sin LUT(99~135행), CRC32 테이블(137~163행), GPIO 주소 계산(176~191행), V1/V2 어셈블리 비교(236~283행)다. 124행 정규화 '생략', 304행 'GCC 13 약 90%', 357행 '256~4096 entry'는 근거 없는 단정이다. |
| B | 11 | 문제(17~44행) → 변수·함수 → LUT·CRC·레지스터 → if constexpr → static_assert → 어셈블리 → 제약 → consteval/constinit → 함정 → 측정 → 정리(390~396행)로 흐름은 끝까지 간다. 109행 angle 0~2π인데 taylor_sin은 정규화를 생략했고(x=2π에서 첫 생략 항 약 0.7), 110행이 123행 정의 전에 taylor_sin을 호출한다. 326행 compute_initial은 정의가 없다. 298·301행은 같은 코드에 '안 됨/됨'만 붙인다. 101행과 388·393행의 RAM 비교 기준이 다르다. AP-C-24 B ≤ 13, 10~15 구간 하단. |
| C | 6 | 코드 조각은 많지만 컴파일러·버전·플래그가 없다. V1·V2 어셈블리(262~274·278~281행)는 어떤 컴파일러·-O 단계 출력인지 없다. 측정 절(372~386행)은 'STM32F4'만 적고 '.text +180 B', 'init time ~50 us'를 클록·툴체인·방법 없이 둔다. 168~174행 '+200 바이트'도 출처가 없다. C ≤ 8, 실행 조건이 없어 4~7 구간. |
| D | 10 | part2-04-constexpr-advanced.md는 제목이 'LUT·CRC·해시'인데 LUT·CRC는 이 글 99~163행이 다루고, 함정(353~357행 ↔ 2-04 289~290행)과 constexpr new(289·298~301행 ↔ 2-04 233~235행)가 겹친다. part2-05-consteval-constinit.md와 square/read_input 예제(76~81·311~316행 ↔ 2-05 22~25·40~47행), constinit counter(326행 ↔ 2-05 119·274행)가 반복된다. 다른 시리즈 effective-modern-cpp item15(108~122행), beautiful-cpp item22(94~100행), autosar-cpp chapter12(87~92행)는 모두 draft다. 공개 글 rtos/practical-internals/part4-13-cpp-in-rtos.md는 463행 한 줄뿐이다. |
| E | 6 | 제목 키워드 'constexpr 기초'(46~97행), '임베디드 적용'(99~191행), '컴파일 타임 계산 활용'(236~283행)은 모두 다룬다. description 5행 '-Os보다 강력한 zero-cost'는 본문에 -Os 비교가 없어 이행되지 않았고, 283행 '완전한 zero-cost'도 V1의 최적화 단계를 밝히지 않는다. 6~8 구간 하단. |
| F | 7 | 407행 다음 글은 seriesOrder 12 part2-04-constexpr-advanced.md와 맞고 'sort, search, 문자열' 안내도 그 글 H2(28·69·95행)와 맞다. 관련 항목 400~403행(2-04 12, 2-05 13, 1-07 7, 5-01 37)과 본문 319행(2-05), 332행(part1-06, SIOF는 그 글 234행)을 열어 맞음을 확인했다. 전제 지식 안내가 없고 렌더 확인을 하지 않아 8 이상은 아니다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 289~294행 제약 목록, 304행 'GCC 13 약 90%', 108·135·351행 'std::sin은 constexpr 아님/C++26 대기'에 표준 문서·cppreference·제안서 출처가 없다. 어셈블리(262~281행)와 측정(376~386행)에 컴파일러 버전이 없다. |

uncertainties:
- 262~274행 V1 어셈블리: C 코드(244행)는 signed `i < level`이라 음수 level이면 루프를 돌지 않는데, 어셈블리는 `cbz r0`로 0만 검사하고 `subs/bne`로 0이 될 때까지 감소해 음수 level에서 약 2^32회 돈다. ARM 명령 의미에 기대는 판단이라 오류 확인 대신 여기에 둔다.
- 260행 'V1의 어셈블리는 루프 실행과 함수 호출이 그대로 남습니다'라고 했지만 목록에는 함수 본체만 있고 호출 지점이 없다.
- 124행 taylor_sin 정규화 생략으로 x=2π 근처 오차 약 0.7이라고 계산했지만 실행으로 확인하지 않았다.
- 169~170행 '+200 바이트, +1024(테이블)'와 378~379행 '.text +180 B, .bss +1024 B'는 같은 C 초기화를 가리키는데 값과 섹션 분류가 다르다.
- 101행 'RAM/Flash 공간은 그대로'와 388·393행 'RAM에서 Flash로/RAM을 절약'의 비교 기준이 다르다.
- 304행 'GCC 13은 C++20 constexpr의 약 90% 지원'은 출처가 없다.
- 108·135·351행 'std::sin은 C++26 정도까지 constexpr 아님' — C++26 constexpr cmath 제안에 sin이 들어가는지 미확인.
- 290행 '예외 throw 불가(C++20에서 부분 완화)' 미확인.
- 369~370행 mutable 설명이 C++14 '암묵적 const 제거' 변경과 섞인 것으로 보이나 미확인.
- 298~301행 'new int(42)를 반환하는 함수가 됨' 설명이 상수 평가 안 해제 조건(2-04 235행)과 맞는지 1차 자료로 정해야 한다.
- 380행 'init time ~50 us'는 클록·코드 없는 수치다.

병합 대상: 후보는 `src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md`(제목의 LUT·CRC가 이 글 99~163행과 겹침)와 `src/content/blog/embedded/embedded-cpp/part2-05-consteval-constinit.md`(이 글 306~332행이 2-05 22~47·114~119행과 같은 예제)다. 'constexpr 기초'는 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. 306~332행은 2-05 링크 한 줄로 줄이고, 2-04 제목의 'LUT·CRC'와 역할 분담을 시리즈 차원에서 정한다. 어셈블리·측정 수치에 컴파일러·플래그·클록을 붙이거나 확인하지 못하면 지운다. taylor_sin 정규화(124행)와 정의 순서(110행 ↔ 123행)를 고치고, description의 '-Os보다' 비교를 본문에 넣거나 지운다.

### `part2-04-constexpr-advanced.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순이다.
- 175~181행: kMaxTasks = 16, kStackSize = 2048, kTotalStackMemory = kMaxTasks * kStackSize, kAvailableRamForStacks = 64 * 1024, `static_assert(kTotalStackMemory <= kAvailableRamForStacks)`.
- 184행 주석 'kMaxTasks를 32로 늘리면 — 컴파일 에러'.

32 × 2048 = 65536 = 64 × 1024이므로 `<=` 조건이 참이 되어 static_assert는 통과한다. 코드와 주석이 함께 참일 수 없다. git log(fd75c82d 작성, 39149f68·815510c8·400892d7 문체·린터, ac24bb76 제목, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | sort(28~65행), binary search(69~93행), starts_with(95~117행), FNV-1a 해시(119~143행), enum-to-string(211~231행), constexpr vector(233~252행)는 constexpr 소개 자료에 흔한 예제다. 임베디드 쪽은 Q16.16 변환(149~168행), 핀 마스크(193~209행), 주변장치 설정 배열(258~285행) 정도이고 코드 한 조각과 한두 문장으로 끝난다. 67·317행 'toolchain을 확인'은 지원 표 대신 쓴 완곡 표현이다. |
| B | 10 | 문제 정의(17~26행) → 기법별 예제 → 함정(287~317행) → 한계(319~327행) → 측정(329~347행) → 정리(349~355행)로 흐름은 끝까지 간다. 276~282행 find_irq는 루프 본문이 `// ...`이고 name 인자를 쓰지 않는 빈 함수다. 해시 dispatch(131~143행)는 해시 충돌 시 case 중복 문제를 말하지 않는다. 제목의 CRC는 본문에 없다. 오류 확인으로 B ≤ 13 안에서 10. |
| C | 6 | 90·113~114행 static_assert는 컴파일로 확인 가능하지만 컴파일러 버전·-std 옵션이 없다. 333~345행 '.text +312 B', 'init time ~12 ms'는 환경이 331행 'STM32F4' 한 단어뿐이다(C ≤ 8). 184행 주석은 코드와 맞지 않고 276~282행은 빈 스텁이라 복사해도 동작하지 않는다. |
| D | 9 | 174~185행 스택 예산 static_assert(16 × 2048)는 part2-05-consteval-constinit.md 210~235행과 같은 예제다. 함정 289~290행 ↔ part2-03-constexpr-basics.md 354~358행, 292~297행 ↔ 2-03 360~365행, 302~308행 ↔ 2-03 346~352행이 문장까지 겹친다. 319~327행 한계 목록은 2-03 285~298행과 같다. 329~345행 sin table 측정은 2-03 99~118·372~386행과 같은 틀이다. part5-01-register-abstraction.md는 구별된다. 다른 시리즈 같은 주제 글(beautiful-cpp item22, effective-modern-cpp item15, folly part8-02)은 평가자 보고대로 draft다(직접 열지는 않음). |
| E | 4 | 제목(2행)이 '룩업 테이블·CRC·해시 컴파일 타임 생성'을 약속한다. 해시는 119~143행에 있다. CRC는 본문에 0건이다(CRC 테이블은 part2-03 137~158행에 있다). 룩업 테이블 생성 코드도 없고 331행 측정 설명에서 sin table을 언급할 뿐이다. 셋 중 둘이 빠져 3~5 구간. description(5행)은 본문과 맞다. |
| F | 7 | 19행이 전제 글 part2-03을 링크하고 범위를 밝힌다. 365행 다음 글은 seriesOrder 13 part2-05-consteval-constinit.md와 맞다. 관련 항목 359~361행(part2-03, part2-05, part5-01)은 라벨이 대상과 맞다. 렌더 확인을 하지 않아 9 이상은 아니다. |
| G | 1 | 본문에 cppreference·표준 제안서·컴파일러 릴리스 노트 링크가 없다. 67행 'GCC 10+, Clang 12+', 117행 C++20 starts_with, 235행 constexpr new, 305·308행 C++26 주장에 출처가 없고, 331행 측정에 보드·toolchain 버전이 없다. |

uncertainties:
- 67행 'GCC 10+, Clang 12+에서 동작': constexpr std::sort는 libstdc++/libc++ 버전에 달렸다. 1차 자료 미확인.
- 240행 constexpr std::vector의 표준 라이브러리 구현 지원 버전 미확인.
- 305·308행 'std::sin은 constexpr 아님 … C++26': C++26 constexpr cmath 제안 포함 여부 미확인.
- 335·337행 '.text +312 B', '~12 ms': 클록·최적화 옵션·출처가 없다.
- 143행 '4바이트 정수 비교 한 번': switch는 case 수에 따라 여러 번 비교하거나 점프 테이블이 되므로 과단순화일 수 있다(B에만 반영).
- 15·351행 'parse까지/parse를 모두 수행': 본문에 parse 예제는 starts_with뿐이다(A·B에 반영).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `part2-03-constexpr-basics.md`(함정·한계·측정 절 중복, CRC·LUT 원본이 그쪽에 있음)다. sort·binary search·해시 dispatch·fixed-point 변환은 2-03에 없는 독립 검색 의도라 다음 조치는 보강이다. 184행 주석을 고치고(32 × 2048 = 64 KB는 통과, 33 이상에서 실패), 2-03과 겹치는 함정 1·2·4번(289~308행)·한계 목록(319~327행)·sin table 측정(329~347행)을 2-03 링크로 바꾸고, find_irq 스텁을 채우고, 제목의 CRC·LUT 약속을 본문에 맞게 좁힌다.

### `part2-05-consteval-constinit.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 평가 중 1차 자료 WG21 P0784R7 'More constexpr containers'(open-std.org, 2019-07-19)를 열었다.
- 279~280행 '3. consteval 안에서 dynamic alloc — C++20에서는 불가능하며, C++26 정도까지 기다려야 합니다'
- P0784R7 [expr.const]: '상수 표현식을 평가하는 동안 할당 함수 호출은 항상 생략된다', new-expression은 '할당한 저장 공간을 평가 e 안에서 해제하는 경우' 허용. 'Adopt P0784R5 without non-transient allocation into C++20' 채택 기록.

이 규칙은 consteval 호출을 포함한 상수 평가 전체에 적용되므로 C++20은 transient allocation을 허용한다. 280행은 틀렸다. P0784R7은 WebFetch 요약으로 읽었으므로 N4861 [expr.const]와 한 번 더 대조하는 것이 좋다. git log(fd75c82d 작성, 815510c8·39149f68 문체, 400892d7 linter, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 예제는 포트·핀 범위를 consteval로 검사하는 make_pin(54~68행), 매크로 PIN_MASK를 consteval pin_mask로 바꾼 예(76~88행), hex 생성자만 consteval로 둔 Color(159~182행), config 값 static_assert 검사(211~243행)다. consteval/constexpr 표(92~98행), const/constinit/constexpr 구분(130~138행), if consteval(186~205행), lambda(247~258행)는 C++20 소개 자료에 흔하다. 258·286행은 구체 주장 대신 쓴 일반론이다. 고유 예제가 많아 6~12 구간 위쪽. |
| B | 12 | 문제 정의(17~33행) → consteval·constinit → 비교(90~138행) → if consteval(186~205행) → 설정 검증(207~245행) → 함정 6개(260~289행) → 정리(321~327행)로 흐름은 끝까지 간다. 279~280행 함정 3은 두 문장뿐이고 사실도 틀렸다. 285~286행은 어떤 버전이 무엇을 지원하는지 적지 않았고, 컴파일 에러 예(47·67·87·181행)에 진단 메시지가 없다. 정확성 불확실(265·296·326행)이 열려 있어 AP-C-24 B ≤ 13. |
| C | 5 | 컴파일 명령, 컴파일러 버전, -std 플래그, 예상 진단 출력이 없다. read_input(25·46행), make_logger·Logger(123·144~150행), slow_but_precise·fast_approximate(194·197행)는 정의되지 않아 그대로는 컴파일되지 않는다(AP-C-35). '측정' 절(291~306행)은 결과 없이 주석 '0 운영비'(299·301·303행)만 있다. 326행 'GCC 10+, Clang 12+'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 11 | part2-03-constexpr-basics.md 306~319행 consteval 절의 square 예제(311~317행)가 이 글 40~47행과 같고, 321~332행 constinit 절의 SIOF 링크 문장(332행)이 이 글 126행과 같다. 다만 2-03 319행이 '자세한 내용은 Part 2-05'라며 넘기는 미리보기 수준이다. part2-04-constexpr-advanced.md(233~240행)는 겹치는 절이 없다. part1-08 98~99·127행은 표 한 줄씩이다. 다른 시리즈 beautiful-cpp item22 121~133행(같은 square 예제), autosar-cpp chapter12, google-cpp chapter07은 모두 draft다. |
| E | 5 | 제목(2행)은 '분석'과 '컴파일 타임 강제 메커니즘'을 약속한다. 본문은 기능 소개와 예제 수준이다. immediate invocation 평가 시점, constant initialization과 dynamic initialization의 경계 같은 메커니즘 설명은 37·116행의 한 문장 정의뿐이다. 291행 '측정' 절도 측정을 하지 않는다. 루브릭 E 주석(3~5) 적용. |
| F | 6 | 338행 다음 글 안내(Part 2-06 Templates 기초)는 seriesOrder 14 part2-06-templates-basics.md와 맞다. 관련 항목 331~334행(part2-03 11, part2-04 12, part1-06 SIOF 234행, part1-08 98~99행)을 열어 라벨과 내용이 맞음을 확인했다. 126행 본문 링크 라벨은 글 제목이 아니라 대상 글의 한 절 이름이지만 번호와 대상은 맞다. 전제 지식 안내가 없고 audit:reading을 확인하지 않았다. |
| G | 1 | 본문에 출처 링크가 없다. P1073(consteval), P1143(constinit), P1938(if consteval) 같은 제안서와 표준 절을 인용하지 않았다. 326행 'GCC 10+, Clang 12+'와 286행 'ARM Compiler 6, IAR 일부'에 컴파일러 문서 근거가 없다. 예제를 확인한 컴파일러·버전 표기도 없다. |

uncertainties:
- 265~270행 'OK in C++23, ERROR in C++20': P2564(consteval 전파)가 C++23 채택인지 C++20 DR인지 1차 자료로 확인하지 않았다. 267행 'OK' 주석에는 C++23 표기가 없다.
- 326행 'GCC 10+, Clang 12+'와 286행 'ARM Compiler 6, IAR 일부는 consteval 미지원': 컴파일러 지원표나 벤더 문서 미확인.
- 126행 '모든 static 변수가 main 진입 전에 초기화되도록 보장': constinit은 키워드를 붙인 변수에만 적용되므로 과장일 수 있다.
- 123행 `constinit auto* g_logger = make_logger()`의 'OK if make_logger is constexpr': 동적 할당 포인터를 반환하면 상수 초기화가 될 수 없다.
- 296행 '모두 같은 결과 (Flash에 상수 박힘)'·306행 '런타임 비용은 동일하게 0'과 275행 'constinit은 mutable'의 관계: mutable constinit 변수는 .data(RAM)에 놓여 시작할 때 복사된다. objdump로 확인하지 않았다. 240·245행도 같은 문제다.
- factcheck 근거인 P0784R7은 WebFetch 요약으로 읽었다. N4861 [expr.const]와 한 번 더 대조하는 것이 좋다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 대상 없음 — 시리즈에서 consteval/constinit을 전담하는 글은 이 글뿐이고, `part2-03-constexpr-basics.md` 306~332행은 이 글로 넘기는 미리보기다. 다음 조치는 280행 오류를 P0784R7 기준으로 고치거나 지운 뒤 보강이다. 2-03과 겹치는 square 예제·SIOF 문장을 정리하고, 컴파일러·버전별 진단 출력, constant initialization 메커니즘 설명, 265·286·326행 주장의 1차 출처를 넣는다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 작성 커밋(025aadd5, fce8a288, c6b76ff5, fd75c82d) 이후 문체 폴리싱(815510c8·39149f68), linter(400892d7), 제목 일괄 변경(ac24bb76), topic(be973200), slug(0a9dd7bc) 커밋뿐이다. 1-08의 b12f53a8은 출처 없이 문장을 완곡하게 바꾼 커밋이라 검증으로 치지 않는다(같은 커밋이 part2-06·part3-06에도 적용됨). `factcheck: 검증됨`은 0편이고 오류 확인은 8편이다. Embedded C++ for Real Systems는 `/fact-check-round` 대상이다.
- **본문에 1차 출처·툴체인 버전이 없음 (10편 전부, G 1).** binutils·GNU ld 매뉴얼, Itanium C++ ABI, AAPCS, RM0090, cppreference·WG21 제안서, CMSIS-RTOS2·FreeRTOS 문서 링크가 한 편에도 없다. arm-none-eabi GCC 버전도 없다(1-04 323행, 1-05 48·281행, 1-06 138·328행, 1-07 46~50행, 1-08 139~150행, 2-03 304행, 2-04 67행, 2-05 326행).
- **출처·환경 없는 '측정' 절 (9편, C ≤ 8 상한 반복).** 1-04 384~408행, 1-05 499~516행, 1-06 338~358행, 1-07 406~419행, 1-08 317~326행, 2-01 445~473행, 2-02 474~492행, 2-03 372~386행, 2-04 329~347행에 'STM32F4' 수준의 환경만 있거나 환경이 없다. 2-05 291~306행은 '측정' 제목에 결과가 없다.
- **예시 출력이 같은 글의 코드·다른 출력과 맞지 않음 (6편).** 1-04 391행 dec/hex·311~312행 섹션 겹침·396~404행 묶음 행, 1-05 506~513행 nm 출력 vs 177~201행 logger.cpp, 1-06 342~353행 생성자 수·주소 영역, 1-07 357~361행 map vs 170~173행, 2-02 478~489행 lr 저장 없는 어셈블리, 2-03 262~274행 V1 어셈블리 vs 244행. 측정 절이 실제 실행 없이 채워졌을 가능성이 있어 나머지 장의 출력 예시도 대조가 필요하다.
- **같은 측정 블록 복제 (3편).** RAII overhead 어셈블리와 '24 bytes — 동일'이 2-01 449~470행과 rtos/practical-internals/part4-13 427~448행에 함수 이름만 다르게 있고, 2-02 474~492행도 같은 'zero-cost' 결론이다.
- **제목 키워드를 본문이 이행하지 않음 (6편, E 감점).** ac24bb76 제목 일괄 변경으로 본문보다 넓은 키워드가 붙었다. 1-04 '예외 비용'(232·237행 두 줄), 1-05 'Itanium ABI·vtable 레이아웃'(48·334~344행), 1-07 'vtable'(본문 0건), 2-02 'DMA'(본문 0건, 2-01 247행에 있음), 2-04 'CRC·룩업 테이블'(본문 0건, 2-03 99~163행에 있음), 1-06·2-05 '분석'(개념 소개 수준).
- **시리즈 안 예제·설명 반복 (D 감점, 8편).** 부트 시퀀스(1-03 128~146행 ↔ 1-06 40~64행), .init_array 링커 조각(1-06 163~171·316~322행 ↔ 1-07 104~111·204~209행), 템플릿 bloat 예제(1-04 258~278행 ↔ 2-07 28~56행), PRIMASK critical section(2-01 185~206행 ↔ 2-02 375~393행 ↔ 4-13 73~105행), PoolDeleter(2-02 201~217행 ↔ 3-09 67~84행), constexpr 함정·한계(2-03 285~298·346~365행 ↔ 2-04 289~327행), square·constinit 예제(2-03 311~332행 ↔ 2-05 40~47·126행), 스택 예산 static_assert(2-04 174~185행 ↔ 2-05 210~235행).
- **다른 시리즈 같은 주제 글과 겹침 (5편).** 1-04 ↔ tools/debugging/embedded/chapter05-elf-map.md 496~523행, 1-05 ↔ modern-recipes/part8-02-memory-alignment.md 48~126행, 1-06 ↔ modern-recipes/part3-06·part3-07, 1-07 ↔ modern-recipes/part3-04-linker-script-basics.md·chapter05-elf-map.md, 2-02 ↔ modern-recipes/part6-05-mutex-usage.md 65~76행.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 어떤 문제를 푸는가 → … → 자주 보는 함정과 안티패턴 → 측정 → 정리 → 관련 항목 → 다음 글'(예: 1-04 13·17·358·384·410·418·425행, 1-05 13·17·451·499·518·526·532행, 2-01 13·17·373·445·475·483·490행, 2-04 13·17·287·329·349·357·363행). 1-06 평가에서 시리즈 41편 중 40편이 같은 뼈대, 39편에 '## 다음 글'이 있음을 확인했다. 루브릭 9절 scaled content 수치 기록 대상이다.
- **글 사이 사실 충돌 (4편 관련).** 컴파일 타임 동적 할당(2-05 280행 'C++20 불가' vs 2-03 289행·2-04 235·354행 'C++20 허용' — P0784R7 기준 2-03·2-04가 맞음), std::expected 최소 GCC(1-08 163행 13+ vs part3-07 92행 12+), unaligned access(1-05 407행 vs modern-recipes part8-02 116행). 다른 글과의 모순이라 해당 글의 오류 확인 근거로는 쓰지 않았다. 2-05 건은 `data/known-falsehoods.yaml` 등재 후보다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 8편은 오류 건수 순으로 본다. 1-04(4건: dec/hex, 함수 크기, 비율, .rodata 주소), 1-05(2건: 패딩 산술, nm 출력), 1-06(2건: trivial static_assert, -fno-use-cxa-atexit), 1-07(2건: RAM 192K/128K, DMA-CCM), 2-02(2건: zero-cost 정리, 값 타입 코드), 1-08(armclang 최대 표준), 2-04(184행 static_assert 주석), 2-05(280행 constexpr 할당). GCC 매뉴얼·실제 컴파일 결과, RM0090, GNU ld 매뉴얼, Arm Compiler 6 문서, WG21 문서를 열어 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 F 감점 원인을 고친다: 1-07 446행 Part 3-03 라벨, 2-01 488행 링크 없는 GoF 14(draft 대상) 항목. 출처 없는 측정 절은 실제 측정(툴체인·버전·클록·소스)으로 바꾸거나 지운다.
- 병합 검토 2편: 2-01은 InterruptGuard·측정 블록을 2-02 또는 part4-13 한 곳에 모으고 소멸 보장 범위를 채우는 방향, 2-03은 306~332행을 2-05 링크로 줄이고 2-04와 LUT·CRC 역할을 정리하는 방향으로 보강을 검토한다.
- 제목 키워드 미이행 6편(1-04·1-05·1-07·2-02·2-04, 1-06·2-05 '분석')은 본문을 채울지 제목을 좁힐지 사용자가 정한다. ac24bb76로 바뀐 시리즈 나머지 글도 같은 대조가 필요하다.
- '글 사이 사실 충돌'은 Embedded C++ for Real Systems `/fact-check-round`에서 한 번에 정한다. 2-05 280행 건은 수정 뒤 `known-falsehoods` 등재를 검토한다. 측정 절 복제·예시 출력 불일치 패턴은 나머지 장(part2-06 이후)에도 있는지 grep으로 수를 센 뒤 다음 루프 채점에 반영한다.
