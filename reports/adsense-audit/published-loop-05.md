# 공개 글 AdSense 평가 — 루프 05

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-05.md) · [재검토 기록](double-check-loop-05.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

재평가일 2026-10-19. 원문 기준 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2·AP-C-24 적용. BSP ch04~13의 전문과 기존 점수 근거, 아래에 명시한 비교 원문·링크 목적지를 대조했다. 전편 `score_status: 잠정`, `confidence: 중간`. 앵커는 수정 전 `10550ca1` 원문 기준이다. 원문·기존 보고서는 변경하지 않았다. 본문 검토에서 P0 미발견. 일부 오류 확인은 전체 사실 검증을 뜻하지 않는다. 공통 정적 검사는 [2026-10-18 스냅샷 게이트](double-check-gates-2026-10-18.md)를 인용하며 오늘 새로 빌드했다고 하지 않는다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter04-pinmux-clock.md` | 12 | 12 | 6 | 9 | 7 | 7 | 3 | **56** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter05-ddr-params.md` | 12 | 12 | 6 | 8 | 6 | 7 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter06-u-boot-porting.md` | 14 | 12 | 8 | 6 | 5 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter07-tfa-trustzone.md` | 14 | 13 | 8 | 9 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter08-kernel-config.md` | 11 | 12 | 7 | 9 | 6 | 5 | 1 | **51** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter09-smp-bringup.md` | 9 | 10 | 6 | 5 | 8 | 5 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter10-first-boot.md` | 11 | 12 | 7 | 7 | 7 | 7 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter11-bootlog-debugging.md` | 14 | 12 | 8 | 10 | 6 | 7 | 1 | **58** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter12-driver-add.md` | 12 | 12 | 7 | 8 | 7 | 5 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `chapter13-power-management.md` | 10 | 12 | 7 | 10 | 7 | 7 | 1 | **54** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |

합계522→534, 평균52.2→53.4. ch04는 신규 오류 확인으로 우선 조치가 된다. 기존6편의 오류 상태는 유지하지만 ch06·09는 근거를 교체한다. F 상승은 허브로 연결했다는 이유만으로 오안내를 확정한 근거를 실제 라벨·후행 설명·허브의 구성표와 비교해 바로잡은 결과다. 점수는 구간 내 독립 판단이며 객관적 확정값·승인 확률이 아니다.

## 정확성 게이트 재검토

- ch04 L64~65의 UART1 macro tuple을 [Linux v6.12 imx8mp-pinfunc.h](https://raw.githubusercontent.com/torvalds/linux/v6.12/arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h)와 직접 대조했다. upstream은 `0x220 0x480 0x5E8 0x0 0x4`여서 글의 값과 다르다. 또한 [v6.12 imx8mp.dtsi](https://raw.githubusercontent.com/torvalds/linux/v6.12/arch/arm64/boot/dts/freescale/imx8mp.dtsi)의 pinctrl base는0x30330000이며0x30340000은GPR이다. L336 주소를 UART1 mux라고 읽는 설명도 맞지 않는다. 신규 오류 확인. 모든 ALT·CCF 주장까지 확인한 것은 아니다.
- ch05 L145 tool 출력0x006180e와 L275 register dump0x006180e0는 다른 값이다. L278은 변경되지 않으면 동일해야 한다고 조건을 밝힌다. 기존 내부 오류를 유지한다. 손으로 입력/도구 생성이라는 표현 차이는 이 확정 오류와 분리한다.
- ch06 L202·504의 'DEBUG_UART 네 줄'은 baud 설정의 문장 범위가 부정확하지만 바로 다음 CONFIG_BAUDRATE도 제시한다. 이를 기술적으로 불가능한 코드로 단정했던 근거는 철회한다. 대신 L280·477의 SD1KB를 [공식 U-Boot v2024.04 imx8mp_evk 지침](https://docs.u-boot.org/en/v2024.04/board/nxp/imx8mp_evk.html)과 대조했다. flash.bin은32KB 위치이며 같은 글이 표기한2024.04와 같은 보드 문서다. 기존 오류 게이트는 이 근거로 유지한다. 실제 저장장치 쓰기는 하지 않았다.
- ch07 L50~52의 DDR 초기화 후 BL31 시작·L51/467의 DDR 적재와 L131/151/442의 SRAM 주소·DDR 이전 실행 설명이 충돌한다. L306이 BootROM에 맡긴 전체 분해/단계 점프도 앞의 SPL 역할과 다르다. 동일 보드 부팅 설명의 순서·배치 모순이므로 유지한다. 모든 TF-A 플랫폼이 같은 메모리 위치를 쓴다고 일반화하지 않는다.
- ch08 기존 B 감점 중 merge 뒤 olddefconfig가 없다는 근거를 [Linux v6.12 merge_config.sh](https://raw.githubusercontent.com/torvalds/linux/v6.12/scripts/kconfig/merge_config.sh)와 대조했다. 본문 명령은-m이 없고 script는 기본으로alldefconfig를 실행한다. 별도 보정 단계가 무조건 빠졌다고 볼 수 없어 B11→12. mainline/vendor defconfig·overlay·bootm 지원은 여전히 미검증이다.
- ch09 EL3→EL2→EL1과 EL3→EL1을 조건 없이 혼재한 설명은 부족하지만 가능한 진입 조건·커널 내부 전환까지 같은 순간이라고 확정하지 않는다. 함수 파일 위치도 '발췌(개념)'이라는 범위가 있어 단독 오류 게이트로 쓰지 않는다. [Linux v6.12 psci.c](https://raw.githubusercontent.com/torvalds/linux/v6.12/arch/arm64/kernel/psci.c)에서 실제 cpu_psci_cpu_boot 위치는 확인했다. 대신 L113의 `<0x0 0x80000fff8>`에서 뒤 cell은32bit를 넘는다. [DTSpec §2.2.4.2](https://devicetree-specification.readthedocs.io/en/stable/devicetree-basics.html)의 u32·두cell u64 표현과 맞지 않아 오류 확인 유지. dtc가 로컬에 없어 실제 컴파일했다고 하지 않는다.
- ch10 L68~69 콘솔→DDR 순서·L76~77 배너→DDR 로그·L227 배너 뒤DDR hang 진단과 L274의 '첫 출력은DDR 초기화직후'가 같은 예제에서 맞지 않는다. 기존 오류 유지.
- ch12 L44은7bit주소가WP strap에 따라 결정된다고 하지만 L49는A2~A0, L51은WP write enable이라고 명시한다. 동일 칩의 주소 결정 원인 설명이 충돌하므로 기존 오류 유지. probe·remove·regulator 계약을 이 관찰만으로 확정하지 않는다.

## 글별 근거

각 A~G 행은 `evidence`다. 내부 링크는 slug→파일로 해석하여 제목·seriesOrder·draft와 라벨 뒤 문구까지 확인했다. 이10편의 내부 링크 목적지는 모두 존재·공개이며, 파일 존재와 의미 일치를 구분했다. 경로 축약의 기준은 `src/content/blog/embedded/`이다.

### `chapter04-pinmux-clock.md`

source_file: `src/content/blog/embedded/bsp/chapter04-pinmux-clock.md`

- url: `/blog/embedded/bsp/chapter04-pinmux-clock`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: L64~65 macro tuple·L336 mux주소 오류.
- uncertainties: ALT표·pad bits·clock source·CCF/SPL 지원 범위·JTAG CCM주소·근거 없는90%는 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L223~229 출력해석·L299~323 점검순서·L360~362 baud비례증상은 적용관점. 독자적인 측정/실패분석은 없음. |
| B | 12 | pinmux→clock→runtime→진단 흐름은 완결. 구체레지스터 오류와미검증 API가 남아B≤13. |
| C | 6 | 7→6. DT·pad예·JTAG관찰은 있으나 따라 읽을 핵심macro/주소가 확인된 오류. L242~245 숫자·환경없는출력으로C≤8. |
| D | 9 | L23~34·59~88↔bsp ch02 L111~122·144~161 표/DT반복, L119~128↔ch06 L229~240 pad반복. Performance3-08 L78~95 CCF는 전력관점이고 이글은무출력진단이라 일부역할유지. |
| E | 7 | 두관문 약속을 L19~293이 이행하나 구체선택·재현의근거는약하다. 한보드예라는사실만으로범위오류를단정하지않음. |
| F | 7 | L380 다음DDR·L384~387 관련제목일치. L299~323 단계별점검과출력해석은템플릿밖고유구조. |
| G | 3 | L388~389 공식CCF/pinctrl자료가명시되어 있으나 실제레지스터/측정값의버전별연결은약하다. |

다음 조치: 주소·macro를고정버전과맞추고보드/측정환경보강. 병합 대상 없음; 동일표는ch02에두고무출력진단역할강화후보.

### `chapter05-ddr-params.md`

source_file: `src/content/blog/embedded/bsp/chapter05-ddr-params.md`

- url: `/blog/embedded/bsp/chapter05-ddr-params`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L145↔275 register값불일치.
- uncertainties: memory별refresh조건·vendor tool산출물·배율/기간·training순서와 실제보드dump는미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L81~94 SPD구분·L220~228 증상·L280~309 RAM fixup·일정의묶음은적용관점. 실측원자료없음. |
| B | 12 | timing→tool→training→stress→size까지완결. 실제입력에서추출하는예가얕고확인된register오류로B≤13. |
| C | 6 | L236~262검사와dump가있지만값불일치·tool/보드버전부재. L343~356일정도관측기록이아님. |
| D | 8 | L94~132↔bootloader ch09 L315~333·ch26 L150~160 tool→SPL중복. L236~254↔ch26 L264~280·bsp ch19 L42~66 stress중복. Recipes4-14 L225~243은refresh/검증일부만겹치며sizefixup은남는다. |
| E | 6 | timing소개·tool예는있으나제목의보드별Training추출은L201한줄과생략CSR뿐. |
| F | 7 | 6→7. L371다음·L375~378관련제목일치. L345~354작업일정이앞검사/산출물을묶는고유구조. 되돌아가는링크부재만으로이역할을무시하지않음. |
| G | 2 | L379~381공식tool/표준·도구링크는있으나값·버전·보드기록의직접근거부족. |

다음 조치: register·입력/산출물보강. 병합 후보 bootloader ch09/ch26; 이글은보드파라미터획득·sizefixup질문으로범위좁힐후보.

### `chapter06-u-boot-porting.md`

source_file: `src/content/blog/embedded/bsp/chapter06-u-boot-porting.md`

- url: `/blog/embedded/bsp/chapter06-u-boot-porting`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L280·477 imx8mp SD오프셋.
- uncertainties: DEBUG_UART문구범위, board Kconfig등록·직접pad주소·명령지원·SPL config/옵션버전미검증. baud문장만으로불가능한코드라고하지않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | L270~364 5단계실패분해와 L429~465 첫출력읽기는구체적인통합관점. 실제실험원자료가없어상단불가. |
| B | 12 | 복사→설정→SPL→실패→환경으로완결. Kconfig등록·board.c/DTS설명공백과오프셋오류로B≤13. |
| C | 8 | 코드·명령·실패/성공출력이풍부하나실제보드/빌드기록·수치근거없음. 출력의날짜/보드이름을실측증거로보지않고8상한. |
| D | 6 | L99~125·88~95↔bootloader ch21 L19~71 같은reference/file질문, L241~265↔L210~227 init흐름, L270~364↔L322~344 단계진단. 핵심답이같아중복큼. |
| E | 5 | 제목board.c·DTS작성대비 L113파일이름변경·L123~124복사에머물고본체는SPL/시리얼진단. |
| F | 7 | L513다음TF-A·L517~521관련제목일치. 5단계H3진단은고유탐색이며TODO그림은미완성요소로남음. |
| G | 2 | L522~524공식사이트/README/DM목록은있지만개별보드절차·값의고정버전출처부족. |

다음 조치: SD배치·보드등록·제목범위보강. 병합 후보 bootloader ch21.

### `chapter07-tfa-trustzone.md`

source_file: `src/content/blog/embedded/bsp/chapter07-tfa-trustzone.md`

- url: `/blog/embedded/bsp/chapter07-tfa-trustzone`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: BL31배치·시작시점·적재주체의내부모순.
- uncertainties: STM32MP1/ARMv8일반화·LOG_LEVEL·writel인자·SiPID·PSCI시그니처·TZASC register및OP-TEE build/mkimage계약미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | L126~155메모리맵·L245~306분할/패키징·L400~436진단을묶는통합관점. 관측실험없음. |
| B | 13 | 모델→빌드→PSCI→DT→OP-TEE→SMC→진단으로범위충실. 핵심모순·API의문으로13상한. |
| C | 8 | build명령·출력·GDB관찰단서는있으나실제실행환경/로그증빙없음. 주소/roundtrip수치근거부족으로8상한. |
| D | 9 | L31~40·310~330·210~214↔bootloader ch25 L43~65·104~129·297~307 BL/SMC/PSCI반복. bsp ch09 L31~99도같은흐름. 보드맵·패키징역할은남는다. |
| E | 7 | BL31·secure world·SMC 약속을본절이답하지만BL33결합은주소/인자위주이며정확한실험조건부족. |
| F | 7 | L476다음커널·L480~485관련제목/공개상태일치. 실제구현에서디버깅까지절이구분됨. TODOdiagram은잔여. |
| G | 2 | L486~488공식TF-A/PSCI/SMCCC자료는있으나보드값·이미지명·버전permalink부족. |

다음 조치: 배치/적재주체를실제보드태그와대조해보강. 병합 후보 bootloader ch25; 보드통합산출물질문으로차별화가능.

### `chapter08-kernel-config.md`

source_file: `src/content/blog/embedded/bsp/chapter08-kernel-config.md`

- url: `/blog/embedded/bsp/chapter08-kernel-config`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정오류·P0미발견. merge보정누락감점근거철회.
- uncertainties: L21~43mainline/vendor defconfig혼용·L60RT패치·L206bootm·L213overlay경로·initramfs예외는미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L73~110부트필수/지연로드분류가주기여. 실제설정선택의측정/실패사례는없음. |
| B | 12 | 11→12. 설정→merge→DT→산출물은완결. merge명령이기본Kconfig처리를하므로무조건olddefconfig누락감점은제거. DT통합깊이·불확실성은남아B≤13. |
| C | 7 | 빌드/설정명령은구체적이나태그·보드/지원경로·실행관찰부족. 절차위주로C≥10불가. |
| D | 9 | L21~30·112~126↔Recipes7-05 L65~99 defconfig/저장/빌드, L145~158↔Buildroot ch12 L141~167 fragments, L208~216↔bsp ch03 L311~332 overlay반복. builtin선택역할은남음. |
| E | 6 | defconfig·Kconfig·builtin약속은있지만DT통합은빌드·Makefile/overlay조각에머문다. |
| F | 5 | 4→5. L278의DeviceTree라벨은실제TF-A여서상한5. L281Buildroot첫글에는L35~41첫이미지명령이실제로있어완전오안내로보지않음. Performance허브링크도시리즈라벨이지만PREEMPT/HZ구체안내부족은남는다. |
| G | 1 | 구체주장과연결된공식자료/버전기록이없다. |

다음 조치: 보강. 병합 대상 없음; BSP builtin선택은독립의도. 중복설정명령은Recipes/Buildroot정본위임후보.

### `chapter09-smp-bringup.md`

source_file: `src/content/blog/embedded/bsp/chapter09-smp-bringup.md`

- url: `/blog/embedded/bsp/chapter09-smp-bringup`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L113 release주소의32bit cell범위초과.
- uncertainties: EL진입조건·펌웨어대기상태·PSCI호출위치/함수ID·secondary stack코드·hotplug지원미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 표준bringup·로그흐름반복이며 L203~227실패분류도실제관찰분석없음. |
| B | 10 | 9→10. 경로설명을불가능한모순으로과대해석한근거는제거. DT오류·개념stack예·빈TODO흐름도로여전히낮은완결구간. |
| C | 6 | DT·로그·online관찰은있으나releasecell오류·고정버전/실제환경부재. |
| D | 5 | L91~98↔bootloader ch33 L190~195같은cpu_boot, L107~114↔L100~115spin-table, L174~183↔L420~430로그. 핵심bringup질문이같고차별내용적음. |
| E | 8 | 7→8. PSCI·spin-table·hotplug약속을각절이답한다. hotplug명령3개라는분량만으로미이행단정하지않음. 재현깊이는부족. |
| F | 5 | 4→5. 다음ch10은맞고L246DeviceTree→TF-A는여전히오안내. RTOS/Performance시리즈라벨과후행멀티코어/SMP주제는실제허브목록에있어이유만으로추가오안내로세지않음. |
| G | 1 | 구체kernel/TF-A/PSCI주장에공식자료·버전연결없음. |

다음 조치: release주소·실제진입조건보강. 병합 후보 bootloader ch33.

### `chapter10-first-boot.md`

source_file: `src/content/blog/embedded/bsp/chapter10-first-boot.md`

- url: `/blog/embedded/bsp/chapter10-first-boot`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L274첫출력시점이L68~77·227과충돌.
- uncertainties: Image.gz압축해제주체·earlycon이름/console주소·서로다른보드예시·부팅시간원자료미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L224~234체크포인트와8단계구성이지도역할이나실측진단사례없음. |
| B | 12 | 전원부터login·시간분석까지완결. 첫출력시점오류와압축/console불확실로B≤13. |
| C | 7 | 단계별로그·systemd명령은있으나버전혼합·원자료없는타임라인/±50%로C≤8. |
| D | 7 | L21~34·241~250↔bsp ch15 L27~35·72~82같은시간/도구, L76~121↔ch06 L429~458배너, ch11 L60~86실패예반복. 현재Recipes7-01 L30~38·82~102도같은단계질문에구체출처로답한다. |
| E | 7 | 단계분석/멈춤판별약속은8단계·표로답하나실제측정·적용조건이부족. |
| F | 7 | 5→7. L282·286~288실제장제목일치. Buildroot첫글L35~41에이미지빌드예가있고Recipes는시리즈전체로명명되어있다. 허브이동만으로잘못된주제글이라고했던근거를제거. 체크포인트별결정표는고유탐색이다. |
| G | 1 | 로그·보드·버전이적혀있어도원전/실측기록없고공식주장별출처부족. |

다음 조치: 출력시점·압축/console계약보강. 병합 후보 ch11·ch15 또는Recipes7-01과범위분담.

### `chapter11-bootlog-debugging.md`

source_file: `src/content/blog/embedded/bsp/chapter11-bootlog-debugging.md`

- url: `/blog/embedded/bsp/chapter11-bootlog-debugging`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정오류·P0미발견.
- uncertainties: pin주소/baud패턴표·earlycon이름·재부팅후OOM기록·kgdb시점·콘솔선택과부팅실패후/proc접근전제미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | L19~213모드별원인/명령·L316~326점검표는구체적인진단구성. 실제원인확정실험은없음. |
| B | 12 | 증상→도구→확인흐름완결. 부팅못한보드의/proc접근전제·설명없는SysRq등공백과정확성의문으로B≤13. |
| C | 8 | 명령/예시결과/분류표는많지만보드·빌드·실제관찰부족. 패턴/시간의근거없는정량화로8상한. |
| D | 10 | 이글L19~213↔ch10 L220~234는정상/실패지도일부반복. L27·77~107↔bootloader ch22 L228~244garbage/점프/earlycon겹침. panic·latehang·debugfs의묶음역할은남는다. |
| E | 6 | earlyprintk/serial은절이있으나제목loglevel은실제값·레벨설명없이ignore_loglevel/quiet언급위주. |
| F | 7 | 5→7. L17전제·L349다음·L353~355라벨정확. L356Performance시리즈의ftrace는허브Part5목록에실제로있다. Recipes시리즈의디버깅범위도허브가안내한다. 특정상세글인척한라벨이아니므로허브이유만의상한철회. 모드별H3진단이고유구조. |
| G | 1 | 진단API·패턴표·보드주소에공식문서/버전출처없음. |

다음 조치: 보강. 병합 대상 없음; 실패모드카탈로그질문을정상부팅글과분담할수있다.

### `chapter12-driver-add.md`

source_file: `src/content/blog/embedded/bsp/chapter12-driver-add.md`

- url: `/blog/embedded/bsp/chapter12-driver-add`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L44↔49·51 WP/주소결정설명충돌.
- uncertainties: ADCraw/scale·gain/rate·kernelremove버전·부족header·clock반환/rollback·regulator always-on·binding검증결과미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L40~288다양한통합예와L290~306작성판단을묶지만실제통합실패분석없음. |
| B | 12 | 탐색→6사례→골격→binding→의존흐름완결. WP기술오류·API전제의문으로B≤13. |
| C | 7 | 노드/출력·dtcheck명령은있지만실제실행/버전없고검증로그부재. 코드조각을완성빌드로보지않음. |
| D | 8 | L178~221↔PM L320~372PCA9450/summary, L130~165↔pinmux L74~104패턴, L377~430↔DT ch03 L176~203binding반복. 현재Recipes7-03 L149~173EEPROM/SPI·7-08 L23~58·125~166·271~299platform/defer가상세정본역할. |
| E | 7 | 기존driver/binding/작성판단은실제절로이행. 작성판단의조건은짧고일반적. |
| F | 5 | 4→5. 다음PM·실제관련ch08/13/14일치. L478DeviceTree라벨은TF-A로가므로5상한. Recipes/RTOS시리즈자체의주제연결은구성표에도있어추가오안내근거에서제외. |
| G | 1 | 문서디렉터리는있으나구체API·칩조건·버전의직접출처부족. |

다음 조치: WP·API/ADC예검증보강. 병합 후보 Recipes7-08; 이글은기존driver의DT통합질문으로차별화가능.

### `chapter13-power-management.md`

source_file: `src/content/blog/embedded/bsp/chapter13-power-management.md`

- url: `/blog/embedded/bsp/chapter13-power-management`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정오류·P0미발견.
- uncertainties: mem/mem_sleep상태·callback문맥·비동기pm_runtime_get뒤I/O·OPP상태·regulator/PMIC계약·전류값의환경미검증. 설명의의문을기억만으로오류확인하지않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | framework/명령/OPP나열중심이며전력절감의실제관찰·실패분석없음. |
| B | 12 | sleep→runtime→idle/freq→regulator→측정으로완결. callback본문생략·조건불분명한권고와정확성의문으로B≤13. |
| C | 7 | 상태/통계관찰명령과DTS가있으나보드버전·실측기록없음. L396~400전류·L39~41복귀시간으로8상한. |
| D | 10 | L320~372↔driverch12 L174~221동일PMIC/LDO와소비자. L263~270·185~199↔Performance3-09 L54~80·123~139governor/idle겹침이나후자는race-to-idle관점. Recipes7-08 L299는이글로runtimePM을위임. |
| E | 7 | Suspend/Runtime/Regulator와idle/freq약속은각절로이행. 요구사항별선택·측정검증은약함. |
| F | 7 | 5→7. L426다음Thermal·L430~432실제목적지맞음. Performance허브Part3에DVFS/Power-vs-Performance가있고Recipes허브도low-power/전력레시피를안내. 시리즈라벨+주제소개를상세글사칭으로보지않음. 4축과명령/설정대응이고유구조. |
| G | 1 | PM/DT표준·보드전류의공식버전별출처나실험원자료가없음. |

다음 조치: 보강. 병합 대상 없음; BSP의PM통합질문은독립적이며중복regulator노드는driver글에위임후보.

## 해석과 후속 작업

점수 상승 대부분은 안내 링크의 목적을너무좁게해석한감점과한개절분량을미이행으로본판단을수정한결과다. 오류확인비율은여전히높다. macro/주소/메모리배치는실제보드에서잘못따르면실패할수있는구체계약이므로공식태그를기준으로수정보강할후보다. 이번루프는보고서작성으로끝내며원문수정·병합·draft변경을수행하지않았다.
