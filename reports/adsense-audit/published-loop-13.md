# 공개 글 AdSense 평가 — 루프 13

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-13.md) · [재검토 기록](double-check-loop-13.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일 2026-10-19. 루브릭 v1.2·anchors·antipatterns 적용, HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. Luna 초벌 없이 Sol이 대상10편 원문 전문과 D 양쪽 구간, F 링크 전체행의 후행 설명 및 실제 대상 title/slug/seriesOrder/draft를 직접 확인했다. 본문·기존보고서·사용자변경은수정하지않았다. 전편 score_status=잠정, confidence=중간.

표/같은시리즈part파일은`src/content/blog/embedded/embedded-cpp/`기준이다. Recipes=`src/content/blog/embedded/modern-recipes/`,RTOS=`src/content/blog/embedded/rtos/practical-internals/`,Embedded Debug=`src/content/blog/tools/debugging/embedded/`,CMake=`src/content/blog/tools/build/cmake/`.다른C++시리즈는`src/content/blog/programming/cpp/`,AUTOSAR는`src/content/blog/embedded/automotive/autosar-cpp/`. Recipes는D비교에허용. anchor_ref는루프15에서실제읽은git10550ca1옛Recipes UART(part1-04)49/ISR(part6-09)40/Build(part7-05)50전문이다.현재개선본/Part12rename와구분한다.

대상은기존보고서ba9f7104이후diff없다.E의수정은기존독해오류교정이며비교글변경효과가아니다.[공통 게이트](double-check-gates-2026-10-18.md)의check/build/links/sitemap/ads/anchors/reading통과인용은전체기술정확성/모바일육안확인이아니다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-04-code-size-analysis.md` | 11 | 11 | 7 | 9 | 6 | 7 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-05-abi-compatibility.md` | 11 | 11 | 6 | 10 | 4 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-06-startup-code.md` | 10 | 11 | 5 | 8 | 5 | 7 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-07-linker-scripts.md` | 11 | 10 | 6 | 8 | 5 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-08-cpp-standard-choice.md` | 11 | 12 | 6 | 12 | 7 | 7 | 1 | **56** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-01-raii-basics.md` | 10 | 11 | 6 | 9 | 7 | 5 | 1 | **49** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-02-raii-patterns.md` | 11 | 10 | 5 | 6 | 6 | 7 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-03-constexpr-basics.md` | 11 | 11 | 6 | 10 | 6 | 7 | 1 | **52** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-04-constexpr-advanced.md` | 11 | 10 | 6 | 9 | 6 | 7 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-05-consteval-constinit.md` | 12 | 12 | 5 | 11 | 5 | 6 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계499, 평균49.9, 범위46~56. 이전497 대비+2. 우선조치8편·병합검토2편, 오류확인8·미검증2. 총점동의9/10·판정동의10/10. 기존오류상태는유지하되RAII패턴/표준선택의약한기존근거를독립실행근거로교체했다.전편잠정.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `part1-04-code-size-analysis.md` | 52 | 52 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part1-05-abi-compatibility.md` | 49 | 49 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part1-06-startup-code.md` | 47 | 47 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part1-07-linker-scripts.md` | 46 | 46 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part1-08-cpp-standard-choice.md` | 56 | 56 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part2-01-raii-basics.md` | 49 | 49 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 미검증 유지 |
| `part2-02-raii-patterns.md` | 46 | 46 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |
| `part2-03-constexpr-basics.md` | 52 | 52 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 미검증 유지 |
| `part2-04-constexpr-advanced.md` | 48 | 50 | +2 | 우선 조치 | 우선 조치 | E4→6:LUT/lookup질문실제이행,CRC누락만유지 |
| `part2-05-consteval-constinit.md` | 52 | 52 | +0 | 우선 조치 | 우선 조치 | A~G점수동의;오류근거실행/범위교정 |

## 오류 게이트 실행과 채택·기각

프로브는`/private/tmp/adsense-loop13-{counter,alloc,stack,attribute,opaque,finally}.{cpp,c}`다.macOS clang/clang++에`-std=c++17`또는`c++20/c11`·`-pedantic-errors -fsyntax-only`를사용했다.Counter는원문class/검증을추출하고표준헤더만추가했다.FINALLY도원문helper/매크로를추출하고<utility>와서로다른두cleanup사용만추가했다.전체STM32펌웨어/FreeRTOS의구동·Flash크기측정이아니다.

- Counter static_assert와FINALLY는exit1로재현됐다.스택경계32tasks,transientconsteval allocation,순수c++17모드의GNUattribute,C의불완전struct포인터는각각exit0이다.
- [GCC 공식 C++ Dialect Options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)의-fuse-cxa-atexit항목은루프12에서직접읽은대로__cxa_atexit를atexit대신사용하는계약이다.-fno형태가소멸자제거라는본문1-06설명은그계약과맞지않는다.
- 1-07은DMA용/같은CCM에대한명시적금지와성공사례가충돌하는두위치로오류확정한다.128/192K라는서로다른예시설정만으로게이트를확정하지않는다.
- 1-08은표준전체/부분지원·벤더번들판차이를구분해기존표충돌근거를낮췄다.독립적으로틀린-std/extension설명을컴파일반례로확인했다.
- RAIIzero-cost와포인터/자원크기는다른축이며권고‘가벼워짐’과미완성스케치가곧내부모순은아니다.기존2-02근거는기각하지만실제FINALLY다중사용실패가있어오류상태는유지된다.

Luna초벌은없다.전문대조한기존A/B/C/E/G근거중정확한부분을채택했고D/F는양쪽실제문맥으로다시썼다.2-04의‘LUT생성코드없다’는기존E근거는21/28~65/69~93행을빠뜨린독해오류여서기각한다.제목에CRC가없는문제는남지만세키워드중두개가빠졌다는감점은철회한다.본문/비교글수정에의한상승이아니다.

## 글별 근거

### `part1-04-code-size-analysis.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-04-code-size-analysis.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.391행94816의hex는0x17260인데0x1722c(94764)로표기했다.Python으로합68192+2048+24576/진법변환확인.396~397행18.4+14.2=32.6%와408행절반도맞지않는다.311~312행text끝0x80049cc와rodata시작0x80043cc는동일표의구간중첩.167행Thumb길이는기억만으로새오류확정하지않고인코딩을보조근거로둔다.

uncertainties:
- 300행 'vtable은 virtual 함수 수 × 4바이트': Itanium C++ ABI vtable에는 offset-to-top·typeinfo 포인터도 들어간다는 기억(ABI 문서로 확인하지 않음). 295~297행 크기(32·64·24B)는 ×4 공식과 모순되지 않는다.
- 77행 awk가 보는 $4는 dec(text+data+bss)라 bss까지 더한 값이다. Flash 임계치처럼 쓴 것이 의도인지 미확인.
- 87~93·123행: --print-size를 줬는데 출력에 크기 열이 없다(B에 반영).
- 93행 __libc_init_array 크기 0x18f0(6384B)는 그럴듯하지 않은 값이고 출처가 없다.
- 163행: 링크된 ELF인데 bl 인코딩이 f7ff fffe(미재배치 형태)이면서 대상이 400 <printf>로 풀려 있다. 실제 출력인지 의심된다.
- 396~404행 bloaty 출력의 묶음 행('HAL driver functions', 'FreeRTOS internals')은 실제 측정 출력인지 의심된다.
- 205~207행 bloaty diff 백분율 기준을 bloaty 문서로 확인하지 않았다.
- 370행 'nm에 없는 함수는 인라인된 상태': --gc-sections로 제거된 경우도 있다. 확인하지 않았다.
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | size·nm·objdump·bloaty 옵션 나열(43~210행)은 binutils·bloaty 사용법과 같은 일반 내용이다. 이 글만의 것은 '자주 보는 큰 함수 후보'와 원인 플래그 목록(230~237행), vtable 추적 절(288~302행) 정도이고 출처와 선택 기준 설명이 한 줄씩이다. 384~408행 측정 절은 환경·출처가 없고 결론(408행)이 출력(396~397행)과 어긋나 고유 분석으로 인정하지 않았다. |
| B | 11 | 문제(17~23행) → ELF 섹션 표(29~41행) → 도구 4개(43~210행) → 워크플로 5개(212~334행) → 함정 6개(358~382행) → 정리(410~416행)로 흐름은 끝까지 간다. 제목의 예외 비용은 232·237행 불릿 두 줄뿐이다. 96행은 nm 출력 형식을 '<주소> <크기> <type> <심볼>'로 설명하는데 87~93·123·275~277·295~297행 예시에는 열이 셋뿐이다. 내부 모순 네 곳과 열린 불확실로 AP-C-24에 따라 B ≤ 13, 11점. |
| C | 7 | 그대로 돌릴 수 있는 명령은 있다(47~71·216~228·241~249·331~353행). 툴체인·bloaty 버전과 대상 보드는 없다. 386행 '실제 STM32F4 + FreeRTOS + UART 프로젝트' 수치(391~404행)는 출처·측정 환경이 없어 C ≤ 8을 적용했다. 그 출력은 dec/hex가 맞지 않고(391행) bloaty -d symbols가 'HAL driver functions' 같은 묶음 행을 내놓아(396~404행) 실제 측정인지 의심된다. 311~312행 섹션 주소도 겹쳐 1점 더 뺐다. |
| D | 9 | part2-07-templates-cost.md28~56·243~254행 ↔ 이글258~278·193~198·249행 process<T>/nm/bloaty 비교흐름반복(인스턴스타입/개수는달라완전동일코드라고하지않음).다른시리즈Embedded Debug chapter05-elf-map.md496~523행 ↔47~57·304~317행 size열/섹션크기설명반복.Recipes part8-10-code-size-optimization.md47~80행 ↔212~228행 플래그·도구관점공유.이글워크플로/라이브러리추적은별도여서9. |
| E | 6 | 제목은 '가상 함수·템플릿·예외 비용 추적'을 약속한다. 가상 함수는 288~302행, 템플릿은 254~286행에서 다루지만 예외는 232·237행 불릿 두 줄뿐이다. 키워드 하나를 거의 다루지 않은 부분 미이행이라 6~8 구간 하단. description(5행)은 본문과 맞다. |
| F | 7 | 427행 다음 글 'Part 1-05: ABI 호환성'은 seriesOrder 5 part1-05-abi-compatibility.md와 맞다. 관련 항목 420~423행(part1-02 seriesOrder 2, part1-03 3, part2-07 15, part4-02 30)과 본문 링크 286행(part2-07), 302행(part2-08 CRTP, 16)을 열어 라벨과 제목이 맞음을 확인했다. '워크플로 1~5' 단계 구분(212~334행)이 이 글 고유 구조다. 전제 지식 안내가 없고 audit:reading·모바일 확인을 하지 않아 9 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 427행후행name mangling은대상29~118행이행. |
| G | 1 | 본문에 1차 출처 링크가 없다(binutils 문서, bloaty 저장소, Itanium C++ ABI 모두 없음). arm-none-eabi 툴체인·bloaty 버전도 없다. 323행 'STM32F407 = 1MB Flash, 192 KB RAM'에 데이터시트 인용이 없고, 300행 vtable 크기 공식에도 ABI 출처가 없다. |

병합 대상: part2-07 template/bloaty공통절. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part1-05-abi-compatibility.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-05-abi-compatibility.md`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.374·376행패딩3B씩및멤버1+4+1+4=10B를378행총16B와대조하면패딩6B인데4B라쓴산술오류.503~513행logger_init/Logger::log심볼은177~201행logger_create/destroy/log·LoggerImpl구현과도맞지않아관찰근거약함.추가로본문의struct Logger* l은C에서컴파일에러라는주장을그대로추출해clang-std=c11-pedantic-errors-fsyntax-only실행했으며exit0.불완전struct포인터선언자체는유효하다.

uncertainties:
- 468행: C에서 `struct Logger* l;`은 불완전 타입 포인터 선언이라 컴파일될 것으로 보이는데 '컴파일 에러'라고 적었다. C 표준으로 확인하지 않았다.
- 407·487행 'ARM은 unaligned access가 bus fault': Cortex-M3 이상은 일반 LDR/STR unaligned 접근을 허용한다는 기억(ARMv7-M ARM 미확인). part8-02 116행과도 다르다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 497행 namespace 안 extern "C"를 '컴파일러마다 동작이 다릅니다'라고 했는데 C++ 표준 [dcl.link]이 정한다는 기억, 미확인.
- 93~95행 extern "C"가 calling convention까지 바꾼다는 설명과 '둘 다 명시합니다'의 뜻이 불분명하다.
- 291행 'VFP가 있으면 float 인자가 s0-s15로 전달'은 hard-float(AAPCS-VFP) 변형에서만 해당한다는 기억, 원문 미확인.
- 340~341행 레이아웃 [vptr:4][x:4][y:4](12바이트)와 '12 또는 16': 4바이트 vptr 전제에서 16이 나올 수 없어 보이나 '또는'으로 열어 둔 문장이라 오류 확인에 넣지 않았다.
- 455행 함정 1의 설명이 누락 상황과 맞지 않는 문장 구성.
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | extern "C"(78~118행), __cplusplus 헤더 패턴(122~154행), opaque pointer(156~217행), 콜백 해결 세 가지(229~275행)는 C/C++ 혼합 입문 자료에 흔한 목록이다. 이 글만의 예는 Thumb 어셈블리로 this가 r0에 들어가는 것을 보인 부분(303~320행)과 static_assert로 C 인터페이스 struct를 지키는 예(348~365행) 정도다. 95·449·497행은 근거 없이 완곡 표현으로 끝난다. |
| B | 11 | 문제 정의(21~27행) → mangling(29~58행) → extern "C" → 헤더 패턴 → opaque pointer → 콜백 → calling convention(277~320행) → struct layout(322~415행) → 혼합 빌드(417~449행) → 함정(451~497행) → 측정(499~516행) → 정리(518~524행)로 흐름은 끝까지 간다. 제목의 vtable 레이아웃은 334~344행 vptr 위치 한 예뿐이다. 455행은 '누락' 함정을 설명하며 C에서 extern "C"가 무시된다고 써 상황과 맞지 않는다. 내부 모순 두 건으로 AP-C-24 B ≤ 13, 11점. |
| C | 6 | 코드 조각과 nm 명령(501~514행)은 있지만 툴체인 버전·대상 코어·빌드 옵션이 없다. 유일한 관찰 결과인 nm 출력(506~513행)이 같은 글의 logger.cpp(177~201행)와 맞지 않아 재현할 수 없다. 340행 'size = 12 또는 16', 407행 'ARM은 unaligned access가 bus fault'는 환경 없는 단정이라 C ≤ 8을 적용했다. 측정 결과가 없어 4~7 구간. |
| D | 10 | part1-01-cpp-vs-c.md279행 ↔ 이글29~118행은링크로넘기는개관이라역할분담. part1-06-startup-code.md136~173행은초기화로ABI의링크경계와별개.다른시리즈Recipes part8-02-memory-alignment.md48~67·109~126행 ↔371~415행 struct재배치/packed/memcpy반복;Recipes part2-03-arm-registers.md30~39행 ↔281~289행AAPCS레지스터표반복.opaque/C링크정본은남아10. |
| E | 4 | 제목(2행)은 'Itanium ABI·name mangling·vtable 레이아웃'을 내건다. name mangling은 29~58·499~516행에서 다루지만 Itanium ABI는 48행 괄호 한 번, vtable 레이아웃은 334~344행 vptr 위치 한 예뿐이다. 키워드 셋 중 둘이 거의 빠져 3~5 구간. description(5행)은 본문과 맞아 2 이하로는 내리지 않았다. |
| F | 6 | 534행 다음 글 안내(Part 1-06)는 seriesOrder 6 part1-06-startup-code.md와 맞다. 관련 항목 528~530행 대상 part1-03(seriesOrder 3), part1-06, part5-03-peripheral-abstraction.md(seriesOrder 39)를 열어 라벨·제목이 맞음을 확인했다. 전제 지식 안내나 긴 절 사이 안내가 없고 나머지는 템플릿이라 7 이상 근거가 없다. 실제title/order/draft·후행설명재대조.예: 530행후행C HAL wrap은대상part5-03 19~47행이행. |
| G | 1 | 본문에 출처 링크가 없다. 48행 Itanium C++ ABI, 281행 AAPCS는 이름만 있고 판·링크가 없다. 503행 arm-none-eabi-g++ 버전, 대상 코어(298행 Thumb), float ABI(291행 VFP)도 없다. |

병합 대상: Recipes struct/alignment공통절. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part1-06-startup-code.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-06-startup-code.md`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.297~305행Counterclass+static_assert를원문추출하고<type_traits>만추가해clang++-std=c++17-pedantic-errors-fsyntax-only를실행했다.static assertion failed/is_trivially_default_constructible로exit1.직접작성constexpr생성자는trivial을보장하지않는다.334행-fno-use-cxa-atexit로소멸자완전제거설명은루프12에서직접읽은GCC공식옵션의atexit대신__cxa_atexit등록계약과어긋나유지.

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
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | 40~64행 부트 흐름, 66~90행 vector table, 206~249행 같은 TU·다른 TU 초기화 순서는 입문 자료의 표준 목록이다. 고유한 부분은 338~356행 .init_array 크기와 nm으로 _GLOBAL__sub_I_ 확인, 324·382~384행 KEEP 누락 함정, 255~289행 GPIO 예다. 고유 절 둘(292~310행 trivial 강제, 326~334행 -fno-use-cxa-atexit)이 틀렸다. 269행은 언제 깨지는지를 완곡 표현으로 대신했다. 앵커 part1-04(10)와 같은 수준. |
| B | 11 | 문제(17~38행) → 부트 흐름 → Reset_Handler 코드(96~131행) → __libc_init_array(136~173행) → 초기화 순서 → 함정(360~384행) → minimal startup(386~421행) → 정리(423~430행)까지 흐름은 끝까지 간다. 51행은 Reset_Handler가 SP를 맞춘다고 하는데 105~131행 코드에는 SP 설정이 없고 90행은 CPU가 하드웨어로 SP를 로드한다고 한다. 54행 FPU 활성화도 코드에 없다. 오류 확인으로 AP-C-24 B ≤ 13. |
| C | 5 | 340·349행 명령과 342·351~353행 예시 출력이 있지만 툴체인 버전, 대상 MCU, 빌드 옵션이 없다. 358행 '수 ms', 334행 '수십에서 수백 바이트', 421행 '수 KB Flash'는 출처·환경 없는 수치라 C ≤ 8. 297~305행 예제는 이번clang++C++17에서도static_assert실패가재현됐다. 343행 생성자 8개 vs 351~353행 nm 출력 3개, 함수 주소 0x00000a40이 342행 0x80014c0·90행 Flash 시작과 다른 영역이라 예시 출력이 실제 빌드 결과로 보이지 않는다. |
| D | 8 | part1-03-runtime-requirements.md129~146행 ↔ 이글40~64행 부트순서반복. part1-07-linker-scripts.md104~119·204~209행 ↔163~171·316~322행 init_array스크립트반복.다른시리즈Recipes part3-06-startup-code.md41~61·118~128·163~196행 ↔70~88·140~158·390~419행 vector/init_array/startup골격반복.Recipes part3-07-c-runtime.md112~118행은초기화의후처리만연결.8유지. |
| E | 5 | 제목 '.init_array·전역 생성자 호출 순서'와 description은 66~249행이 다룬다. 그러나 '분석'에 비해 실제 산출물은 출처·환경 없는 예시 출력(342~353행)뿐이고 서로 맞지 않는다. 루브릭 E 주석('분석' 약속에 개념 소개 수준이면 3~5) 적용. 제목에 아키텍처가 없는데 42행이 'ARM Cortex-M 기준', 260·277행이 STM32 레지스터를 쓴다(AP-C-24 E ≤ 8). |
| F | 7 | 438~440행 다음 글은 part1-07-linker-scripts.md이고 seriesOrder 7과 맞다. 434행 1-03(128~146행이 __libc_init_array), 435행 1-07(104행 절), 249·436행 4-08 Construct-On-First-Use(31행 절)를 열어 라벨과 맞음을 확인했다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 436행후행Construct-On-First-Use는part4-08 31~54행이행. |
| G | 1 | 본문에 외부 링크가 없다. 138·141행 newlib 언급에 버전·소스 경로가 없다. 328행 '__cxa_atexit 등록'에 표준·ABI 인용이 없고 실제로는 GCC 옵션 동작이다. GCC·binutils 버전과 대상 MCU도 없다. |

병합 대상: part1-03부트순서·part1-07init_array·Recipesstartup. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part1-07-linker-scripts.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-07-linker-scripts.md`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.283행DMA buffer를CCM에두는코드/408~419행DMA buffer4KB를CCM에옮긴성공사례는292·396·439행DMA는CCM접근불가/일반SRAM배치규칙과같은장치/용도에서직접충돌한다.34·49행mainSRAM192K와159행128K는별도예시설정변경가능성도있어그쌍만으로내부오류확정하지않는다.전체192KB와분리128+64KB를구분해정리할것.

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
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 27~98행 MEMORY·SECTIONS·VMA/LMA, 154~274행 완성 스크립트, 310~336행 심볼 정의는 벤더 기본 링커 스크립트 설명 수준이다. 이 글만의 것은 100~148행 C++ 섹션 정리와 292·396행 CCM-DMA 경고인데, 그 경고마저 281~283행 예제와 408~419행 사례가 뒤집는다. 132·136·308행은 근거 없는 일반론이다. 제목의 vtable은 본문에 없다(2행 제목, 76행 'Virtual Memory Address'뿐). |
| B | 10 | 17~21행 문제 정의 → MEMORY/SECTIONS → VMA/LMA → C++ 섹션 → 완성 스크립트 → custom 섹션 → map(338~374행) → 함정 7개(376~404행) → 측정(406~419행) → 정리(434~440행)로 흐름은 끝난다. 제목의 vtable 배치가 없고, 262행 `.ccmram`을 `AT >FLASH`로 두면서 복사 코드나 NOLOAD 선택을 설명하지 않는다. RAM 크기·DMA-CCM 모순으로 AP-C-24 B ≤ 13, 측정 절 결론이 함정 절과 반대라 10. |
| C | 6 | 빌드 명령(343·424행)과 map·`--print-memory-usage` 예시(348~372·426~430행)는 있지만 toolchain 버전·보드·소스가 없다. 408~419행 측정은 출처·환경 없는 수치라 C ≤ 8이고, 396행이 bus fault라고 한 배치를 성공으로 보여 줘 결과로 쓸 수 없다. 148행 '수 KB가 절약됩니다'도 근거가 없다. 357~361행 map 예시는 170~173행 스크립트와 맞지 않는다. |
| D | 8 | part1-06-startup-code.md162~169·316~324행 ↔ 이글106~119·378~380행 KEEP/init_array반복.다른시리즈Recipes part3-04-linker-script-basics.md28~34·72~81·106~132행 ↔31~98·310~319행 MEMORY/VMA/LMA/symbol정의같은질문. Embedded Debug chapter05-elf-map.md21~45행 ↔17~21·338~374행 ELF배치개관공유.이글C++섹션관점추가하나완성ld일반론분량커8. |
| E | 5 | 2행 제목 키워드 'vtable'·'정적 객체 배치'·'추적' 중 vtable은 본문에 없고, '추적'은 338~374행 map 절 하나로만 이행한다(절반 미이행 → 3~5). description(5행)은 본문과 맞다. 일반 임베디드 C++ 제목에 본문은 STM32F407 하나(46·150행)라 AP-C-24 E ≤ 8도 걸린다. |
| F | 5 | 450행 다음 글은 seriesOrder 8 part1-08-cpp-standard-choice.md와 맞다. 444행 1-06, 445행 1-04는 라벨과 맞는다. 그러나 446행 'Part 3-03: Pool Allocator 구현 — custom 섹션에 pool 배치'의 대상 part3-03-pool-allocator.md(seriesOrder 21)에는 section·CCM·링커 언급이 없다(258행 'critical section'뿐). 라벨이 대상과 다른 관련 링크라 F ≤ 5. 실제title/order/draft·후행설명재대조.예: 446행후행custom섹션pool배치는대상part3-03전체section/CCM/링커/배치검색으로관련실제가없어5상한유지. |
| G | 1 | 본문에 1차 출처가 없다. GNU ld 매뉴얼, STM32F407 RM0090·datasheet 판, arm-none-eabi toolchain 버전 표기가 없다. 46~50행 메모리 크기도 출처 없이 제시되고 34·159행에서 서로 다르다. |

병합 대상: Recipesld/EmbeddedDebug배치공통절. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part1-08-cpp-standard-choice.md`

source_file: `src/content/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice.md`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.기존KeilMDK/ARMCompiler최대표가서로다르다는의심은제품번들/판/부분지원의차이가능성을남겨독립적인확정근거로쓰지않는다.대신301~303행-std=c++17은순수표준만허용하므로__attribute__사용시gnu++17이된다는설명을확인했다.clang++-std=c++17-pedantic-errors에서__attribute__((noinline)) int f(){return1;}이exit0.옵션이자동으로gnu++로전환되지도않으며특정GNU확장의허용과언어dialect는다르다.

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
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | C++11~23 기능 표(34~50, 58~65, 73~85, 93~106, 122~129행)는 표준별 신기능 목록이라 흔한 내용이다. 이 글만의 것은 임베디드 toolchain 표(139~150행), 결정 트리(158~163행), 같은 일을 표준별로 쓴 코드(227~271행)다. toolchain 표는 137행 '2026년 기준(대략)'으로 출처가 없고, 133행은 b12f53a8 이후 '함께 보고 결정합니다 … 좁힐 수 있습니다'라는 완곡 표현이다. |
| B | 12 | 문제 정의(17~26행) → 표준별 기능 → toolchain 지원(135~152행) → 결정 트리 → 플래그(167~178행) → feature test macro(196~206행) → 코드 크기 → 함정(291~315행) → 정리로 흐름은 끝까지 간다. 161행 'C++17 (최대)'와 143~144행 'C++20 부분'의 관계 설명이 없고, 인증 절(277~283행)은 도구 이름과 예상 연도뿐이다. AP-C-24 B ≤ 13. |
| C | 6 | 플래그 예(167~176행)와 `__cpp_lib_*` 확인 코드(196~206행)는 그대로 쓸 수 있다. 코드 크기 표(210~217행)는 'STM32F4, GCC 13, -Os -flto'만 적고 '같은 코드'가 무엇인지, 어떻게 쟀는지 없다. 319~324행 '약 5K 줄' 업그레이드 결과(-2.4%, -3%, -8%, -12%)도 출처·측정 방법이 없다. C ≤ 8, 재현 절차가 없어 4~7 구간. |
| D | 12 | part1-02-compiler-flags.md66~76행 ↔ 이글69~131·143행 표준가용성개관반복하나1-02가상세를위임. part2-03-constexpr-basics.md285~332행 ↔93~106행 C++20기능일부요약.다른시리즈CMake chapter08-best-practices.md297~298행은CXX_STANDARD빌드설정이라실제채택판단과질문다름(루프09에서직접읽음).결정트리/언어·라이브러리구분으로12. |
| E | 7 | 제목의 C++11/14/17/20/23과 description의 '컴파일러 지원, 표준 라이브러리 변화, 핵심 기능 비교'는 28~131·135~152·180~206행이 다룬다. '트레이드오프'는 대부분 기능 나열이고 비용 근거는 출처 없는 크기 수치(210~219·319~326행)뿐이라 9 이상은 아니다. |
| F | 7 | 345행 다음 글 'Part 2-01: RAII 기초'는 seriesOrder 9 part2-01-raii-basics.md와 맞다. 관련 항목 338~340행 대상(part1-02, part2-10, part3-07)과 131행 본문 링크(part3-07)를 열어 라벨과 맞음을 확인했다. 341행 AUTOSAR는 외부 문서 이름이다. 156~163행 결정 트리는 '위에서부터 차례로 답한다'는 이 글 고유의 읽기 순서다. 전제 지식 안내와 렌더 확인이 없어 9 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 345행후행자원소멸은대상part2-01 61~74행본론맞음. |
| G | 1 | 본문에 1차 출처 링크가 없다. 32·56·71·91·120행 컴파일러 버전 지원 주장과 139~150행 toolchain 표에 GCC·Clang 지원 상태 페이지나 벤더 문서 인용이 없다. 287~289행 AUTOSAR C++14·JSF C++·MISRA C는 이름만 있다. 137행 '2026년 기준'과 71행 '2025년 임베디드의 기본'처럼 기준 시점도 섞여 있다. |

병합 대상: 병합대상없음;표준채택정본. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part2-01-raii-basics.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-01-raii-basics.md`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 기술정확성추가검증필요.

미검증.원문프로브없이CMSIS/STM32코드의실패를단정하지않는다.원문5자원API구현조건·TC/timeout·복사/이동정책·종료경로별소멸보장은개별불확실로열림.기존git이력은작성/문체/링크/메타변경으로1차기술대조기록이없다.

uncertainties:
- 388행 `osMutexAcquire(mutex_)`는 인자 하나, 108행은 `osMutexAcquire(mutex_, osWaitForever)`로 둘이다. CMSIS-RTOS2 시그니처로 확인하지 않았다.
- 421~425행 `return Uart(/* private constructor */);`는 410행 public `Uart(int baud)`와 맞지 않는다. 컴파일 가능 여부 미확인.
- 265행 `bool is_done() const { /* */ }`는 반환문이 없다. 256행 `DMA->CCR[channel_]`, 276행 `UART->TX`가 실제 CMSIS 디바이스 헤더에 있는지 미확인.
- 432행 `b1.write(...)`는 344~363행 Buffer에 없는 멤버다(안티패턴 예시라 모순으로 단정하지 않음).
- 449~470행 7개 Thumb-2 명령을 '24 bytes'로 적었다. literal pool·정렬 포함 여부에 따라 달라 단정 못함. part4-13 427~448행과 같아 실측인지 의심.
- 380행 주석 'try/catch로 모든 예외 잡기'에 해당하는 코드가 없다.
- 371행 vector의 copy fallback 설명은 복사 가능한 타입에만 해당하는데 Buffer는 복사 금지다.
- 152행 UartGuard 소멸자의 clock off가 공유 USART2·전송 완료 타이밍에 주는 영향을 RM으로 확인하지 않았다.
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 10 | RAII 정의(61~74행), C 짝 맞추기 vs C++ 예(21~57행), Rule of Three/Five/Zero(303~307행), defer·try-with-resources 비교(309~338행)는 C++ 입문서의 표준 목록이다. 이 글만의 부분은 임베디드 자원 다섯 분류(76~86행), UartGuard로 clock까지 끄는 예(143~166행), PRIMASK 보존 InterruptGuard(185~206행)인데 InterruptGuard는 2-02·RTOS 4-13에도 같은 형태로 있다. 59행 '원천적으로 불가능', 473행 '오버헤드가 0'은 조건 없는 단정, 376행은 완곡 표현이다. |
| B | 11 | 문제(17~46행) → 정의(61~74행) → 다섯 패턴(88~281행) → Rule of 3/5/0(283~307행) → 함정 6개(373~443행) → 측정(445~473행) → 정리(475~481행)로 흐름은 갖췄다. UartGuard(144~154행)는 같은 USART2·clock을 다른 코드가 쓰는 경우를 다루지 않고, DmaChannel(252~271행)은 본문이 비어 있으며, 421~425행은 410행 public `Uart(int)`와 맞지 않는 생성자를 부른다. AP-C-24 B ≤ 13. |
| C | 6 | 코드는 많지만 대상 MCU·툴체인이 없다. 147~161행은 STM32F4식 APB1ENR·DR·SR, 256·259행은 `DMA->CCR[channel_]`, 261행은 F1식 `DMA1_Channel1_IRQn`, 276행은 `&UART->TX`를 섞어 한 보드에서 재현되지 않는다. 측정 절(447행)은 'ARM Cortex-M4, -O2'만 적고 컴파일러·버전·소스를 보이지 않으며 두 목록(450~459, 461~470행)이 글자 하나 다르지 않다. C ≤ 8, 4~7 구간. |
| D | 9 | part2-02-raii-patterns.md375~411·61~98·474~492행 ↔ 이글168~206·88~137·445~473행 IRQ/lock/동등어셈블리반복.다른시리즈RTOS practical-internals/part4-13-cpp-in-rtos.md26~105·423~451행 ↔88~137·185~206·445~473행mutex/PRIMASK/24bytes측정같은형태.다만RTOS는locked_실패분기를보강했고이글은자원5종소개라완전동일구현은아님.9. |
| E | 7 | title과 description(5행)의 RAII 원리는 61~74·88~281행이 다룬다. '결정적 소멸 보장'은 69~74행 목록과 404행 외에 정적·전역 소멸 순서, -fno-exceptions에서의 보장 범위를 다루지 않아 부분 미이행으로 6~8 구간. |
| F | 5 | 492행 다음 글 Part 2-02는 seriesOrder 10 part2-02-raii-patterns.md와 맞다. 137·245·485~487행 대상(part2-02, part3-03, part3-05, part3-09)은 라벨과 맞다. 그러나 488행 'GoF 14: Command'는 링크 없는 관련 항목이고 대상 후보 item14-command.md는 draft: true라 틀린 링크로 보아 F ≤ 5. 283행 제목 '3 of 5 규칙'도 303~307행과 맞지 않는다. 실제title/order/draft·후행설명재대조.예: 488행GoF item14-command는실제draft확인. |
| G | 1 | 본문에 1차 출처가 없다. 69행 'C++ 표준이 ... 보장'에 표준 절 인용이 없고, 95·108행 osMutexAcquire의 CMSIS-RTOS2 버전, 147~161행 레지스터의 대상 MCU·RM, 447행 측정의 컴파일러·버전이 없다. |

병합 대상: part2-02·RTOS RAII공통예. 다음 조치: 독립질문을유지하며 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part2-02-raii-patterns.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.기존219/227행함수포인터deleter크기와500행RAIIzero-cost만으로내부모순확정한근거는기각한다.zero-cost는동일기능수동구현과의추가비용을뜻할수있어자원자체크기와다른축이다.183행가벼워짐권고와Fd*스케치만으로구현모순확정하지않는다.대신원ScopeGuard/helper/FINALLY정의를추출해같은scope에서서로다른두줄FINALLY((void)0)/FINALLY((void)1)를호출했다.C++17컴파일exit1,redefinition of _guard___LINE__.##직접연결로__LINE__이확장되지않아범용cleanup매크로가두번사용에실패한다.

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
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | lock_guard·scoped_lock·unique_lock·unique_ptr deleter·ScopeGuard(29~304행)는 C++ 입문 자료의 표준 목록이다. 이 글만의 것은 FreeRTOS mutex wrapper(63~98행), pool deleter(201~217행), UART on/off guard(274~288행), `template<auto Enable, auto Disable>` Scoped(310~330행), dismiss rollback(294~303행)이다. 선택 기준은 415~424행 표 한 장뿐이고 실패 사례가 없다. |
| B | 10 | 29~500행패턴8개→비교표→함정→측정→정리흐름완성.제목DMA는본문에없고Pin은319~327행두줄,Power는UART UE정도다.5표준도구와추가3임베디드패턴은범주구분이므로개수모순아님.zero-cost대자원크기만으로오류라하지않고위FINALLY실패를정확성gate로교체한다.실행/실패조건/FreeRTOS판부족으로10. |
| C | 5 | 대상 MCU·컴파일러·FreeRTOS 버전이 없다. 276~283행 `USART2->SR`·`DR`, 319행 `GPIOA->MODER`를 보드 표기 없이 쓴다. 476~490행 '측정'은 컴파일러·옵션·타깃이 없는 어셈블리다(인접 2-01 447행은 'ARM Cortex-M4, -O2'를 적음). 227행 '8바이트/4바이트'도 32-bit 전제를 밝히지 않았다. C ≤ 8, 실행 조건과 기대 결과가 없어 4~7 구간. |
| D | 6 | part2-01-raii-basics.md88~137·139~206·340~371·445~473행 ↔ 이글61~98·274~288·375~411·332~373·474~492행 lock/UART/IRQ/move/측정반복. part3-09-smart-pointer-choice.md67~84·270~274행 ↔201~217·434~438행pooldeleter/함수포인터크기함정공유.다른시리즈Recipes part6-05-mutex-usage.md65~76행 ↔74~98행guard동일패턴.추가ScopeGuard/dismiss/Scoped만으로긴반복상쇄부족해6. |
| E | 6 | 제목은 'Lock·Pin·DMA·Power 관리'를 약속한다. Lock은 29~159행, Pin은 319~327행 두 줄 함수, Power는 UART UE on/off(272~288행)로만 다루고 DMA는 본문에 없다(DMA Channel 예는 2-01 247행에 있다). 15행 '표준 라이브러리가 5개의 RAII 도구를 제공'은 직접 구현하는 ScopeGuard(235~255행)·GSL(270행)을 표준에 넣어 약속을 부풀린다. |
| F | 7 | 511행 다음 편 안내는 seriesOrder 11 part2-03-constexpr-basics.md와 맞다. 관련 항목 504~507행(2-01, 3-03, 3-09, 4-03)을 열어 라벨과 제목이 맞음을 확인했다. 패턴별 H2와 415~424행 비교 표가 긴 코드의 방향을 잡는다. 전제 지식 안내와 렌더 확인이 없어 9 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 505~506행pool/smartpointer후행은대상pooldeleter본문67~84행이행. |
| G | 1 | 본문 출처 링크가 없다. C++11(31행)·C++17(46·100·330행) 이름만 있고 cppreference·표준 조항 연결이 없다. 270행 `gsl::finally`에 C++ Core Guidelines 링크가 없고, FreeRTOS 버전·CMSIS(383행 `__get_PRIMASK`)·대상 MCU 레퍼런스 매뉴얼이 없다. |

병합 대상: part2-01·part3-09 deleter공통예. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part2-03-constexpr-basics.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-03-constexpr-basics.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 기술정확성추가검증필요.

미검증.V1음수level의CBZ/반복행동의심은ARM명령/정의역조건을독립검증하지않아기존대로불확실.3200=100×2^5와LUT256×4=1024는재계산상맞다.표시된C++20new예는함수선언허용과상수평가에서영구할당허용을구분해야해같은문자열만으로모순확정하지않는다.

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
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | constexpr 변수·함수와 const 차이(62~71행), C++14 완화(86~97행), if constexpr(193~220행), static_assert(222~234행), 제약 목록(285~302행)은 C++ 입문 자료에 흔하다. 임베디드 예제는 Taylor sin LUT(99~135행), CRC32 테이블(137~163행), GPIO 주소 계산(176~191행), V1/V2 어셈블리 비교(236~283행)다. 124행 정규화 '생략', 304행 'GCC 13 약 90%', 357행 '256~4096 entry'는 근거 없는 단정이다. |
| B | 11 | 문제(17~44행) → 변수·함수 → LUT·CRC·레지스터 → if constexpr → static_assert → 어셈블리 → 제약 → consteval/constinit → 함정 → 측정 → 정리(390~396행)로 흐름은 끝까지 간다. 109행 angle 0~2π인데 taylor_sin은 정규화를 생략했고(x=2π에서 첫 생략 항 약 0.7), 110행이 123행 정의 전에 taylor_sin을 호출한다. 326행 compute_initial은 정의가 없다. 298·301행은 같은 코드에 '안 됨/됨'만 붙인다. 101행과 388·393행의 RAM 비교 기준이 다르다. AP-C-24 B ≤ 13, 10~15 구간 하단. |
| C | 6 | 코드 조각은 많지만 컴파일러·버전·플래그가 없다. V1·V2 어셈블리(262~274·278~281행)는 어떤 컴파일러·-O 단계 출력인지 없다. 측정 절(372~386행)은 'STM32F4'만 적고 '.text +180 B', 'init time ~50 us'를 클록·툴체인·방법 없이 둔다. 168~174행 '+200 바이트'도 출처가 없다. C ≤ 8, 실행 조건이 없어 4~7 구간. |
| D | 10 | part2-04-constexpr-advanced.md174~185·233~252·287~308·329~345행 ↔ 이글99~163·289~301·346~365·372~386행 compile-time기법/제약/측정틀반복. part2-05-consteval-constinit.md22~25·40~47·119~126행 ↔76~81·311~332행square/constinit같은예이지만상세위임있음.다른시리즈RTOS practical-internals/part4-13-cpp-in-rtos.md463행은한줄참조로깊은기초와다르다.10. |
| E | 6 | 제목 키워드 'constexpr 기초'(46~97행), '임베디드 적용'(99~191행), '컴파일 타임 계산 활용'(236~283행)은 모두 다룬다. description 5행 '-Os보다 강력한 zero-cost'는 본문에 -Os 비교가 없어 이행되지 않았고, 283행 '완전한 zero-cost'도 V1의 최적화 단계를 밝히지 않는다. 6~8 구간 하단. |
| F | 7 | 407행 다음 글은 seriesOrder 12 part2-04-constexpr-advanced.md와 맞고 'sort, search, 문자열' 안내도 그 글 H2(28·69·95행)와 맞다. 관련 항목 400~403행(2-04 12, 2-05 13, 1-07 7, 5-01 37)과 본문 319행(2-05), 332행(part1-06, SIOF는 그 글 234행)을 열어 맞음을 확인했다. 전제 지식 안내가 없고 렌더 확인을 하지 않아 8 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 407행후행sort/search/문자열은대상28/69/95행절이행. |
| G | 1 | 본문에 1차 출처 링크가 없다. 289~294행 제약 목록, 304행 'GCC 13 약 90%', 108·135·351행 'std::sin은 constexpr 아님/C++26 대기'에 표준 문서·cppreference·제안서 출처가 없다. 어셈블리(262~281행)와 측정(376~386행)에 컴파일러 버전이 없다. |

병합 대상: part2-04/05기초예. 다음 조치: 독립질문을유지하며 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part2-04-constexpr-advanced.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.175~181행코드에서kMaxTasks=32로바꾼원블록을clang++-std=c++17-pedantic-errors-fsyntax-only로컴파일해exit0확인.32×2048=64×1024라<=를통과한다.184행컴파일에러라는주석은틀렸다.단순주석개수표기가아니라RAM상한을막는검증동작의설명오류다.

uncertainties:
- 67행 'GCC 10+, Clang 12+에서 동작': constexpr std::sort는 libstdc++/libc++ 버전에 달렸다. 1차 자료 미확인.
- 240행 constexpr std::vector의 표준 라이브러리 구현 지원 버전 미확인.
- 305·308행 'std::sin은 constexpr 아님 … C++26': C++26 constexpr cmath 제안 포함 여부 미확인.
- 335·337행 '.text +312 B', '~12 ms': 클록·최적화 옵션·출처가 없다.
- 143행 '4바이트 정수 비교 한 번': switch는 case 수에 따라 여러 번 비교하거나 점프 테이블이 되므로 과단순화일 수 있다(B에만 반영).
- 15·351행 'parse까지/parse를 모두 수행': 본문에 parse 예제는 starts_with뿐이다(A·B에 반영).
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | sort(28~65행), binary search(69~93행), starts_with(95~117행), FNV-1a 해시(119~143행), enum-to-string(211~231행), constexpr vector(233~252행)는 constexpr 소개 자료에 흔한 예제다. 임베디드 쪽은 Q16.16 변환(149~168행), 핀 마스크(193~209행), 주변장치 설정 배열(258~285행) 정도이고 코드 한 조각과 한두 문장으로 끝난다. 67·317행 'toolchain을 확인'은 지원 표 대신 쓴 완곡 표현이다. |
| B | 10 | 문제 정의(17~26행) → 기법별 예제 → 함정(287~317행) → 한계(319~327행) → 측정(329~347행) → 정리(349~355행)로 흐름은 끝까지 간다. 276~282행 find_irq는 루프 본문이 `// ...`이고 name 인자를 쓰지 않는 빈 함수다. 해시 dispatch(131~143행)는 해시 충돌 시 case 중복 문제를 말하지 않는다. 제목의 CRC는 본문에 없다. 오류 확인으로 B ≤ 13 안에서 10. |
| C | 6 | 90·113~114행 static_assert는 컴파일로 확인 가능하지만 컴파일러 버전·-std 옵션이 없다. 333~345행 '.text +312 B', 'init time ~12 ms'는 환경이 331행 'STM32F4' 한 단어뿐이다(C ≤ 8). 184행 주석은 코드와 맞지 않고 276~282행은 빈 스텁이라 복사해도 동작하지 않는다. |
| D | 9 | part2-05-consteval-constinit.md210~235행 ↔ 이글174~185행 tasks×stackstatic_assert같은예;part2-03-constexpr-basics.md285~302·346~365·99~118·372~386행 ↔287~327·329~345행 제약/함정/LUT측정틀반복.다른시리즈beautiful-cpp item22/effective-modern-cpp item15/autosar-cpp chapter12는실제draft메타를열어확인했으므로공개중복감점에세지않음.기법심화는남지만독립성이약해9. |
| E | 6 | 제목의해시는119~143행,룩업테이블은21행정렬테이블목표와28~65행make_sorted·69~93행binarysearch를통해실제제공한다.기존LUT코드없다는독해는기각한다.CRC만본문에없어부분미이행이며description의sort/search/문자열은모두이행하므로4→6.상수테이블사용예가빠진것과생성자체가없음은구분한다. |
| F | 7 | 19행이 전제 글 part2-03을 링크하고 범위를 밝힌다. 365행 다음 글은 seriesOrder 13 part2-05-consteval-constinit.md와 맞다. 관련 항목 359~361행(part2-03, part2-05, part5-01)은 라벨이 대상과 맞다. 렌더 확인을 하지 않아 9 이상은 아니다. 실제title/order/draft·후행설명재대조.예: 365행후행C++20두키워드는대상37~138행이행. |
| G | 1 | 본문에 cppreference·표준 제안서·컴파일러 릴리스 노트 링크가 없다. 67행 'GCC 10+, Clang 12+', 117행 C++20 starts_with, 235행 constexpr new, 305·308행 C++26 주장에 출처가 없고, 331행 측정에 보드·toolchain 버전이 없다. |

병합 대상: part2-03 제약/함정·part2-05검증예. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.

### `part2-05-consteval-constinit.md`

source_file: `src/content/blog/embedded/embedded-cpp/part2-05-consteval-constinit.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1위기술gate.

오류 확인.279~280행consteval안dynamicalloc은C++20불가라는단정을직접실행반례로검증했다.consteval int f(){int*p=new int(42);int x=*p;delete p;return x;}static_assert(f()==42);를clang++-std=c++20-pedantic-errors-fsyntax-only로컴파일해exit0.할당을같은상수평가안에서해제하는transientallocation은허용된다.영구보존포인터와다른조건이다.기존WG21 P0784R7요약만의근거를컴파일로보강.

uncertainties:
- 265~270행 'OK in C++23, ERROR in C++20': P2564(consteval 전파)가 C++23 채택인지 C++20 DR인지 1차 자료로 확인하지 않았다. 267행 'OK' 주석에는 C++23 표기가 없다.
- 326행 'GCC 10+, Clang 12+'와 286행 'ARM Compiler 6, IAR 일부는 consteval 미지원': 컴파일러 지원표나 벤더 문서 미확인.
- 126행 '모든 static 변수가 main 진입 전에 초기화되도록 보장': constinit은 키워드를 붙인 변수에만 적용되므로 과장일 수 있다.
- 123행 `constinit auto* g_logger = make_logger()`의 'OK if make_logger is constexpr': 동적 할당 포인터를 반환하면 상수 초기화가 될 수 없다.
- 296행 '모두 같은 결과 (Flash에 상수 박힘)'·306행 '런타임 비용은 동일하게 0'과 275행 'constinit은 mutable'의 관계: mutable constinit 변수는 .data(RAM)에 놓여 시작할 때 복사된다. objdump로 확인하지 않았다. 240·245행도 같은 문제다.
- factcheck 근거인 P0784R7은 WebFetch 요약으로 읽었다. N4861 [expr.const]와 한 번 더 대조하는 것이 좋다.
- 위gate에서실행확인/기각한해당의문은위결론을따른다.나머지API·측정·버전의문은열려있어B≤13,C≤8/절차상한을유지한다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 예제는 포트·핀 범위를 consteval로 검사하는 make_pin(54~68행), 매크로 PIN_MASK를 consteval pin_mask로 바꾼 예(76~88행), hex 생성자만 consteval로 둔 Color(159~182행), config 값 static_assert 검사(211~243행)다. consteval/constexpr 표(92~98행), const/constinit/constexpr 구분(130~138행), if consteval(186~205행), lambda(247~258행)는 C++20 소개 자료에 흔하다. 258·286행은 구체 주장 대신 쓴 일반론이다. 고유 예제가 많아 6~12 구간 위쪽. |
| B | 12 | 문제 정의(17~33행) → consteval·constinit → 비교(90~138행) → if consteval(186~205행) → 설정 검증(207~245행) → 함정 6개(260~289행) → 정리(321~327행)로 흐름은 끝까지 간다. 279~280행 함정 3은 두 문장뿐이고 사실도 틀렸다. 285~286행은 어떤 버전이 무엇을 지원하는지 적지 않았고, 컴파일 에러 예(47·67·87·181행)에 진단 메시지가 없다. 정확성 불확실(265·296·326행)이 열려 있어 AP-C-24 B ≤ 13. |
| C | 5 | 컴파일 명령, 컴파일러 버전, -std 플래그, 예상 진단 출력이 없다. read_input(25·46행), make_logger·Logger(123·144~150행), slow_but_precise·fast_approximate(194·197행)는 정의되지 않아 그대로는 컴파일되지 않는다(AP-C-35). '측정' 절(291~306행)은 결과 없이 주석 '0 운영비'(299·301·303행)만 있다. 326행 'GCC 10+, Clang 12+'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 11 | part2-03-constexpr-basics.md306~332행 ↔ 이글22~25·40~47·119~126행square/constinit/SIOF설명반복이나319행상세위임이있다. part2-04-constexpr-advanced.md233~252행 ↔279~280행allocation주제만접함(가르치는조건이달라중복보다정합성확인대상).다른시리즈beautiful-cpp item22/effective-modern-cpp item15/autosar-cpp chapter12는draft확인으로공개감점제외.상수평가강제질문으로11. |
| E | 5 | 제목(2행)은 '분석'과 '컴파일 타임 강제 메커니즘'을 약속한다. 본문은 기능 소개와 예제 수준이다. immediate invocation 평가 시점, constant initialization과 dynamic initialization의 경계 같은 메커니즘 설명은 37·116행의 한 문장 정의뿐이다. 291행 '측정' 절도 측정을 하지 않는다. 루브릭 E 주석(3~5) 적용. |
| F | 6 | 338행 다음 글 안내(Part 2-06 Templates 기초)는 seriesOrder 14 part2-06-templates-basics.md와 맞다. 관련 항목 331~334행(part2-03 11, part2-04 12, part1-06 SIOF 234행, part1-08 98~99행)을 열어 라벨과 내용이 맞음을 확인했다. 126행 본문 링크 라벨은 글 제목이 아니라 대상 글의 한 절 이름이지만 번호와 대상은 맞다. 전제 지식 안내가 없고 audit:reading을 확인하지 않았다. 실제title/order/draft·후행설명재대조.예: 126·333행SIOF는대상part1-06 234행절이므로글제목과다른라벨이어도오안내아님. |
| G | 1 | 본문에 출처 링크가 없다. P1073(consteval), P1143(constinit), P1938(if consteval) 같은 제안서와 표준 절을 인용하지 않았다. 326행 'GCC 10+, Clang 12+'와 286행 'ARM Compiler 6, IAR 일부'에 컴파일러 문서 근거가 없다. 예제를 확인한 컴파일러·버전 표기도 없다. |

병합 대상: part2-03미리보기. 다음 조치: 위확인오류정정부터진행후 판고정출처/실행환경/예상관찰을보강하고중복코드를정본에모은다.제목약속/관련링크후행설명도실제내용과맞춘다.
