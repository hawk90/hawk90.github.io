# 공개 글 AdSense 평가 — 루프 05

> 대상: 공개 글 10편 (BSP Development, `seriesOrder` 4~13)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 다섯째 루프다. 대상은 `src/content/blog/embedded/bsp/`의 `chapter04-pinmux-clock.md`~`chapter13-power-management.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter04-pinmux-clock.md` | 12 | 12 | 7 | 9 | 7 | 7 | 3 | **57** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter05-ddr-params.md` | 12 | 12 | 6 | 8 | 6 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter06-u-boot-porting.md` | 14 | 12 | 8 | 6 | 5 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter07-tfa-trustzone.md` | 14 | 13 | 8 | 9 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter08-kernel-config.md` | 11 | 11 | 7 | 9 | 6 | 4 | 1 | **49** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter09-smp-bringup.md` | 9 | 9 | 6 | 5 | 7 | 4 | 1 | **41** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter10-first-boot.md` | 11 | 12 | 7 | 7 | 7 | 5 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter11-bootlog-debugging.md` | 14 | 12 | 8 | 10 | 6 | 5 | 1 | **56** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter12-driver-add.md` | 12 | 12 | 7 | 8 | 7 | 4 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter13-power-management.md` | 10 | 12 | 7 | 10 | 7 | 5 | 1 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 52.2점(10편 합 522), 범위 41~60점이다. 판정은 우선 조치 6편, 병합 검토 4편이고 보강·유지·검증 대기·제외 검토는 없다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 6편(ch05·06·07·09·10·12)이고 모두 원문 내부 모순(루브릭 3-1: 코드 vs 산문, 두 구체 진술)으로 판정했다. 1차 자료로 확인한 오류는 없다(로컬에 커널·U-Boot·TF-A clone이 없다). 점수 구간으로는 ch07(60)만 보강이고 나머지 9편이 병합 검토(40~59)다. 병합 검토 4편은 모두 독립 검색 의도가 있어 다음 조치를 보강(차별화)으로 적었다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft` 상태까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter04-pinmux-clock.md` | 57 | 57 | 0 | 없음 |
| `chapter05-ddr-params.md` | 52 | 52 | 0 | 없음 |
| `chapter06-u-boot-porting.md` | 54 | 54 | 0 | 없음 |
| `chapter07-tfa-trustzone.md` | 60 | 60 | 0 | 없음 |
| `chapter08-kernel-config.md` | 50 | 49 | -1 | 없음 |
| `chapter09-smp-bringup.md` | 41 | 41 | 0 | 없음 |
| `chapter10-first-boot.md` | 50 | 50 | 0 | 없음 |
| `chapter11-bootlog-debugging.md` | 56 | 56 | 0 | 없음 |
| `chapter12-driver-add.md` | 51 | 51 | 0 | 없음 |
| `chapter13-power-management.md` | 52 | 52 | 0 | 없음 |

1차 합 523에서 최종 522로 1점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 없음.
- 추가한 오류 확인: 2건, 2편.
  - ch06: 202·504행 '`CONFIG_DEBUG_UART_*` 네 줄이 … base, clock, baud rate가 정확해야 합니다' vs 157~160행 DEBUG_UART 네 줄(baud 항목 없음, baud는 161행 `CONFIG_BAUDRATE=115200`). 평가자는 산문 표기 수준으로 uncertainties에 두었지만, 무엇이 baud를 정하는지에 대한 기술 주장이라 오류 확인으로 올렸다. 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
  - ch07: 306행 'BootROM이 이 단일 binary를 적재해 분해한 뒤 각 단계로 점프' vs 51~52행 'SPL이 DDR로 bl31.bin·tee.bin·u-boot.itb 적재 → BL31 점프'. 적재 주체가 다르다. 이미 오류 확인이던 글에 근거 (3)으로 더했다.
- 점수 변경: ch08 D 10→9. 평가자가 '이 글에만 있다'고 한 256~258행 디버깅 옵션 실수가 같은 시리즈 ch11 333·345행에 있다. 나머지 9편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch04의 ch06 229~240행, ch05의 bootloader ch09 326행·ch26 150~160행, ch07의 bootloader ch25 43~65·104~129·110·288행, ch09의 ch33 190~195행, ch10의 ch15 27~35·72~82행, ch11의 ch10 153행·ch22 228~244행, ch12의 ch13 365~371행). ch04 factcheck_basis에서 git log 상단에서 확인되지 않은 커밋 해시를 빼고 확인된 것만 적었다.
- ch12 B 근거에서 1차 자료 위치가 없는 메커니즘(remove 시그니처, always-on)을 감점 근거에서 빼고 uncertainties로만 두었다(AP-C-31). 점수는 AP-C-24 상한 안이라 유지.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 다음 편 안내는 10편 모두 맞다. 감점 원인은 'Ch 7: Device Tree 작성' 라벨이 TF-A 글로 가는 것(ch08·09·12), 주제 라벨을 단 링크가 시리즈 소개 00-preface로 가는 것(ch08·09·10·11·12·13), 전제 지식 안내 부재, TODO·ASCII 그림이다.

## 글별 근거

### `chapter04-pinmux-clock.md` — 57점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에는 0a9dd7bc(slug 고정), be973200(topic), e85d7684(코드 블록 산문 이동), ac24bb76(제목 변경), 20c1b507(ASCII→TikZ 일괄) 등 형식·구조 커밋만 있고, 수치·레지스터·API를 RM·커널·U-Boot 소스와 대조했다고 적은 커밋이 없다. 로컬에 커널·U-Boot clone(imx8mp-pinfunc.h)이 없어 1차 자료를 열지 못했다. 글 안에서 동시에 참일 수 없는 두 구체 진술도 찾지 못했다(146·251행 AHB 400MHz, 148·255행 UART 100MHz, 334행 0x10000000과 bit 28 설명은 서로 맞다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 것은 clk_summary enable count가 0이면 probe 코드를 의심하라는 진단(223~229행), XTAL을 잘못 가정하면 baud가 105k처럼 비례로 어긋난다는 증상(360~362행), 하드웨어→부트 미디어→pin mux→clock 점검 순서(299~323행), JTAG으로 CCM·IOMUXC 레지스터를 읽는 예(331~338행)다. SAI5_RXFS ALT 표(23~34행)와 iomuxc 매크로 설명(59~61·82~88행)은 chapter02 111~122·144~161행과 같고, CCF API 목록(200~205행)은 커널 문서 수준이다. 15·370행 '거의 100% 달라짐'은 267·375행과 결이 맞지 않는 출처 없는 단정이고, 17행 '90%', 133행 '아직 모든 SoC가 그 수준은 아닙니다'는 완곡 표현이다. 6~12 구간 상단. |
| B | 12 | pin mux 개념(19~36행) → IOMUXC(38~68행) → DT pinctrl(70~106행) → 부트로더 pin mux(108~133행) → clock tree(135~172행) → CCF(174~229행) → U-Boot clock(231~263행) → 보드별 변경(265~293행) → 점검·실수·정리(295~376행)로 끝까지 간다. clock tree(141~165행)는 SoC를 밝히지 않은 '단순화' 그림이고 clock_init(236~258행)은 '(요약)'에 `...` 인자라 따라갈 수 없다. 333·336행 주소, 255행 UART source, 233행 'U-Boot에 CCF 없음' 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | DT 예(74~97·180~186·280~291행), U-Boot pad 코드(114~129행), clk_summary 출력과 읽는 법(209~229행), JTAG mdw 명령과 기대값(331~338행), 4단계 체크리스트(299~323행)가 있다. clk_summary·JTAG 출력에 보드·커널·U-Boot 버전이 없고 242·245행 PLL 값(0x800000d8, 0x800000f0)에 출처가 없어 C ≤ 8. 242행 `pll_config(..., ...)`는 생략 인자라 실행 불가, 358행 `pinctrl_show`는 실재 명령인지 불명이라 7. |
| D | 9 | 같은 시리즈 chapter03-device-tree-design.md(99~104행 pinctrl 상태 외 겹침 작음), chapter05-ddr-params.md(겹침 없음). 겹침이 큰 곳: chapter02-datasheet.md 111~122행 SAI5_RXFS ALT0~ALT7 표 = 이 글 23~34행, chapter02 144~161행 `MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX 0x140` = 이 글 59~61·82~88행, chapter06-u-boot-porting.md 229~240행 `uart_pads[]` ≈ 이 글 119~128행, chapter06 287~295행 시리얼 무출력 점검 ≈ 이 글 299~323행. 다른 시리즈 performance-engineering/part3-08-peripheral-clock.md 78~95행은 CCF를 전력 관점으로 다뤄 역할이 다르고, bootloader/chapter21-board-porting.md·modern-recipes/part7-03-device-tree-basics.md는 pinctrl-names 수준만 겹친다. 5~9 상단. |
| E | 7 | 제목·description(5행)의 두 주제를 본문이 모두 다룬다(19~133행 pin mux, 135~293행 clock, 295~340행 진단). 제목은 SoC 일반인데 표·코드·레지스터는 거의 i.MX 8M Plus뿐이고(23·42·112·192·236·333행) TI·Rockchip·ST는 40·106행 한 문장씩이라 E ≤ 8. clock tree가 실제 SoC 트리가 아닌 단순화 그림(139행)이라 7. |
| F | 7 | 380행 'Ch 5 — DDR 매개변수'는 seriesOrder 5 chapter05-ddr-params.md와 맞다. 384~387행 관련 링크 4개(chapter02·03·05·06)의 라벨이 대상 제목과 모두 맞다. 고유 구조로 299~323행 [1]~[4] 점검표, 223~229행 출력 읽는 법이 있다. 전제 지식 안내가 없고 141~165행 clock tree가 text 코드 블록 ASCII 그림(§6 위반 후보)이며 audit:reading·폰 폭 확인을 하지 않아 9 이상은 불가. |
| G | 3 | 커널 경로 `imx8mp-pinfunc.h`(61행), `imx8mp-clock.h`(192행), U-Boot `spl.c`(115행)·`clock_imx8mp.c`(236행), kernel.org CCF·pinctrl 문서(388~389행)가 주장과 연결된다. 커널·U-Boot 태그, i.MX 8M Plus RM 판 번호가 없고 kernel.org 링크도 `latest`라 333·336행 주소와 193~196행 clock ID의 기준 시점을 알 수 없다. 2~3 상단. |

uncertainties:
- 65행 `MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX` 값(0x1F4 0x454 0x5C4 0x0 0x0)을 커널 imx8mp-pinfunc.h와 대조하지 않았다(로컬 clone 없음).
- 336행 0x303404B0을 UART1_RXD MUX_CTL 주소로 적었는데, 65행 MUX 오프셋 0x1F4와 chapter02의 IOMUXC base 0x3034_0000을 더하면 0x303401F4다. base가 이 글 안에 없어 다른 글과의 모순이고 RM으로 정할 일이다.
- 333행 0x30890084를 CCM_TARGET_ROOT_UART1로 적었는데 chapter02·06은 0x3089_0000을 UART2 base로, chapter02는 CCM base를 0x3038_0000으로 적는다.
- 255행 UART1_CLK_ROOT SOURCE_SEL(0)을 sys_pll1_100m으로, 148·219행 UART clock을 100MHz로 적었지만 chapter02·06의 CONFIG_DEBUG_UART_CLOCK은 24000000이다.
- 233·373행 '부트로더는 CCF가 없습니다': U-Boot clk uclass·i.MX8M CCF 포팅 여부를 소스로 확인하지 않았다. 373행은 CCF 부재를 IOMUXC 직접 쓰기의 이유로 연결해 논리도 어긋난다.
- 358행 '마지막에 적용된 쪽이 이깁니다. 둘 다 동작 안 합니다'는 긴장 관계지만 오류 확인으로 올리지 않았다. bsp/chapter12는 같은 상황을 '후순위 probe 실패'로 적는다. `pinctrl_show` 실재 여부도 미확인.
- 15·370행 '보드별로 거의 100% 달라짐'과 267행 'SoC dtsi clock 노드는 고정'·375행 'PLL 설정은 거의 SoC 기본'이 결이 다르다(산문 수준, A 감점으로만 반영).
- 340행 JTAG이 '유일한 진단 수단'이라는 단정은 299~323행의 JTAG 없는 점검 절차와 맞지 않는 과장이다.
- 23~34행 ALT 표, 50행 PUE/PUS 비트 [12:13], 193~196행 clock ID, 242·245행 PLL 값을 RM·dt-bindings로 확인하지 않았다. 15·370행 '거의 100%', 17행 '90%', 362행 '26MHz, 25MHz도 흔함'은 출처 없는 수치다.

병합 대상: 부분 병합 대상은 `bsp/chapter02-datasheet.md`(111~122행 SAI5 ALT 표, 144~161행 iomuxc 매크로 = 이 글 23~34·59~61·82~88행)와 `bsp/chapter06-u-boot-porting.md`(229~240행 uart_pads, 287~295행 시리얼 점검 ≈ 이 글 119~128·299~323행)다. 글 전체를 합칠 대상은 없다. 다음 조치는 보강(차별화): clock tree·CCF·assigned-clock·JTAG 진단(135~340행)은 다른 글에 없는 역할이다. ALT 표·매크로 설명은 chapter02에, SPL pad 코드는 chapter06에만 두고 이 글은 링크로 대신하며, 실제 i.MX 8M Plus clock tree(RM 판 명시)와 레지스터 주소를 1차 자료로 대조해 채운다.

### `chapter05-ddr-params.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 코드 vs 예시 출력)이다.
- 145행 NXP DDR Tool 출력 배열: `{ 0x3d400064, 0x006180e },   /* DDRC_RFSHTMG */` (곧 0x0006180E)
- 274~275행 `devmem 0x3d400064   # DDRC_RFSHTMG` 출력: `0x006180e0`
- 278행은 '이 값들이 *tool 출력과 일치*하는지 확인합니다. … 그대로일 것입니다'라고 두 값이 같아야 한다고 밝혔으므로 동시에 참일 수 없다(MSTR은 144·272행 모두 0x81040020으로 일치).

git log에 1차 자료 대조 커밋은 없다: 160a78a8(최초 집필), 2aa6a8c7·49f2a443·ac24bb76·e85d7684·be973200·0a9dd7bc(일괄 정리·메타데이터), e4f6db70 'Qualify BSP storage and DDR guidance'(출처 없는 완곡화)뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 것은 SPD 유무별 timing 결정 흐름 표(89~92행), 증상→의심 파라미터 표(220~228행), `board_phys_sdram_size`/`ft_board_setup`으로 DT 메모리 크기를 fixup하는 절(293~309행), 14일 DDR 일정표(345~354행), DDR4-2400 CL17 환산 예(71~77행, 산술 맞음)다. 223·225행 증상→원인 대응과 79행 '거의 항상 한 cycle씩 어긋납니다'는 출처가 없다. 98행 '버전에 따라 다릅니다', 362행 '함께 확인해야 합니다', 363행 '조합에 따라 다릅니다', 366행 '신뢰성 계획에 맞춰 정합니다'는 완곡 표현이다. timing 표(53~67행)·DRAM 종류 표(35~43행)는 JEDEC 개요 수준. 6~12 상단. |
| B | 12 | 왜 어려운가(19행) → timing(49행) → SPD(81행) → vendor tool(96행) → 출력 예(134행) → PHY training(191행) → 증상(216행) → stress(232행) → register dump(266행) → RAM size(280행) → 실수(311행) → 일정(341행)까지 간다. 제목의 '추출'은 113~116행 불릿 넷뿐이고 코드(163~184행)는 정의되지 않은 `ddr_fsp0_cfg`·`ddr_ddrphy_trained_csr`·`ddr_phy_pie`를 참조한다. 87·361행 'timing을 손으로 설정'과 15·79·189행 '손으로 적는 사람은 없다'가 어긋난다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | `mtest`(238~244행), `stress-ng`·`memtester`(248~252·256~262행), `devmem` dump(270~276행), training 실패 로그(208~212행)가 있다. 보드·U-Boot·firmware-imx·DDR Tool 버전이 없고 합격·실패를 가르는 기대값이 없다. '0.1초만에 freeze'(223행), '1시간 뒤 random oops'(224행), '최소 1시간 … 24시간'(327행), '약 1~2주'(343행)는 출처 없는 수치라 C ≤ 8. 유일한 기대값 대조 절차(270~278행)는 145행 값과 맞지 않는다. part1-04(C 6)와 같은 수준. |
| D | 8 | 비교한 글: 같은 시리즈 chapter04-pinmux-clock.md, chapter06-u-boot-porting.md(97행 DDR 코드 위치, 325행이 ch05로 넘김), chapter19-stability-testing.md. 다른 시리즈 bootloader/chapter09-dram-init.md, bootloader/chapter26-ddr-training.md, modern-recipes/part4-14-ddr-init-failure.md. DRAM 종류 표 35~43행 ↔ ch09 43~49행, vendor tool → SPL 흐름 94·109~132행 ↔ ch09 262·315~333행·ch26 150~160행, PHY training 193~214행 ↔ ch09 280~313행, mtest/memtester 236~254행 ↔ ch09 338~353행·ch26 264~280행·bsp ch19 42~66행, tREFI 230·321~323행 ↔ part4-14 231·243행·ch26 121행. 고유: SPD vs SPD-less(81~94행), 증상표(220~228행), RAM size fixup(280~309행), 일정표(341~356행). ch09 326행이 'BSP 5장에서 더 깊이'라고 넘기지만 이 글이 더 깊지 않다. |
| E | 6 | 제목 'DDR 매개변수 결정 — 보드별 Timing·Training 추출'과 description이 49~79·81~94·96~189·191~214행과 같은 질문을 향한다. 'Training 추출'은 201행 한 줄('결과를 CSR에 저장')뿐이고 '보드별 timing 추출'도 113~116행 불릿만 있어 datasheet 값 → tool 입력의 실제 예가 없다. 키워드 하나의 부분 미이행이라 6~8 하단. |
| F | 6 | 371행 다음 편 'Ch 6 — U-Boot 보드 포팅'은 seriesOrder 6 chapter06-u-boot-porting.md와 맞다. 375~378행 관련 항목(ch02·ch04·ch06·ch07) 라벨이 모두 맞다. 일정표(345~354행)가 앞 절을 작업 순서로 묶는다. 전제 지식 안내가 없고, 이 글을 가리키는 bootloader ch09(326·432행)·ch26·recipes part4-14(252행)로 되돌아가는 링크가 없다. audit:reading·폰 폭 렌더는 확인하지 않았다. |
| G | 2 | 379~381행 NXP DDR Tool, JEDEC JESD79-4, memtester 링크는 관련 항목 목록이라 특정 주장과 연결되지 않는다. 230행 7.8us/3.9us, 323행 `DDRC_RFSHCTL0 refresh_mode`, 128~130행 출력 파일명에 출처 위치가 없다. firmware-imx·U-Boot·DDR Tool 버전도 없다(204·331행은 '버전 불일치'를 경고하면서 기준 버전을 주지 않음). |

uncertainties:
- 128~130행 NXP DDR Tool 출력 파일명(`ddr_init.c`·`ddr_data.c`·`timing.h`)이 bsp/chapter06 70·97행, bootloader/chapter26 132·160행의 `lpddr4_timing.c`와 다르다. NXP 자료로 확인하지 않았다.
- 102행 NXP DDR Tool의 i.MX 6·7 지원 표기 미확인(379행 링크는 i.MX 8M family 도구).
- 315행 'NXP EVK는 2GB DDR4'가 136행 i.MX 8M Plus + LPDDR4 예와 맞는지 미확인.
- 113행 `MT40A1G16TB-062E`와 319행 `MT40A1G16-062E` 표기가 다르고, 319행 '마지막 두 자리'가 speed bin이라는 설명과 -062E의 실제 speed grade는 Micron 자료로 확인하지 않았다.
- 323행 `DDRC_RFSHCTL0`의 `refresh_mode = 1`과 MR4 설정의 레지스터·필드 이름을 i.MX 8M RM으로 확인하지 않았다.
- 230행 JEDEC tREFI 7.8us / 85°C 초과 3.9us를 JESD79-4로 대조하지 않았다.
- 223~225행 증상→원인 대응과 79행 '거의 항상 한 cycle씩 어긋남'은 출처가 없다.
- 165·183행 `.drate = 4000`, 171행 '100 MT/s deep sleep' FSP 값이 upstream U-Boot i.MX 8M Plus LPDDR4 타이밍 파일과 같은지 미확인.
- 87·361행 '손으로 설정'과 15·79·189행 '손으로 적는 사람은 없다'의 충돌(산문 충돌이라 오류 확인에 넣지 않음).

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `bootloader/chapter09-dram-init.md`(종류 표·vendor tool 흐름·training·mtest)와 `bootloader/chapter26-ddr-training.md`(training·출력 파일·stress)다. ch09 326행이 이 글로 '더 깊은 설명'을 넘기고 있어 독립 검색 의도(보드별 DDR 파라미터 결정)가 있으므로 다음 조치는 보강이다. 먼저 145행/275행 RFSHTMG 값 모순을 고치고, datasheet 표 → tool 입력 칸 → 출력 레지스터로 이어지는 추출 예 하나와 출력 파일명을 NXP 1차 자료로 확인한 뒤, ch09·ch26과 겹치는 종류 표·mtest 절은 링크로 줄인다.

### `chapter06-u-boot-porting.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 코드·산문 모순(루브릭 3-1)이다.
- 202행: '`CONFIG_DEBUG_UART_*` 네 줄이 *첫 시리얼 출력*을 결정합니다. base address, clock 주파수, baud rate가 정확해야 합니다'(504행 정리도 같은 문장)
- 157~160행 defconfig의 DEBUG_UART 네 줄: `CONFIG_DEBUG_UART=y`, `CONFIG_DEBUG_UART_BASE=0x30890000`, `CONFIG_DEBUG_UART_CLOCK=24000000`, `CONFIG_DEBUG_UART_IMX=y` — baud 항목이 없고 baud는 161행 `CONFIG_BAUDRATE=115200`이다.

글이 보여 준 네 줄로는 baud rate를 정할 수 없으므로 산문과 코드가 동시에 참일 수 없다. git log(7824b986 stub, 400892d7 linter, 160a78a8 시리즈 집필, ac24bb76 제목 변경, e85d7684·68525f0c 코드 블록 산문 이동, be973200 topic, 0a9dd7bc slug 고정)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 것: 첫 부팅 디버깅을 단계 1~5로 나누고 단계마다 증상 로그·점검 목록을 둔 절(274~364행), IOMUXC·UTXD에 직접 써서 'A' 한 글자로 시리얼 경로를 가르는 진단 코드(300~315행), 정상 첫 출력의 줄마다 어느 BSP 부분이 살아 있는지 짚은 해석(459~465행). 반면 reference 보드 복사(99~125행)·6개 파일 목록(88~95행)·defconfig(138~191행)·spl.c(212~266행)는 bootloader ch21과 같은 흐름이고 환경 변수·TFTP 절(366~425행)은 입문 수준이다. 202·204행 '정확해야 합니다', '충분한 공간이 있어야 합니다'는 완곡 표현. 13~19 하단~중간. |
| B | 12 | 디렉터리 구조(50~86행) → 복사(105~125행) → defconfig(138~204행) → spl.c(212~266행) → 디버깅 5단계(270~364행) → 환경(366~407행) → TFTP(409~425행) → 첫 출력(427~465행) → 실수(469~498행) → 정리(500~509행)로 끝까지 간다. 제목의 board.c는 113행 이름 변경뿐이고 DTS는 123~124행 cp·sed와 152행 한 줄뿐이다. 142행 CONFIG_TARGET_ACME_CAM을 arch Kconfig에 등록하는 단계도 빠졌다. SD 오프셋·2024.04 기준 옵션 이름·21행 vs 44행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 빌드 명령(130~131행), 단계별 실패 로그(319~323·329~333·344~362행), dm tree·mii info 출력(354~362·495~498행)이 있다. 가상의 ACME 보드라 실행 환경이 없고 31행 '보통 128KB 이내', 419행 41.6 MiB, 425행 '1초 컴파일 후 1초 부팅'에 출처가 없어 C ≤ 8. 432·440행 빌드 날짜 'May 19 2026'이 글 date 2026-05-18(4행)보다 뒤다. 300~312행 진단 코드는 UART clock·UCR 설정 없이 UTXD에 쓰는데, 295행이 원인으로 든 UART parent clock을 315행은 빼고 'pad mux 또는 baud rate'로만 단정한다. |
| D | 6 | 같은 시리즈 chapter05-ddr-params.md·chapter07-tfa-trustzone.md는 역할이 구별된다(이 글 325·44행이 넘김). 다른 시리즈 bootloader/chapter21-board-porting.md는 같은 질문에 같은 답을 한다: reference 보드 복사(99~125행 ↔ ch21 19~41행), 바꿀 파일 여섯 군데(88~95행 ↔ 43~71행), defconfig 첫 줄(139~142행 ↔ 80~83행), board_init_f 순서(241~265행 ↔ 210~227행), 5단계 디버깅(270~364·506행 ↔ 322~344행), SYS_TEXT_BASE·UART clock 실수(471~481행 ↔ 372~375행). 환경 변수 절(370~407행)은 bootloader/chapter13-env-bootcmd.md 92~96·67~74행과, TFTP 절(411~425행)은 modern-recipes/part7-02-uboot-usage.md 68~73행과 겹친다. 5~9 하단. |
| E | 5 | 제목(2행)과 description(5행)은 'defconfig·board.c·DTS 작성 흐름'을 약속한다. defconfig는 134~204행에서 다루지만 board.c는 92행 목록과 113행 mv뿐 코드가 없고(코드는 spl.c), DTS는 123~124행 복사·치환과 152행 한 줄뿐이다. 키워드 절반 이상 누락이라 3~5. 실제 중심인 '시리얼 첫 한 줄까지의 디버깅 사이클'(15행)은 제목에 드러나지 않는다. |
| F | 7 | 513행 다음 편 'Ch 7 — TF-A와 TrustZone 통합'은 seriesOrder 7 chapter07-tfa-trustzone.md와 맞다. 517~521행 관련 항목(ch04, ch05, ch07, Buildroot ch10, Embedded Security ch02) 라벨이 대상과 모두 맞고, 본문 44·325행 링크도 맞다. 디버깅 절이 단계 1~5 H3(274·287·317·327·342행)로 나뉜다. 같은 주제 bootloader ch21·ch13 링크가 없고 전제 지식 안내가 없으며 23~26행 '<!-- TODO: TikZ -->'와 text 블록 화살표 자리표시가 있다. audit:reading·폰 폭은 보지 않아 9 이상 불가. |
| G | 2 | 본문 주장에 연결된 1차 출처가 없다. 158·200행 UART2 base 0x30890000, 304~310행 IOMUXC·UTXD 주소, 146~149행 SPL SRAM 주소에 RM 판·절 인용이 없다. U-Boot 버전은 로그 예(320·345·432·440행 '2024.04')에만 있고 defconfig·헤더 예의 기준 버전은 밝히지 않는다. 522~524행 U-Boot 사이트·README·Driver Model 문서는 개별 주장과 연결되지 않는다. |

uncertainties:
- 21행 '요즘 SoC의 U-Boot은 항상 두 단계' vs 44행 'ARMv8 보드는 SPL 자리에 TF-A BL2가 오는 경우가 늘고 있습니다'. 'SPL 자리'를 역할 대체로 읽을 여지가 있어 오류 확인에 넣지 않았다.
- 31행 SPL 크기 '보통 128KB 이내' vs 147행 CONFIG_SPL_MAX_SIZE=0x25000(148KiB). '보통'이라 모순으로 단정하지 않았다.
- 280·477행 SD 부트 이미지 오프셋 '1KB(dd seek=2 bs=512)' vs bsp/chapter17-image-packaging.md 117·129·341행 32KB, bootloader/chapter21 317행 bs=1k seek=33. 다른 글과의 모순이라 RM 부트 장으로 정할 일.
- 141·197·471~473행 CONFIG_SYS_TEXT_BASE가 U-Boot 2024.04 기준 CONFIG_TEXT_BASE로 바뀌었는지 미확인.
- 370~392행 include/configs/<board>.h의 CONFIG_EXTRA_ENV_SETTINGS·CONFIG_BOOTCOMMAND 방식, 215행 `#include <common.h>`, 181행 CONFIG_DM_ETH가 2024.04에서도 유효한지 미확인.
- 300~315행 UART clock·UCR 설정 없이 UTXD에 쓰는 코드가 'A'를 내보내는지 미확인.
- 245~247·251~253행 init_uart_clk(1)를 두 번 부르고 preloader_console_init()을 spl_init() 앞에 둠. bootloader ch21 210~225행은 반대 순서. 미확인.
- 432·440행 예시 출력의 빌드 날짜가 글 date보다 뒤라 실제 보드 출력인지 불명.
- 419행 41.6 MiB, 425행 '1초 컴파일 후 1초 부팅'은 출처 없는 수치.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `bootloader/chapter21-board-porting.md`다. 다음 조치는 차별화 보강: 이 글은 BSP 관점 '첫 시리얼까지 디버깅 사이클'(274~364행)에 집중하고, 복사·6개 파일·defconfig 일반 설명은 bootloader ch21로, 환경·TFTP 절(366~425행)은 bootloader ch13·modern-recipes part7-02로 링크해 줄인다. 202·504행 문장을 157~161행 코드에 맞게 먼저 고친다.

### `chapter07-tfa-trustzone.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(160a78a8 시리즈 작성, ac24bb76 제목 변경, e85d7684 코드 블록 산문 이동, be973200·0a9dd7bc 메타데이터, 400892d7·7824b986 일괄 정리·stub)에 1차 자료 대조 커밋이 없다. 근거는 글 내부 모순 세 쌍이다.
- (1) 51행 'SPL이 DDR로 bl31.bin·tee.bin·u-boot.itb 적재', 467행 'BL2(또는 SPL)가 DDR을 초기화하고 BL31·BL32·BL33을 DDR에 적재' vs 131행 `BL31_BASE U(0x970000)`·151행 'BL31_BASE는 SRAM 안의 작은 영역 … SRAM에 머뭅니다'·442행 'BL31_BASE를 DDR 안에 두면 … fault'.
- (2) 151행 이유 'DDR이 깨어나기 전부터 동작해야 하므로' vs 50~52행 순서(SPL이 DDR 초기화 → 적재 → BL31 점프).
- (3) 306행 'BootROM이 이 단일 binary를 적재해 분해한 뒤 각 단계로 점프' vs 51~52행(SPL이 각 이미지를 적재하고 BL31로 점프) — 적재 주체가 다르다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 i.MX 8M Plus flash.bin 구성과 SPL이 BL2를 겸하는 흐름(46~56행), platform_def.h 메모리 맵과 주소별 설명(130~155행), imx-mkimage 묶음 명령(294~306행), BL31_BASE·PLATFORM_CORE_COUNT·TZASC·BL33_BASE·SiP ID·secure-status 실수 목록(440~462행)이다. BL 단계 표(31~38행), PSCI 일반 설명(159행), SMC 경로(330~353행)는 TF-A 문서 수준이다. BL31 위치가 글 안에서 맞지 않아(51·467행 vs 131·151·442행) 판단 기준으로서 가치가 깎인다. |
| B | 13 | 필요 이유(17~23행) → BL 모델(25~56행) → 소스 트리(58~102행) → 빌드(104~124행) → 메모리 맵(126~155행) → PSCI(157~204행) → DT(206~239행) → TZASC(241~271행) → OP-TEE(273~306행) → SMC(308~355행) → SiP(357~398행) → 디버깅(400~436행) → 실수(438~462행) → 정리(464~472행) 흐름은 완성돼 있다. BL31 위치 모순, 179행 vs 253행 writel 인자 순서, 327행 function ID 불확실이 열려 있어 B ≤ 13. |
| C | 8 | BL31 빌드(106~118행), OP-TEE 빌드(277~290행), imx-mkimage(294~303행), gdb 세션(426~434행)은 따라 할 수 있다. 0x970000(124·131행), TZASC_BASE 0x32F80000(248행), region 속성값(255·260·265행), LOG_LEVEL(122행), 'μs 단위'(355행)에 출처·대상 버전이 없어 C ≤ 8. 406행 'Built : May 19 2026'이 글 날짜(4행 2026-05-18)보다 뒤라 실제 실행 기록으로 보기 어렵고, 합격·실패 관찰을 가르는 검증 절차는 없다. |
| D | 9 | 같은 시리즈 chapter06-u-boot-porting.md(44·513행에서 넘김, 겹침 적음), chapter08-kernel-config.md(겹침 없음), chapter09-smp-bringup.md(psci/cpus DT 58~64·27~54행 ↔ 이 글 210~239행, CPU_ON 흐름 ↔ 310~353행). 다른 시리즈 bootloader/chapter25-tfa-optee.md(BL 표 43~65행 ↔ 31~40행, SMC 호출 104~129행 ↔ 310~330행, PSCI DT 297~307행 ↔ 210~214행), bootloader/chapter31-tfa-bl31-runtime.md(↔ 330~396행), bootloader/chapter32-psci-smccc.md(↔ 157~204·310~353행), embedded-security/chapter04-trustzone.md(↔ 17~23행). 보드 port(platform_def.h), imx-mkimage, TZASC, 실수 목록이 고유 역할로 남는다. 5~9 상단. |
| E | 7 | 제목 'BL31·secure world·SMC 흐름'과 description의 'BL31 빌드, U-Boot와 BL33 결합, secure/non-secure 분리'는 104~124행, 152~155·292~306행, 241~271행, 308~355행에서 다룬다. 일반 TF-A 통합을 약속하지만 코드·주소는 i.MX 8M Plus 하나뿐이라 E ≤ 8, BL33 결합은 155·452행 BL33_BASE 규칙과 298행 mkimage 인자 한 줄뿐이라 7. |
| F | 7 | 476행 다음 편 'Ch 8 — Linux 커널 설정'은 seriesOrder 8 chapter08-kernel-config.md와 맞다. 480~485행 관련 항목 6개(bsp ch06·08·09·13, embedded-security ch04·05)를 열어 대조했고 라벨이 맞으며 모두 `draft: false`다. 239행 Ch 9 안내도 맞다. 전제 지식 안내가 없고 29행 TikZ TODO 주석이 남았으며 46~54·332~353행이 text 코드 블록 ASCII 흐름도라 8 이상 불가. |
| G | 2 | 486~488행 TF-A 문서·PSCI(DEN0022)·SMCCC(DEN0028) 링크는 latest이고 특정 주장과 연결되지 않는다. 128·162·362행 upstream 파일 경로, 313행 커널 경로에 TF-A·커널·OP-TEE 버전·태그가 없다. 405행 'v2.10.0'은 예시 로그 안 값이라 출처 버전으로 보지 않았다. |

uncertainties:
- 406행 BL31 로그 빌드 날짜가 글 날짜보다 뒤다. 실제 실행 로그인지 확인 필요.
- 179행 `writel(SRC_BASE_ADDR + 0x0, 0x1)`은 주소가 앞, 253~265행 `writel(0x40000000, TZASC_BASE + 0x100)`은 값이 앞이다. TF-A는 mmio_write_32(addr, value)를 쓰는지 소스로 확인하지 않았다.
- 327행 PSCI_CPU_ON 0x84000003(SMC32) vs bootloader ch25 110·288행·bsp ch09 64행 0xC4000003(SMC64). DEN0022로 확인하지 않았다.
- 313행 `__invoke_psci_fn_smc` 정의 위치를 커널 소스로 확인하지 않았다.
- 131·151행 BL31_BASE 0x970000(SRAM) vs bootloader ch25 51·61·78행 'DDR secure (BL31)'. upstream plat/imx/imx8m/imx8mp platform_def.h로 정할 일. 68~70·96·128행 'plat/nxp/imx/imx8m' 경로도 upstream(plat/imx/imx8m)과 맞는지 미확인.
- 124행 bl31.bin '위치 독립적 raw binary' 설명과 고정 BL31_BASE 링크가 맞는지 미확인.
- 167행 CPU_ON secure entry를 BL31_BASE로 두는 것이 upstream imx8mp_psci와 맞는지 미확인.
- 248행 TZASC_BASE 0x32F80000과 255·260·265행 region 속성값을 RM으로 확인하지 않았다.
- 462행 'status = okay만 두면 secure에서는 안 보인다'가 DT 명세의 secure-status 기본 규칙과 맞는지 미확인.
- 155·452행 `CONFIG_SYS_TEXT_BASE` 이름 변경 여부 미확인.
- 21행 'Qualcomm SDM … 모두 TF-A를 BL31로 채택', 33행 'BL0' 명칭 미확인.
- 269행 'dmesg에서 OP-TEE 영역에 read를 시도하면 SError'는 표현이 모호하고 fault 종류도 미확인.

병합 대상: 점수 구간은 보강(60)이고 판정은 오류 확인으로 우선 조치다. 병합 판단 대상이 아니다. 먼저 BL31 위치(51·467행 vs 131·151·442행)와 적재 주체(306행 vs 51~52행)를 upstream TF-A·imx-mkimage로 정해 고친다.

### `chapter08-kernel-config.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log의 커밋은 7824b986(stub), 400892d7(린터), 160a78a8(시리즈 21편 일괄 작성), ae7a14d4(text 블록 정리), 20c1b507(TikZ), ac24bb76(제목 변경), fa55144d(링크 기계 수정), e85d7684(산문 이동), be973200(topics), 0a9dd7bc(slug 고정)뿐이고, 커널 소스·Kconfig 문서·U-Boot 문서와 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(259행 '.config 형식을 직접 쓰면 충돌·누락'과 154~158행 손으로 쓴 fragment는 긴장일 뿐이다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 판단은 '빌트인이 옳은 것/모듈이 옳은 것/케이스 바이 케이스' 목록(85~108행) 정도다. 흔한 실수 절은 MMC 모듈 + rootwait(255행)만 고유하고 PRINTK_TIME·DEBUG_FS·MAGIC_SYSRQ(256~258행)는 chapter11 333·345행에 같은 내용이 있다. menuconfig 옵션 표(55~69행), Kconfig 키워드 표(179~186행), vendor/mainline 비교 표(222~229행), 산출물 표(237~244행)는 입문서 수준이다. 71행 HZ 권고와 110행 '자동차 ECU에서는 빌트인이 모듈 로드 비용 절약'은 근거 없는 일반론이다. |
| B | 11 | defconfig(19~43행) → menuconfig(45~71행) → y/m 결정(73~110행) → savedefconfig·diffconfig·merge_config(112~158행) → Kconfig(160~188행) → DTB(190~216행) → vendor/mainline(218~231행) → 산출물(233~251행) → 실수·정리(253~270행)로 끝까지 간다. merge_config 뒤 olddefconfig 보정 단계가 없고(149~152행), 'DT 통합'은 dtbs 빌드(194~197행)·Makefile 한 줄(201~204행)·overlay 한 줄(212~214행)로 끝난다. 60·206·213행 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 따라 칠 명령은 있다(23~30, 118~124, 132~143, 147~158, 194~204, 248~251행). 커널·툴체인 버전·대상 보드가 고정돼 있지 않고 28행 bcm2711, 135행 imx_v8, 196행 imx8mm-myboard, 213행 broadcom/overlays로 예마다 보드가 바뀐다. 139~142행 diffconfig는 '출력 예시'이고 255~258행 실패 서술과 110행 부팅 속도 주장에는 재현 절차·로그가 없다. 4~7 구간, 앵커 part7-05(C 8)보다 낮다. |
| D | 9 | 비교한 글: modern-recipes/part7-05-kernel-build.md(71~72·78~84·88·93행 부근 defconfig·menuconfig·savedefconfig·빌드가 이 글 21~30·45~51·112~126행과 겹침), buildroot/chapter12-kernel-customize.md 141~167행(fragment + merge_config + olddefconfig로 이 글 145~158행보다 자세함), bsp/chapter03-device-tree-design.md 311~357행(overlay가 208~216행을 포함), bsp/chapter11-bootlog-debugging.md 333·345행(256~258·266행과 겹침), buildroot/chapter03-kconfig.md 23·243행(겹침 작음), 인접 chapter07·chapter09(겹침 없음). 고유한 것은 73~110행과 255행 정도라 5~9 상단. |
| E | 6 | title의 defconfig·Kconfig·DT 통합과 description의 '모듈 vs 빌트인'을 19~158·160~188·190~216·73~110행에서 다룬다. 'DT 통합'은 dtbs 빌드와 Makefile 한 줄뿐이고 커널 설정과 DT를 맞추는 문제(63행 CONFIG_OF_OVERLAY와 overlay 적용 경로의 관계 등)는 설명하지 않는다. 키워드 하나의 부분 미이행. |
| F | 4 | 274행 다음 편 Ch 9는 seriesOrder 9 chapter09-smp-bringup.md와 맞고, 280행 Ch 10 라벨도 맞다. 그러나 278행 'Ch 7: Device Tree 작성'은 chapter07-tfa-trustzone.md로, 281행 'Buildroot로 첫 이미지 만들기 — 커널과 rootfs 통합'은 buildroot/chapter01-problem.md('Buildroot가 푸는 문제')로, 282행 'CONFIG_PREEMPT·HZ 선택의 성능 영향'은 performance-engineering/00-preface.md로 가는데 그 글에는 PREEMPT·HZ가 없다(grep 0건). 틀린 라벨이라 F ≤ 5, 셋이라 4. 전제 지식 안내가 없다. 116행 TikZ 흐름도는 방향을 잡아 준다. |
| G | 1 | 본문에 1차 출처 링크가 없다(Documentation/kbuild/kconfig-language 등). 커널 버전도 없다. 60행 PREEMPT_RT, 39·43행 defconfig 이름, 213행 overlay 경로처럼 버전에 따라 달라지는 주장에 기준 버전이 없다. |

uncertainties:
- 60행 'CONFIG_PREEMPT_RT — PREEMPT_RT 패치 필요': 최근 mainline 병합 여부를 1차 자료로 확인하지 않았고 글에 기준 커널 버전이 없다.
- 206행 'U-Boot가 bootm <kernel> - <dtb>로 넘김': arm64 raw Image는 booti가 일반적이라는 점과 맞는지 미확인.
- 213행 'make broadcom/overlays/imx219.dtbo'가 mainline 경로인지 Raspberry Pi 포크 경로인지 미확인.
- 32행 Image.gz 조건 미확인.
- 255행 '모듈 MMC + rootwait면 영원히 못 마운트'는 initramfs가 없는 경우를 전제한 것으로 보이나 본문에 전제가 없다.
- 257행 '시리얼로 echo b > /proc/sysrq-trigger'가 셸 명령과 시리얼 break 경로를 섞었는지 미확인.
- 259행 경고와 154~158행 손으로 쓴 fragment의 긴장(모순은 아님).
- 269행 정리의 'dtb-y +='와 203행 'dtb-$(CONFIG_ARCH_MXC) +=' 표기 차이.
- 71행 HZ 권고, 110행 빌트인 부팅 속도 주장은 출처 없는 주장이다.
- 39행 Raspberry Pi 3 bcm2835_defconfig, 43행 STM32MP1 multi_v7_defconfig가 현재 mainline 이름과 맞는지 미확인.

병합 대상: 병합 대상 후보는 `modern-recipes/part7-05-kernel-build.md`(defconfig·menuconfig·savedefconfig·빌드 흐름), `buildroot/chapter12-kernel-customize.md`(merge_config fragment), `bsp/chapter03-device-tree-design.md`(DT overlay), `bsp/chapter11-bootlog-debugging.md`(디버깅 옵션 실수)다. 다음 조치는 보강: 빌트인/모듈 결정 기준(73~110행)과 모듈 MMC + rootwait 실패(255행)는 'BSP 커널 설정에서 y/m을 어떻게 나누는가'라는 독립 검색 의도가 있다. 겹치는 21~51행과 208~216행을 줄여 part7-05·chapter03으로 링크하고, 256~258행은 chapter11과 한쪽으로 모으며, 278·281·282행 라벨을 대상 제목에 맞추고, 커널 버전과 1차 출처를 넣는다. y/m 기준은 한 보드의 부트 로그나 initcall 관찰로 뒷받침한다(측정을 만들어 넣지 않는다).

### `chapter09-smp-bringup.md` — 41점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(0a9dd7bc slug 고정, be973200 topic, e85d7684 산문 이동, fa55144d 링크 일괄 수정 등). 근거는 원문 내부 모순 두 쌍이다. 커널 소스·PSCI 명세·TF-A 소스는 열지 않았다.
- (1) 21행 '깨어난 코어는 `EL3 → EL2 → EL1` 순으로 예외 레벨을 낮추며 … `secondary_entry`에 도달' vs 82행 'BL31 warm boot vector가 … `EL3 → EL1`으로 ERET한 뒤, `entry_point`(Linux의 `secondary_entry`)로 점프' — 같은 경로에서 EL2 경유 여부가 다르다.
- (2) 80행 'Linux side (`arch/arm64/kernel/psci.c`) — `cpu_psci_cpu_boot()`' vs 89행 같은 함수를 '`arch/arm64/kernel/smp.c 발췌 (개념)`'으로 제시 — 한 함수의 정의 위치가 두 곳이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | DT enable-method 예와 표(31~74행), PSCI CPU_ON 3단계(78~82행), spin-table 장단점(127~131행), smp_init 호출 트리(158~170행), hotplug sysfs(189~201행)는 커널 문서와 bootloader ch33에 있는 표준 설명이다. 고유한 '흔한 실패 모드'(203~227행)는 관찰 근거가 없고 219행 '정확히 적어야 합니다', 223행 '확인하고 … 검증합니다', 227행 '의심해야 합니다'처럼 완곡 표현으로 끝난다. |
| B | 9 | 큰 그림 → enable-method → PSCI → spin-table → 부팅 인자 → 커널 흐름 → hotplug → 실패 → 정리(19~238행) 흐름은 있다. 23·84행 '<!-- TODO: TikZ -->' 자리표시로 핵심 흐름도 둘이 비었고, 138~150행 head.S '발췌 (개념)'은 실제 코드가 아니라 152행 설명을 확인할 수 없다. 154행 절 제목 'smp_cpus_init'은 본문에 나오지 않는다(본문은 smp_init). EL 경로 모순과 불확실이 열려 있어 B ≤ 13, 자리표시까지 고려해 9. |
| C | 6 | hotplug 명령(189~198행), 성공 dmesg(174~183행), 실패 로그(207~209·215~217행)는 있지만 보드·커널·TF-A 버전이 없다. 175~182행 타임스탬프(0.123456, 0.234567, 0.345678, 0.456789)는 꾸민 값으로 보이고 182행 '96.00 BogoMIPS'도 환경 없는 수치라 C ≤ 8. 실패 모드(205~227행)는 원인 후보만 나열하고 원인별 관찰을 가르는 절차가 없어 6. |
| D | 5 | 인접 chapter08-kernel-config·chapter10-first-boot와는 역할이 갈리고 chapter07-tfa-trustzone 157행 이후 PSCI 구현은 펌웨어 쪽이라 겹침이 작다. 다른 시리즈 bootloader/chapter33-smp-secondary-cpu-bringup.md와 크게 겹친다: 91~98행 cpu_psci_cpu_boot 코드 = ch33 190~195행, 107~114행 spin-table DT ↔ ch33 100~115행, 174~183행 'Booted secondary processor'·'Brought up 1 node, 4 CPUs' dmesg ↔ ch33 420~430행. enable-method·smp_init·hotplug 설명도 ch33과 대응한다(그 줄은 직접 다 열지 않음). ch33이 더 깊고 이 글 고유 각도는 203~227행 정도다. |
| E | 7 | 제목 'PSCI·Secondary CPU 깨우기'와 description의 PSCI·spin-table·CPU hotplug를 76~101·103~131·185~201행에서 다룬다. 부제의 PSCI가 ARM 범위를 정해 범위 불일치로 보지 않았다. hotplug는 명령 세 줄과 한 문단(189~201행)뿐이라 부분 미이행. |
| F | 4 | 242행 다음 편은 seriesOrder 10 chapter10-first-boot로 맞다. 그러나 246행 '[Ch 7: Device Tree 작성]'은 chapter07-tfa-trustzone으로 가고(Device Tree는 chapter03), 250행 'multi-core scheduling 기본'은 rtos/practical-internals/00-preface, 251행 'SMP scaling'은 performance-engineering/00-preface(시리즈 소개)로 간다. 247·249행은 맞다. 틀린 링크로 F ≤ 5, 23·84행 흐름도 공백과 154행 절 제목 불일치로 4. |
| G | 1 | 본문에 1차 출처 링크가 없다. 80·81·86·89·138행 커널·TF-A 경로에 버전이 없고 89·138행 코드는 '발췌 (개념)'이라 실제 소스와 대응을 확인할 수 없다. PSCI 명세(DEN0022) 판을 인용하지 않았다(78행 'PSCI 1.0+ 기준'뿐). |

uncertainties:
- 21행 vs 82행: secondary CPU가 EL2로 커널에 들어가는지 1차 자료로 어느 쪽이 맞는지 미확인.
- 80행 vs 89행: cpu_psci_cpu_boot의 실제 위치 미확인. bootloader ch33 189행은 drivers/firmware/psci/psci.c로 적어 세 번째 위치가 나온다(다른 글이라 오류 확인 근거로 쓰지 않음).
- 15·17·231행 '리셋 직후 깨어 있지만 WFE로 정지' vs 81행 'CPU_ON이 power domain을 켜고 reset을 풀며'. SoC마다 다를 수 있어 오류 확인에 넣지 않음.
- 81행 `services/std_svc/psci/`·`psci_cpu_on_start()`: 현행 TF-A는 lib/psci/ 아래라는 기억, 미확인.
- 59~65행 compatible 'arm,psci-1.0'에 함수 ID 속성(0.1 방식)을 함께 적은 것이 binding상 의미 있는지 미확인. 234행이 이를 '핵심 binding'이라 부른다.
- 72행 `local-timer`가 32-bit ARM enable-method 문자열인지 미확인.
- 113행 `cpu-release-addr = <0x0 0x80000fff8>`의 두 번째 셀이 32비트를 넘는다. dtc가 거부하는지 미확인.
- 138~150행 stext_secondary·secondary_data로 sp 설정은 실제 head.S와 다르다는 기억, 미확인.
- 162행 smp_prepare_cpus를 start_kernel 직속으로 그린 것 미확인.
- 211행 -22(EINVAL)와 'timeout으로 실패'를 같은 원인으로 묶은 것 미확인.
- 223행 'WBAR' 레지스터 이름, 227행 arm64 BogoMIPS가 CPU PLL을 반영하는지 미확인.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `bootloader/chapter33-smp-secondary-cpu-bringup.md`(같은 cpu_psci_cpu_boot 코드·spin-table DT·dmesg를 더 깊게 다룸)다. 먼저 21·82행 EL 경로와 80·89행 파일 위치를 커널 소스(arch/arm64/kernel/head.S, smp.c, drivers/firmware/psci/)와 TF-A lib/psci로 대조해 고친 뒤, BSP 실패 모드(203~227행)만 남기고 공통 설명은 ch33 링크로 대신하는 차별화 보강을 할지 병합할지 정한다.

### `chapter10-first-boot.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(7824b986 stub, 400892d7 linter 일괄, 160a78a8 21장 일괄 작성, ae7a14d4 코드블록 정리, ac24bb76 제목 변경, fa55144d 링크 일괄 수정, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없다. 근거는 원문 내부 모순이다.
- 274행: 'SPL의 첫 출력은 DRAM 초기화 직후입니다. 이 라인이 없으면 콘솔/전원/모드 문제입니다'
- 68~69행: SPL 책임 '1. UART 콘솔 활성화, 첫 디버그 출력이 가능한 시점 → 2. DRAM 초기화', 76~77행 예시 출력(배너 `U-Boot SPL 2023.04`가 `DDR4 dram init done`보다 먼저 찍힘), 227행(`U-Boot SPL`만 나오고 hang이면 첫 의심이 DRAM init)

첫 출력이 DRAM 초기화 뒤라면 배너가 찍힌 뒤 DRAM init에서 멈추는 227행 진단은 성립하지 않으므로 동시에 참일 수 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 멈춘 위치별 첫·둘째·셋째 의심 표(224~234행)와 단계마다 시리얼에 남는 기대 문자열을 늘어놓은 구성(73~81, 89~92, 104~121, 143~151, 186~192, 200~209행)이다. BootROM 역할(40~44행), SPL이 SRAM 크기 때문에 나뉜다는 설명(64행), bootargs·earlycon 설명(135·153행)은 입문 자료에 흔하다. 160~169·176~191행 타임스탬프는 꾸민 값이고 36행 '±50% 변동이 흔합니다'는 근거 없는 일반론이다. part1-04(A 10)보다 조금 위. |
| B | 12 | 전원 투입(23행)부터 login prompt(214~218행)까지 8단계, 결정 트리(224~234행), systemd-analyze(240~258행), 흔한 실수(264~268행), 정리(272~278행)로 끝까지 간다. 정리 274행이 68~69·76~77·227행과 모순되고 139행 압축 해제 주체, 147·153행 earlycon 이름, 231행 arm64 ATAGS 불확실이 열려 있어 B ≤ 13. 29행 표와 137행 제목은 'Kernel decompress'를 단계로 두는데 139행은 이 글의 bootcmd가 싣는 `Image`(127행)에는 이 단계가 없다고 해 조건을 밝히지 않는다. |
| C | 7 | U-Boot 명령(126~132행), systemd-analyze 세 명령(241~257행), initcall_debug 인자(260행)는 따라 할 수 있다. 21~34행 단계별 시각, 36행 '±50%', 64행 'SPL ≤ 256 KB, SRAM 64~256 KB'는 출처 없는 수치라 C ≤ 8. 로그가 U-Boot 2023.04(76행), BL31 imx_5.15.71(90행), Linux 6.6.0(145행), systemd 252(201행)를 섞었고 보드 리비전·defconfig가 없다. 242행 kernel 1.234s는 191행 `Run /sbin/init` 1.90s와 맞지 않는다. 결정 트리 각 칸에 확인 방법이 없다. |
| D | 7 | 같은 시리즈 chapter11-bootlog-debugging.md 패턴 2a(60~75행, 같은 `U-Boot SPL 2023.04 (Sep 12 2025 - 14:23:01 +0000)` 로그) ↔ 이 글 76~78·227행, 패턴 2b(77~86행) ↔ 107·229행, 체크리스트·흔한 실수(316~334행) ↔ 266~267행. chapter15-boot-time-optimization.md 27~35행 단계별 시간 표·72~82행 systemd-analyze(같은 'Startup finished in 1.234s (kernel)') ↔ 21~34·241~250행. chapter06-u-boot-porting.md 429~458행 U-Boot 첫 출력 ↔ 104~121행. chapter09와는 겹침 없음. 다른 시리즈 modern-recipes/part7-01-linux-boot-flow.md(같은 i.MX8M Mini) 30~38행 인계 표·82~102행 '마지막 줄로 멈춘 단계 짚기' 표가 같은 질문에 출처를 달아 답하고, bootloader/chapter04-boot-stages.md 312~342행이 73~121행과 같은 단계별 로그 주석이다. |
| E | 7 | 제목 '0%부터 login prompt까지의 단계 분석'과 description '단계별 체크포인트 … 어디서 멈추는지'를 본문 8단계(38~218행)와 결정 트리(224~234행)가 이행한다. 일반 보드를 가리키는 제목인데 17행에서 i.MX8M Mini 한 SoC로 좁혀 E ≤ 8. '분석'에 비해 근거·측정이 약하고 '0%'가 무엇의 0%인지 설명이 없어 7. |
| F | 5 | 282행 다음 편 'Ch 11: 부트로그 디버깅'은 seriesOrder 11 chapter11-bootlog-debugging.md와 맞고 286~288행 Ch 9·11·12 라벨도 맞다. 289행 '[Buildroot로 첫 이미지 만들기] — initramfs와 rootfs 만들기'의 대상 buildroot/chapter01-problem.md 제목은 'Buildroot가 푸는 문제 — Yocto와의 핵심 차이 분석'이고, 290행 'Modern Embedded Recipes — 양산 부팅 최적화'는 시리즈 소개 00-preface.md로 간다. 틀린 링크로 F ≤ 5. 전제 지식 안내는 없다. |
| G | 1 | 본문에 출처 링크가 없다. 40행 'SoC TRM에 적혀 있으며'는 문서명·판이 없다. 버전은 예시 로그 안에만 있고(76·90·145·201행) 서로 다른 BSP 릴리스를 섞어 환경 표기로 볼 수 없다. part1-04(G 1)와 같은 수준. |

uncertainties:
- 139행 'Image.gz는 self-decompressing 헤더가 압축을 풉니다': arm64 커널은 자체 압축 해제기가 없고 U-Boot booti가 푼다는 기억, 1차 자료로 확인하지 않았다.
- 147·148·153·168행 earlycon 이름 `ec_imx6q0`: 커널 imx earlycon 이름은 `ec_imx6q`로 기억한다. 로컬 clone이 없어 확인하지 못했다.
- 132·172행 `console=ttymxc0`과 115~117행 serial@30890000 vs part7-01 82행 0x30890000 = `ttymxc1`(UART2). 다른 글과의 모순이라 imx8mm.dtsi aliases로 정할 일.
- 167~168·172행: 로그는 `console [tty0] enabled` 뒤 bootconsole disabled인데 산문은 이후 출력이 UART로 간다고 한다. 132행 bootargs에는 tty0이 없다. 미확인.
- 77~80행 SPL 로그 문자열이 U-Boot 2023.04 SPL 소스에 있는지 미확인. i.MX8M Mini EVK는 LPDDR4라 'DDR4'도 의심.
- 231행 '잘못된 ATAGS/DTB': arm64는 ATAGS를 쓰지 않는다는 기억, 미확인.
- 64행 SPL·SRAM 크기, 21~34행 단계별 시각, 36행 '±50%'는 출처 없는 수치다.
- 264행 'Rockchip은 ttyS, BCM은 ttyAMA 또는 ttyS' 미확인.
- 242행 kernel 1.234s vs 191행 1.90s, 21~34행 표(login ~5.0s) vs 242행 합계 4.690s는 예시 출력끼리의 불일치라 오류 확인 근거로 쓰지 않았다.
- 15행 '7~10개의 짧은 단계'와 본문 8단계·표 12행은 개수 표기 차이라 오류 확인에 넣지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `modern-recipes/part7-01-linux-boot-flow.md`(같은 i.MX8M Mini, 82~102행 진단 표가 출처와 함께 같은 질문에 답함)와 `bsp/chapter11-bootlog-debugging.md`(같은 SPL 로그)다. 먼저 274행 모순을 고친다. 그다음은 보강: login까지의 범위는 part7-01과 달라 독립 검색 의도가 있으므로 결정 트리 각 칸에 확인 방법과 출처를 붙이고 꾸민 로그를 한 환경의 출처 있는 문자열로 바꾼다.

### `chapter11-bootlog-debugging.md` — 56점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topics, fa55144d 링크 일괄 수정, ac24bb76 제목 변경 등)에 커널 Documentation·i.MX8MM RM·U-Boot 소스와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고(로컬 커널 clone 없음), 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(129행 'after 11000 usecs'와 128~129행 타임스탬프 차 약 11.1 ms는 모순으로 보기 어렵다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 15행 '부팅 실패는 4가지 모드로 수렴', 58행 '멈춘 마지막 라인이 진단의 핵심 단서'로 실패를 garbage·hang·panic·late hang으로 나누고, hang을 SPL 후(60~75행)·U-Boot proper 직후(77~86행)·kernel decompress 후(88~109행)·driver probe(111~132행)로 가른 구조가 이 글의 관점이다. initcall_debug로 범인 함수를 찾는 예(120~132행)도 쓸모 있다. 원인 목록은 일반론이고 41행 '4배 차이'는 무엇이 4배인지 없다. 52·75행처럼 확인 지시로 끝나는 문장이 있고 실제 보드 실패 사례가 없어 13~19 하단. |
| B | 12 | 모드 4개(19~213행) → 진단 도구(215~314행) → 체크리스트(316~326행) → 흔한 실수(328~334행) → 정리(336~345행)로 완결된다. 345행 정리가 CONFIG_MAGIC_SYSRQ를 꼽지만 본문에 SysRq 설명이 없고, 342행 'systemd unit 실패'는 207~211행 원인 목록과 다르다. 155~157행은 panic으로 부팅 못 한 보드에서 /proc/config.gz를 읽으라고 해 전제가 빠졌고 159~162행은 dmesg 출력을 bash 블록에 섞었다. 104·48~49·210행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | picocom(29~34행), U-Boot md.l(46~50행), bootargs 인자(103~105·120~123·213·280·301행), addr2line·gdb(188~194행), OpenOCD+gdb(286~295행) 등 명령은 많다. 예시 로그(114·128~131·137~144·160~162행) 타임스탬프가 1.234567, 1.345678…처럼 만든 값이고 대상 보드·커널 설정이 없다. 54행 '24 MHz 크리스털이 실제로 23.6 MHz'와 41행 '4배 차이'는 출처 없는 수치라 C ≤ 8. |
| D | 10 | 같은 시리즈 bsp/chapter10-first-boot.md 220~234행 결정 트리가 이 글 19~213행 분류의 요약판이고, earlycon(ch10 153행 vs 101~107·259행), initcall_debug(ch10 260행 vs 120~123행), rootwait(ch10 265행 vs 168행), quiet(ch10 266행 vs 334행)가 겹친다. bsp/chapter12-driver-add.md는 겹침 없음. 다른 시리즈 bootloader/chapter22-debugging.md 228~244행 매트릭스의 깨진 글자(235행)·proper 점프 직후 hang(237행)·earlycon 누락(240행)이 이 글 27·77~86·101행과 같고, `openocd -f interface/jlink.cfg -f target/imx8mm.cfg`가 ch22 143행과 이 글 288행에서 같다. panic 패턴(134~196행)·late hang(198~213행)·debugfs/kgdb(230~304행)로 역할은 구별된다. 10~14 하단. |
| E | 6 | description(5행)의 garbage·hang·panic·late hang 진단은 19~213행이 이행한다. 제목 키워드 중 earlyprintk는 250~267행, serial 추적은 19~54·306~314행에서 다룬다. loglevel은 122행 'ignore_loglevel'과 334행 quiet 언급뿐이고 loglevel= 값·printk 레벨·dmesg -n 설명이 없다. 키워드 하나를 거의 다루지 않아 6~8에서 감점. |
| F | 5 | 349행 다음 편 'Ch 12: 드라이버 추가'는 seriesOrder 12 chapter12-driver-add.md와 맞고 17행이 Ch 10 전제를 밝힌다. 353~355행 Ch 10·12·13 링크는 맞다. 356행 '— ftrace 활용'은 performance-engineering/00-preface.md로, 357행 '— 양산 디버깅'은 modern-recipes/00-preface.md로 가 라벨이 대상 내용과 다르다. F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 없다(kernel-parameters, earlycon 문서, i.MX8MM RM, U-Boot 소스 모두 없음). 버전은 예시 로그 안 U-Boot 2023.04(63행)와 커널 6.6.0(138행)뿐이다. 107행 'UART base address는 SoC TRM에 적힌 값'은 판·절이 없다. |

uncertainties:
- 104행 'earlycon=ec_imx6q0,0x30890000,115200n8': OF_EARLYCON_DECLARE 이름은 'ec_imx6q'이고 'ec_imx6q0'은 콘솔 이름(이름+인덱스)이라는 기억이다. setup_earlycon 이름 비교상 매치되지 않을 수 있다. 커널 소스를 열지 않았다(ch10 153행도 같은 인자).
- 48~49행 'md.l 0x30330014/0x30330018 … IOMUXC_SW_PAD_CTL_PAD_<UART_RX/TX>': 낮은 오프셋은 MUX_CTL 영역일 수 있다. RM 미확인.
- 210행 '다음 boot 시 dmesg에 Out of memory': 링 버퍼는 재부팅 후 남지 않아 journalctl -b -1이나 pstore가 필요할 것으로 보인다. 미확인.
- 331행 '1.8 V UART에 3.3 V USB-Serial을 연결하면 입력은 보이지만 키 입력이 안 됩니다'의 방향·결과 미확인.
- 64행 'DDR4 dram init done' vs 86행 'lpddr4_timing.c(또는 ddr3l_timing.c)'는 예시 불일치로 보고 오류 확인에 넣지 않았다.
- 86행 온보드 LPDDR4에 'SPD' 용어가 맞는지 미확인.
- 280행 'ftrace=function trace_event=irq:* trace_buf_size=4M' 형식을 kernel-parameters와 대조하지 않았다.
- 41행 '4배 차이'는 무엇이 4배인지 불명확하고 출처가 없다.
- 155~157행 /proc/config.gz 절차의 전제가 글에 없다.

병합 대상: 병합 대상 없음. `bsp/chapter10-first-boot.md` 220~234행 결정 트리와 `bootloader/chapter22-debugging.md` 228~244행 매트릭스가 같은 진단을 요약하지만, 이 글은 '부트로그 마지막 줄로 실패 모드를 가르는' 독립 검색 의도가 있고 panic·late hang·kgdb·debugfs까지 다뤄 어느 쪽에 합쳐도 범위가 맞지 않는다. 다음 조치는 보강: 제목의 loglevel을 실제로 다루거나 제목에서 빼고, 356~357행 링크를 실제 ftrace·양산 디버깅 글로 바꾸고, ch10과 겹치는 earlycon·rootwait·initcall_debug 설명은 ch10 링크로 줄이고, 104행 earlycon 인자·48~49행 주소를 커널 문서와 i.MX8MM RM으로 확인해 출처를 둔다.

### `chapter12-driver-add.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1)이다.
- 44행: EEPROM의 '7-bit 주소(WP 핀 strap에 따라 결정)'
- 49행 schematic 정리: 'Address: 0x50 (A2=A1=A0=0)' — 주소는 A2~A0 핀으로 정해진다. 51행: 'WP: tied low (write enabled)' — WP는 쓰기 허용 핀이다.

같은 장치의 주소를 정하는 핀에 대한 두 구체 진술이 동시에 참일 수 없다. git log(160a78a8 시리즈 작성, ae7a14d4, ac24bb76 제목 변경, fa55144d 링크 일괄 수정, be973200 topic, 0a9dd7bc slug 고정, ab94fb2f 연락처)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 15·17행 'BSP 드라이버 작업은 대부분 DT 노드 추가'라는 관점과, 사례 1~6(40~288행)마다 DT 노드와 부팅 뒤 확인 명령(72~77·110~122·169~172·215~221·262~268행)을 짝지은 구성이 이 글의 틀이다. 노드 자체는 binding 문서 예제 수준의 표준 칩(24c256, ads1015, pca9450, jedec,spi-nor, usdhc)이고 새 드라이버 작성 기준은 292~296행 세 줄뿐이다. 15행 '80%', 17행 '수천 개'는 출처 없는 단정이다. 6~12 상단. |
| B | 12 | 기존 드라이버 찾기(19~38행) → 사례 6개(40~288행) → 새 드라이버 조건·절차(290~306행) → 골격(310~373행) → binding YAML·검증(377~430행) → 로드 순서·deferred probe(432~451행) → 흔한 실수(453~459행) → 정리(461~470행)까지 완성됐다. 343행 clk_prepare_enable 반환값을 보지 않는데 설명이 없다. 348행 remove 시그니처, 196·211행 always-on, 73행 버스 번호 불확실이 열려 있어 B ≤ 13. 이 불확실들은 1차 자료 위치가 없어 감점 근거로 쓰지 않았다(AP-C-31). |
| C | 7 | 확인 명령과 예상 출력이 있다(72~77·110~122·169~172·215~221·262~268·428~429·448~451행). 커널 버전·보드가 없고(134행 MX8MM 매크로로 i.MX8MM을 짐작할 뿐) 118행 raw 12345·121행 scale 0.062500은 측정 환경 없는 수치라 C ≤ 8. 합격과 실패 관찰을 가르는 절차가 없다. |
| D | 8 | 같은 시리즈 chapter11-bootlog-debugging.md(겹침 없음), chapter13-power-management.md, chapter03-device-tree-design.md, chapter04-pinmux-clock.md, chapter08-kernel-config.md; 다른 시리즈 modern-recipes/part7-03-device-tree-basics.md, modern-recipes/part7-08-platform-driver.md. 178~200행 PCA9450 노드 ↔ ch13 320~355행, 215~221행 regulator_summary 'eeprom@50 3300mV' ↔ ch13 365~371행, 130~165행 fsl,pins ↔ ch04 72~105행, 31~38·377~430행 binding·dt_binding_check ↔ ch03 176~203행, 56~67행 eeprom@50 노드와 227~258행 SPI flash 노드 ↔ part7-03 149~173행(같은 구조), 310~375·445~451행 platform driver 골격·EPROBE_DEFER ↔ part7-08 23~297행(v6.12 소스 대조판). 5~9 구간. |
| E | 7 | 제목과 description의 세 약속(기존 드라이버 활용, DT binding 추가, 새 드라이버 작성 결정 기준)이 19~38·40~288·377~430·290~306행에 대응한다. title 범위는 일반 BSP인데 SoC 의존 예제는 i.MX8MM 하나(134·170·181·276행)라 E ≤ 8. '결정 기준'은 294~296행 세 줄뿐이라 7. |
| F | 4 | 474행 다음 편은 chapter13-power-management.md(seriesOrder 13)와 맞다. 469·479행 ch08, 480·481행 ch13·ch14도 맞다. 478행 'Ch 7: Device Tree 작성'은 chapter07-tfa-trustzone.md로 가 라벨이 틀렸고(Device Tree는 chapter03), 482·483행은 각 시리즈 00-preface로 가는데 라벨('driver 패턴', 'interrupt 처리 비교')이 약속한 주제 글이 아니다. 틀린 링크 셋이라 4. 전제 지식 안내는 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 23~33행 셸 예시 출력에 커널 트리 경로(at24.c, ti,ads1015.yaml)가 나오지만 커널 버전이 없다. 대상 SoC·보드·커널 버전 표기도 없다. 391행 maintainers 줄은 예시 YAML이라 출처가 아니다. |

uncertainties:
- 348행 mychip_remove가 int를 반환한다. part7-08 27행은 v6.12에서 .remove가 void라고 적었다. 이 글에 커널 버전이 없어 미확인(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 196행 LDO3 regulator-always-on과 211행 'remove 시 disable'·'runtime PM과 결합되면 전력 절감 효과가 큽니다'의 관계. ch13 352행은 always-on을 '절대 OFF 안 함'으로 설명한다. regulator core로 미확인.
- 73행 출력 '0-0050  1-0048'은 같은 &i2c1(57·86행)인데 다른 버스 번호로 보인다. 글이 1-0048을 ADC라고 밝히지 않아 내부 모순으로 단정하지 않았다.
- 118·121행 raw 12345와 scale 0.062500이 ADS1015·PGA ±2.048V 설정에서 나오는 값인지 미확인.
- 220행 regulator_summary consumer 이름 형식, 450행 devices_deferred 줄 형식 미확인.
- 438~443행 module_init·late_initcall·subsys_initcall을 함께 쓰는 예가 모듈 빌드에서 성립하는지 미확인.
- 445행 EPROBE_DEFER = -517, 24행 at24.c 테이블 줄 형식, 96행 ti,datarate 4 = 1600 SPS, 170행 30330000.pinctrl 주소 미확인.
- 15행 '80%', 17행 '수천 개', 457행 'suspend 후 동작 불가'는 출처 없는 단정.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 regulator 사례(174~221행) → `bsp/chapter13-power-management.md` 316~372행, platform driver 골격(310~375행) → `modern-recipes/part7-08-platform-driver.md`, I2C·SPI 노드(56~67·227~258행) → `modern-recipes/part7-03-device-tree-basics.md`다. 'BSP에서 보드 peripheral을 기존 드라이버로 통합'이라는 독립 검색 의도가 있어 다음 조치는 보강: 44행 주소 결정 핀 오류 수정, 커널 버전·대상 보드 명시, ch13과 같은 PCA9450 예제 대신 이 글 고유의 통합 실패 사례로 차별화, 478·482·483행 라벨 수정.

### `chapter13-power-management.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, e85d7684 코드 블록 산문 이동, fa55144d 내부 링크 일괄 수정, ac24bb76 제목 개명)에 커널 Documentation/power, DT binding(arm,idle-state·operating-points-v2), PCA9450·i.MX8M Mini 데이터시트와 대조한 커밋이 없다. 내부 모순으로 확정할 두 문장도 찾지 못했다(223~225행 entry+exit 1000+1000과 210행 latency 2000, 225행 min-residency 5000과 212행 residency 5000은 서로 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 21~26행 4개 축 표, 37~42행 suspend state 표, 185~190행 C-state 표, 263~270행 governor 표는 커널 PM 문서 개요 수준이다. 이 글만의 부분은 220~226행 DT idle-states 값과 209~212행 sysfs latency·residency를 맞물려 보인 점, 396~400행 i.MX8M Mini 기대 전류 표, 406~411행 흔한 실수 목록 정도다. 15행 '기본값으로 두면 절전이 되지 않거나 … 동작 안 합니다', 376행 '측정해야 합니다'는 구체 기준 없이 끝난다. part1-04(A 10)와 같은 수준. |
| B | 12 | system sleep(30~128행) → runtime PM(130~179행) → cpuidle(181~241행) → cpufreq·OPP(243~314행) → regulator(316~372행) → 측정(374~402행) → 실수·정리(404~422행)로 완결된다. 161~165행 runtime PM ops는 콜백 본문이 없고 387행 pm_genpd는 명령 한 줄뿐이며 power domain 설명이 없다. 409·410행은 근거 없이 단정한다. 255행 vs 288~305행 OPP, 310행 cpu-supply 대상 불확실이 열려 있어 B ≤ 13. |
| C | 7 | sysfs·debugfs 명령과 예시 출력(32~35, 62~71, 170~177, 194~213, 247~259, 364~372, 378~392행)과 DT 조각이 있다. 396~400행 기대 전류(250 mA, 5~10 mA, <1 mA)와 39~41행 복귀 시간(<100 ms, 500 ms~2 s, 5~30 s)은 출처·측정 환경 없는 수치라 C ≤ 8. 측정 절차가 394행 한 문장뿐이고 실제 측정 결과가 없어 7. |
| D | 10 | 같은 시리즈 chapter12-driver-add.md 174~220행이 이 글 320~372행과 같은 PMIC(nxp,pca9450, pmic@25, &i2c2), 같은 BUCK1 600000~2187500 µV, LDO3 3300000 µV, 같은 regulator_summary 형식과 eeprom@50 소비자(ch12 216~220행 vs 이 글 365~371행)를 반복한다. regulator-name만 다르다(ch12 'BUCK1'·'LDO3' vs 328·345행 'VDD_SOC'·'VDD_3V3'). chapter14-thermal-watchdog.md는 겹치지 않는다. 다른 시리즈 performance-engineering/part3-09-power-vs-performance.md 54~80행(governor)·123~139행(C-state)이 263~270·185~199행과 겹치지만 race-to-idle 관점이다. modern-recipes/part7-08-platform-driver.md 299행이 runtime PM을 이 글로 위임한다. 10~14 하단. |
| E | 7 | 제목(2행)의 Suspend/Resume·Runtime PM·Regulator와 description(5행)의 suspend-to-RAM·runtime PM·regulator framework·CPU idle/freq를 30·130·181·243·316행 절이 모두 다룬다. 과장은 없다. 대상 보드(i.MX8M Mini)가 396행에서야 드러나고 판단 기준이 흐려 9 이상은 아니다. |
| F | 5 | 426행 다음 편 Ch 14는 seriesOrder 14 chapter14-thermal-watchdog.md와 맞고 430행 Ch 9·431행 Ch 12 라벨도 맞다. 433행 'DVFS와 성능 트레이드오프'는 part3-09가 아니라 performance-engineering/00-preface.md로, 434행 '양산 절전 측정'은 modern-recipes/00-preface.md로 간다. 틀린 링크로 F ≤ 5. 전제 지식 안내는 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 커널 버전 표기가 없고 대상 SoC(396행)와 PMIC(323행) 이름만 나온다. Documentation/power/runtime_pm, arm,idle-state·operating-points-v2 binding, PCA9450 데이터시트 인용이 없다. |

uncertainties:
- 255행 scaling_available_frequencies의 1608000이 288~305행 cpu0 OPP 표(1200/1416/1800 MHz)에 없다. 두 예가 같은 보드라고 글이 밝히지 않아 오류 확인으로 올리지 않았다. turbo-mode(304행) OPP 노출 여부도 미확인.
- 310행 cpu-supply가 buck1_reg(328행 VDD_SOC)를 가리키는데 336행 VDD_ARM은 buck2다. 368~369행 summary는 VDD_SOC 아래 cpu0로 일관되나 실제 보드 DT로 확인하지 않았다. 365~371행 summary에 always-on VDD_ARM이 빠진 것도 미확인.
- 396~400행 기대 전류와 39~41행 복귀 시간은 출처 없는 수치다.
- 409행 'OPP가 없으면 한 단계 freq만 사용', 410행 suspend callback 컨텍스트 설명은 커널 문서로 확인하지 않았다.
- 42행 off는 34행 /sys/power/state 출력에 없는 값이다.
- 15행 '부팅 후 disable이 안 풀려 디바이스가 동작 안 합니다'의 메커니즘이 본문에 없다.

병합 대상: 병합 대상 없음. part3-09와 governor·C-state 표가 겹치지만 이 글은 BSP의 DT·드라이버 PM 통합 관점이라 독립 검색 의도가 있고 part7-08 299행이 runtime PM을 이 글로 위임한다. 다음 조치는 보강: 320~372행 regulator DT·summary를 ch12 174~220행 참조로 줄이고, 396~400·39~41행 수치의 출처를 확인하거나 TBD로 두고, 255행 주파수 목록과 288~305행 OPP를 맞추고, 310행 cpu-supply 대상을 확인하고, 커널 버전·1차 출처를 넣고, 433~434행 링크를 실제 DVFS·절전 측정 글로 바꾼다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 시리즈 21편이 160a78a8 한 번에 작성된 뒤 slug·topic·제목(ac24bb76)·TikZ·산문 이동·링크 일괄(fa55144d) 커밋뿐이고, ch05는 출처 없는 e4f6db70 'Qualify BSP storage and DDR guidance'만 거쳤다. `factcheck: 검증됨`은 0편이고 6편(ch05·06·07·09·10·12)은 원문 내부 모순으로 오류 확인이다. BSP Development는 `/fact-check-round` 대상이다.
- **본문 1차 출처·기준 버전 없음 (10편 전부, G 1~3).** 커널·U-Boot·TF-A 버전과 RM 판 번호가 본문에 없다(ch04 61·115·192·236행 경로만, ch06 158·304~310행, ch07 128·162·362행, ch09 80·89·138행). 버전은 예시 로그 안에만 있고(ch06 320·432행, ch10 76·90·145·201행, ch11 63·138행) ch10은 서로 다른 BSP 릴리스를 섞었다. 외부 링크는 관련 항목 끝 목록형이다(ch04 388~389행, ch05 379~381행, ch06 522~524행, ch07 486~488행).
- **출처·측정 환경 없는 구체 수치 (10편 전부, C ≤ 8 상한 반복).** ch04 242·245·362행, ch05 223~224·327·343행, ch06 31·419·425행, ch07 124·248·355행, ch08 71·110행, ch09 182행, ch10 21~36·64행, ch11 41·54행, ch12 15·17·118·121행, ch13 39~41·396~400행.
- **꾸민 실행 로그 (5편).** 글 날짜(2026-05-18)보다 뒤의 빌드 날짜 'May 19 2026'(ch06 432·440행, ch07 406행), 0.123456·1.234567 같은 만든 타임스탬프(ch09 175~182행, ch10 160~191행, ch11 114·128~131·137~144행). 같은 SPL 로그 `U-Boot SPL 2023.04 (Sep 12 2025 - 14:23:01 +0000)`가 ch10 76행과 ch11 61~66행에, 'Startup finished in 1.234s (kernel)'이 ch10 242행과 ch15 73행에 재사용됐다(경험 진위, C ≤ 12 조항).
- **관련 항목 라벨이 대상과 다름 (6편).** 'Ch 7: Device Tree 작성' → chapter07-tfa-trustzone(ch08 278행, ch09 246행, ch12 478행). 주제 라벨을 단 다른 시리즈 링크가 00-preface 시리즈 소개로 감(ch08 282행, ch09 250·251행, ch10 290행, ch11 356·357행, ch12 482·483행, ch13 433·434행). Buildroot 라벨이 chapter01-problem으로 감(ch08 281행, ch10 289행). fa55144d의 SERIES 일괄 치환(시리즈 링크 → 첫 글)이 라벨을 그대로 둔 흔적으로 보이고, bsp 21편 중 11편이 00-preface 링크를 포함한다(grep 확인). F가 6편 모두 4~5점인 원인이다.
- **TikZ TODO·ASCII 흐름도 잔재 (4편).** 공개 글의 '<!-- TODO: TikZ -->' 주석(ch06 23행, ch07 29행, ch09 23·84행; 루프 밖 ch01 66행, ch14 219행), text 코드 블록 ASCII 그림(ch04 141~165행, ch06 23~26행, ch07 46~54·332~353행). ch04는 20c1b507 ASCII→TikZ 일괄 커밋이 건드렸는데도 남아 있어 `detect-ascii-diagrams.sh`로 시리즈 전체를 다시 볼 필요가 있다.
- **제목 범위가 본문보다 넓음 (5편, E ≤ 8).** 제목은 SoC 일반인데 예제는 i.MX 하나(ch04 23·42·112행, ch07 104~155행, ch10 17행, ch12 134·170·181행), 제목 키워드 일부 미이행(ch05 'Training 추출' 201행, ch06 board.c·DTS 113·123~124행, ch08 'DT 통합' 194~214행, ch11 loglevel 122·334행). ac24bb76 일괄 개명 제목 'X — a·b·c 흐름'이 공통 원인으로 보인다.
- **같은 시리즈 글 사이 예시 반복 (5편 관련).** i.MX 8M Plus 콘솔 UART(ch02 111~122·144~161행 = ch04 23~34·59~61·82~88행, ch06 229~240·287~295행 ≈ ch04 119~128·299~323행), PCA9450 regulator DT·summary(ch12 178~221행 = ch13 320~371행), 부트 로그·earlycon·rootwait·initcall_debug(ch10 153·260·265행 ↔ ch11 101~107·120~123·168행), 디버깅 옵션 실수(ch08 256~258행 ↔ ch11 333·345행).
- **Bootloader Internals·Modern Recipes와 절 단위 중복, 역방향 링크 없음 (6편).** ch05 ↔ bootloader ch09·ch26·part4-14, ch06 ↔ bootloader ch21·ch13·part7-02, ch07 ↔ bootloader ch25·31·32, ch09 ↔ bootloader ch33, ch10 ↔ part7-01·bootloader ch04, ch11 ↔ bootloader ch22. bootloader ch09 326·432행, part4-14 252행은 ch05로 링크하지만 ch05는 되돌아가지 않고, bootloader ch21 398행 'BSP Development Ch 6' 라벨은 chapter01-what-is-bsp로 간다. 시리즈 간 역할 분담을 한 번에 정해야 한다.
- **글 사이 사실 충돌 (7편 관련).** IOMUXC base(ch02 0x3034_0000 vs ch12·bootloader ch07 0x30330000), UART clock(ch04 148·255행 100MHz vs ch02·ch06 DEBUG_UART_CLOCK 24MHz), SD 부트 오프셋(ch06 280·477행 1KB vs ch17 117·129·341행 32KB vs bootloader ch21 317행 33KB), BL31 위치(ch07 131행 SRAM vs bootloader ch25 51·78행 DDR), CPU_ON ID(ch07 327행 0x84000003 vs ch09 64행·bootloader ch25 110행 0xC4000003), DDR 출력 파일명(ch05 128~130행 vs ch06 70·97행·bootloader ch26 132·160행), earlycon 이름 `ec_imx6q0`(ch10 153행, ch11 104행), UART tty 번호(ch10 132행 ttymxc0 vs part7-01 82행 ttymxc1), remove 시그니처(ch12 348행 vs part7-08 27행). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 RM·upstream으로 한 번에 정한다.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 본문 → 자주 하는(흔한) 실수 → 정리 → 다음 편(예고) → 관련 항목'이 같은 순서로 있다(예: ch04 13·342·368·378·382행, ch05 13·311·358·369·373행, ch08 13·253·261·272·276행, ch12 13·453·461·472·476행). 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 6편은 오류 건수 순으로 본다. ch07(3건: BL31 위치·151행 이유·적재 주체), ch09(2건: EL 경로·cpu_psci_cpu_boot 위치), ch05(RFSHTMG 값), ch06(DEBUG_UART 네 줄과 baud), ch10(274행 SPL 첫 출력 시점), ch12(44행 EEPROM 주소 핀). 각 글의 1차 자료(TF-A·커널·U-Boot 태그 고정 소스, PSCI DEN0022, i.MX 8M RM, NXP DDR Tool 문서, AT24 데이터시트)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 틀린 관련 항목 라벨(ch08 278·281·282행, ch09 246·250·251행, ch10 289·290행, ch11 356·357행, ch12 478·482·483행, ch13 433·434행)을 실제 대상에 맞추거나 실제 주제 글로 바꾼다. F 감점 원인이라 다시 채점할 때 바로 반영된다. fa55144d가 남긴 00-preface 링크는 bsp 나머지 11편에도 있는지 같이 본다.
- '글 사이 사실 충돌' 아홉 건은 BSP Development `/fact-check-round`에서 Bootloader Internals와 함께 한 번에 정한다. 기준 커널·U-Boot·TF-A 버전과 `data/upstream-tracking.yaml` 등록 여부는 사용자가 결정한다.
- 병합 검토 4편(ch04·08·11·13)은 모두 병합 대신 보강(차별화)으로 적었다. 겹치는 절을 ch02·ch06·ch12·part7-05·ch10 링크로 줄이는 부분 정리가 먼저다.
- TikZ TODO·ASCII 흐름도·꾸민 로그 날짜·타임스탬프는 시리즈 나머지 글(ch14~21, ch01~03)에도 있는지 grep으로 센 뒤 다음 루프 채점에 반영한다.
