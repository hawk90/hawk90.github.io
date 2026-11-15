# 공개 글 AdSense 평가 — 루프 03

> 대상: 공개 글 10편 (Bootloader Internals, `seriesOrder` 21~30)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 세 번째 루프다. 대상은 `src/content/blog/embedded/bootloader/`의 `chapter21-board-porting.md`~`chapter30-bootloader-ci.md` 10편이고 모두 공개 글이다. ch21·ch22는 5534938b(첫 22장 일괄)로, ch23~30은 b6dedf23(신규 8편 일괄)으로 작성됐다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter21-board-porting.md` | 11 | 10 | 7 | 6 | 6 | 4 | 2 | **46** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter22-debugging.md` | 12 | 11 | 7 | 9 | 6 | 4 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter23-bootrom-efuse-otp.md` | 14 | 14 | 7 | 9 | 7 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter24-spl-deep.md` | 12 | 11 | 6 | 8 | 5 | 4 | 2 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter25-tfa-optee.md` | 14 | 12 | 8 | 8 | 7 | 5 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter26-ddr-training.md` | 14 | 12 | 7 | 7 | 7 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter27-chain-of-trust.md` | 15 | 12 | 8 | 9 | 7 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter28-flash-layout.md` | 14 | 13 | 7 | 8 | 7 | 5 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter29-distro-boot.md` | 13 | 13 | 7 | 8 | 7 | 4 | 2 | **54** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `chapter30-bootloader-ci.md` | 15 | 12 | 7 | 10 | 8 | 4 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 54.8점(10편 합 548), 범위 46~58점이다. 판정은 우선 조치 8편, 병합 검토 2편(ch21·ch29)이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 8편(ch22~28·ch30)이고 모두 원문 내부 모순(루브릭 3-1: 같은 글 안의 두 구체 진술, 코드와 산문, 산술)으로 판정했다. 1차 자료를 열어 판정한 오류는 없다. 점수 구간으로는 10편 모두 병합 검토(40~59)이고, 병합 검토 판정 2편 중 ch21은 병합 대상(`bsp/chapter06-u-boot-porting.md`)을 적었고 ch29는 독립 검색 의도가 있어 다음 조치를 보강으로 뒀다. 우선 조치 8편도 점수 구간 기준 병합 후보를 merge_note로 남겼다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft` 상태, 같은 주제 글(같은 시리즈와 bsp·buildroot·embedded-security·modern-recipes·tools)의 겹침 구간까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter21-board-porting.md` | 46 | 46 | 0 | 없음 |
| `chapter22-debugging.md` | 50 | 50 | 0 | 없음 |
| `chapter23-bootrom-efuse-otp.md` | 59 | 58 | -1 | 없음 |
| `chapter24-spl-deep.md` | 49 | 48 | -1 | 없음 |
| `chapter25-tfa-optee.md` | 57 | 56 | -1 | 없음 |
| `chapter26-ddr-training.md` | 54 | 54 | 0 | 없음 |
| `chapter27-chain-of-trust.md` | 58 | 58 | 0 | 없음 |
| `chapter28-flash-layout.md` | 56 | 56 | 0 | 없음 |
| `chapter29-distro-boot.md` | 54 | 54 | 0 | 없음 |
| `chapter30-bootloader-ci.md` | 58 | 58 | 0 | 없음 |

1차 합 551에서 최종 548로 3점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 0건.
- 추가한 오류 확인: 5건, 5편.
  - ch22: 184행 dram_init 중단점 0x910128 바로 4바이트 뒤 0x91012c가 177행에서 board_init_f(spl.c:71) 반환 주소로 나온다. 같은 gdb 세션의 주소 배치가 맞지 않는다(66~75행 bdinfo 모순의 보조 근거).
  - ch25: 74행 'OCRAM (BL2) ~256 KB'의 칸은 74~75행 경계 0x0091_0000~0x0094_0000 = 192 KB다. 79행 BL32 '~32 MB'도 79~80행 칸(31 MB)·90행 carveout 0x01e00000(30 MB)과 맞지 않는다. 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
  - ch26: 99행 LPDDR4 read DQS 'single-ended' vs 196~197행 'DQS·CK는 differential 100Ω'. 평가자는 기억 기반 uncertainties로만 뒀으나 글 안의 두 위치가 충돌한다.
  - ch28: 165행 'bbt found at page 524160'(2 KiB page·64 page/block이면 block 8190, 1 GiB 장치 끝) vs 163행 0x6F600000(약 1.74 GiB). 161~163행 eraseblock 크기 모순을 뒷받침하는 같은 출력 안의 추가 위치다.
  - ch30: 32행 'ARMv8-A에서는 TF-A BL31·OP-TEE가 함께 묶여야 부팅 가능' vs 86행 'ARMv8-A U-Boot은 QEMU virt에서 -bios u-boot.bin 한 줄로 뜬다'(52~54행 TF-A 없는 qemu_arm64 job).
- 점수 변경: ch23 D 10→9(boot mode fuse lock이 같은 시리즈 ch10 23·364~371행과 겹침), ch24 D 9→8(ch04·ch05·ch07·ch22와 다른 시리즈 두 편에 반복이 넓음), ch25 B 13→12(확인된 내부 수치 모순). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: ch21 A 인용 178→188행, G 버전 노출 330→331행. ch22 post-mortem 절 시작 195→197행, BSP ch06 DEBUG_UART 157~159행, BSP ch11 288~294행으로 좁히고 열지 않은 riscv 글을 비교 목록에서 뺐다. ch25 E 제목 인용을 'ARM Trusted Firmware-A 통합 — …'로 바로잡고 ch31 표 202~210행, bsp ch07 PSCI DT 208~236행으로 고쳤다. ch26 ch09 training 표 283~289행, BSP ch05 251~254·329~331행으로 고쳤다. ch28 ch17 A/B 원칙 65행, 표 312~322행으로 고쳤다.
- 근거 철회: ch29 평가자가 'extlinux를 다루는 글은 buildroot/chapter13'이라 했으나 buildroot 디렉터리 전체에 'extlinux'가 0건이라 지웠다. 'Ch 26 라벨 오류가 시리즈 공통'이라는 series_issue도 ch09·10·24·25 라벨이 DDR 주제와 맞아 이 글만의 문제로 고쳤다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목·본문과 대조했다. 10편 모두 F ≤ 5다. 원인은 '시리즈 마지막' 표기(ch21·ch22·ch30), 라벨이 대상과 다른 링크(전 10편), 예고 내용이 다음 편에 없음(ch24)이다.

## 글별 근거

### `chapter21-board-porting.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(5534938b 시리즈 작성, 2003b8a6·c38cb67c text 블록 정리, 3235d76c TikZ, ac24bb76 제목 변경, fa55144d 링크 일괄 수정, be973200·0a9dd7bc frontmatter, ab94fb2f 연락처 링크)에 U-Boot upstream·NXP 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 149행 산문과 143~146행 Makefile의 충돌은 kbuild 규칙을 알아야 판단되는 코드 결함이라 3-1 제외 규정에 따라 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 `-u-boot.dtsi`와 bootph-all/bootph-pre-ram 구분(71행, 282~303행), TARGET_BOARDX를 mach-imx Kconfig와 board Kconfig 양쪽에 등록하는 흐름(97~128행), 멈춘 단계별 의심 대상 매핑(344행), mainline 제출용 commit 분리(361~366행)다. reference 보드 복사(13·34·76행), board_init_f 순서(210~227행), DDR timing은 벤더 도구로(230행)는 BSP Development 6편과 같고, 188행 '처음 한 사이클에는 이 정도면 충분합니다', 378행 'PCB와 한 번 더 대조해야 합니다'는 선택 기준 대신 일반론이다. 앵커 part7-05(9점)보다 고유 절이 조금 많아 11. |
| B | 10 | 후보 찾기 → 파일 목록 → defconfig → Kconfig → boardx.c → spl.c → DT → 빌드·dd → 단계별 디버깅 → MAINTAINERS → 함정 흐름은 끝까지 간다(19~378행). 그러나 '바꿀 파일 여섯 군데'(43~69행) 중 1·4·5·6번(47·63·66·69행)은 굵은 제목만 있고 비어 있으며, include/configs/boardx.h(63행)는 내용이 한 번도 나오지 않는다. 387행 CONFIG_DEBUG_UART '마지막 보루'는 본문에서 344행 한 단어뿐이다. 149행 'SPL_BUILD 시점에는 SPL용 파일만'은 143행 조건 없는 obj-y와 어긋나 보인다. AP-C-24에 따라 B ≤ 13, 빈 항목 때문에 10. |
| C | 7 | 빌드·기록 명령(309~318행), 보드 코드(153~228행), 단계별 예시 로그(330~342행)가 있다. 대상 U-Boot 버전·보드·툴체인이 없고 3000MTS·1600 MHz(333·338행), seek=33(317행), 1 GB(253행)에 출처·측정 환경이 없어 C ≤ 8. 328행이 '예시'라고만 해 실제 실행 기록인지 알 수 없고, 합격·실패 관찰을 가르는 절차는 344행 한 문장이다. 앵커 part7-05(8점)보다 낮게 7. |
| D | 6 | 비교한 글: 같은 시리즈 `chapter20-rauc-swupdate.md`(겹침 없음), `chapter22-debugging.md`, 다른 시리즈 `bsp/chapter06-u-boot-porting.md`, `bsp/chapter10-first-boot.md`. bsp6와 겹침: reference 복사(73~77행 ↔ bsp6 99행), 6개 파일 목록(43~69행 ↔ bsp6 88~95행), defconfig 머리 CONFIG_ARM·ARCH_IMX8M·SYS_TEXT_BASE=0x40200000(82~84행 ↔ bsp6 138~141행), spl.c board_init_f(203~227행 ↔ bsp6 221~265행), 첫 출력 디버깅(322~344행 ↔ bsp6 270~364행), SYS_TEXT_BASE 함정(374행 ↔ bsp6 469~471행). 344·375행 UART 미출력 원인은 ch22 매트릭스와도 겹친다. 이 글만의 것은 bootph dtsi(282~303행), Kconfig 등록(97~147행), MAINTAINERS·commit 분리(346~366행)다. |
| E | 6 | 제목 '새 보드 U-Boot 포팅 실전'과 description의 configs·board·dts·MAINTAINERS는 73~366행이 다룬다. 제목은 일반 '새 보드'인데 본문은 i.MX8MM 하나(24·104·240·338행)라 AP-C-24에 따라 E ≤ 8이고, '실전'을 내걸었지만 실제 보드 실행 기록 없이 템플릿 코드 나열이라 6. |
| F | 4 | 392행 다음 장 예고는 내용상 seriesOrder 22 `chapter22-debugging.md`를 가리키지만 '다음 장이 시리즈 마지막입니다'라고 해 틀렸다(23~30·35~37은 `draft: false`). 398행 라벨 'BSP Development Ch 6: BSP 첫 단계 — 부트로더에서 첫 시리얼까지'는 `bsp/chapter01-what-is-bsp.md`로 간다. 396·397행 라벨은 맞다. 틀린 라벨로 F ≤ 5, 43~69행 빈 항목과 52~57행 '- ├──' 불릿 트리로 흐름이 끊겨 4. |
| G | 2 | 본문 출처는 399행 U-Boot doc/board/ 색인 링크 하나이고 특정 주장(303·97·317행)과 연결되지 않는다. U-Boot 버전은 331·337행 예시 로그의 '2026.04'뿐이고 대상 버전으로 밝히지 않았다. NXP DDR Tool(230·372행)·SoC datasheet BOOT_MODE(378행)는 문서명·판 없이 언급만 했다. |

uncertainties:
- 84·374행 CONFIG_SYS_TEXT_BASE: 예시 로그가 U-Boot 2026.04인데 mainline에서 CONFIG_TEXT_BASE로 바뀌었다는 기억이 있다. upstream Kconfig로 확인하지 않았다.
- 155·196행 `#include <common.h>`: 최근 U-Boot에서 common.h가 제거됐다는 기억이 있어 2026.04에서 컴파일되는지 미확인.
- 92~93행 CONFIG_BOOTCOMMAND="run distro_bootcmd"와 CONFIG_BOOTSTD_FULL=y 조합의 동작 미확인.
- 133~137행 SYS_BOARD_PINMUX·IMX_CONFIG imximage.cfg가 i.MX8M(binman/flash.bin 경로) 보드 Kconfig에 쓰이는 옵션인지 미확인.
- 38~40행 grep -l에 configs/ 디렉터리를 -r 없이 넘겨 의도한 결과가 나오지 않을 수 있다.
- 149행 설명과 143행 obj-y += boardx.o(ifdef 밖)가 어긋나 보이나 빌드 규칙 판단이라 3-1에 따라 오류 확인에 넣지 않았다.
- 317행 dd seek=33(bs=1k)과 bsp/chapter06 280행 '오프셋 1KB(seek=2 bs=512)'가 다르다(SoC 8MM vs 8MP, 다른 글과의 모순).
- 개수 표기: 17행 '다섯 군데', 43행 '여섯 군데', 383행 '네 곳'이 서로 다르고, 386행 '다섯 단계'는 여섯 항목을 나열한다.
- 374행은 reference의 CONFIG_SYS_TEXT_BASE를 그대로 두지 말라는데 84행 예시는 bsp6 140행 reference와 같은 0x40200000을 쓴다.
- 330~342행 로그(3000MTS, 1600 MHz running at 1200 MHz, eth0 30be0000)가 실제 실행 기록인지 알 수 없다.

병합 대상: `src/content/blog/embedded/bsp/chapter06-u-boot-porting.md`. 이 글의 고유 절(bootph -u-boot.dtsi 282~303행, Kconfig 등록 97~147행, MAINTAINERS·commit 분리 346~366행)을 bsp 6편에 옮기거나, 이 글을 '부트로더 시점의 mainline 등록·DT 단계 속성'으로 좁혀 차별화 보강할지 결정한다. 두 글이 같은 i.MX8M reference 복사·spl.c·첫 부팅 디버깅을 반복한다. 독립 유지를 택하면 다음 조치는 보강(빈 파일 항목 채우기, 대상 버전·출처 명시, 392행 다음 장 안내와 398행 링크 수정).

### `chapter22-debugging.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. 66~68행 bdinfo는 DRAM bank 0 start 0x40000000, size 0x40000000(끝 0x80000000)인데 같은 출력 70행 relocaddr 0xbff7c000, 72행 fdt_blob 0xbef8b790은 그 범위 밖이다. 75행은 'U-Boot은 DDR 위쪽으로 재배치되어 동작'한다고 적어 relocaddr가 DRAM 안이어야 한다고 스스로 말한다(reloc off 산술 0xbff7c000-0x40200000=0x7fd7c000 자체는 맞음). 94행 mtest 0x90000000~0x90100000, 217·219행 ramoops 0xbf000000도 같은 bdinfo의 DRAM 밖이다. 보조로 184행 dram_init 중단점 0x910128(boardx.c:16)의 4바이트 뒤 0x91012c가 177행에서 board_init_f 반환 주소로 나온다. git log(0a9dd7bc, 16292f94, be973200, fa55144d, ac24bb76 외)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 75행 reloc off로 text base와 relocaddr를 오가는 설명, 228~242행 증상별 첫·두 번째 의심 매트릭스, 209~226행 ramoops를 reserved-memory로 보호하는 연결 정도다. DEBUG_UART(19~56행), md/mw/mtest(77~99행), env(101~135행), OpenOCD+gdb(137~193행), cheat sheet(246~305행)는 입문 수준 도구 목록이다. 244행 '60%가 이 표 안에서 해결'은 출처가 없고, 135·340행은 선택 기준 없이 권고로 끝난다. 앵커 part1-04(A 10)보다 매트릭스 몫만 높게 12. |
| B | 11 | 첫 글자 → 콘솔 명령 → env → JTAG → post-mortem → 매트릭스 → cheat sheet → 실수 → 정리 흐름은 끝까지 간다. description(5행)의 'panic dump 읽기'는 203~207행 다섯 줄과 226행 한 줄뿐이고 204행 `md.l <kernel-log-region>`은 영역 찾는 법이 없다. 17행 'cmdline에서 panic 단서 후추출'에 대응하는 절이 없다. JTAG 절은 158행 u-boot ELF와 176행 SPL 심볼을 섞고 SPL ELF 선택·relocation 뒤 심볼 처리를 다루지 않는다. 내부 모순이 있어 B ≤ 13 안에서 11. |
| C | 7 | defconfig(24~31행), SPL 코드(36~49행), 콘솔 세션(62~133행), OpenOCD·gdb(141~193행), DT 조각(211~224행)으로 따라 할 수 있다. 그러나 예시 출력이 서로 맞지 않고(66~72·94·177·184행) 대상 보드·U-Boot 버전·DDR 크기가 없으며 147행 OpenOCD 0.12.0은 출력 속 문자열뿐이다. 244행 '60%'로 C ≤ 8, 합격·실패 관찰 구분이 54~56행 세 갈래뿐이라 7. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter21-board-porting.md`, `chapter23-bootrom-efuse-otp.md`, 다른 시리즈 `bsp/chapter06-u-boot-porting.md`, `bsp/chapter11-bootlog-debugging.md`, `tools/debugging/embedded/chapter14-hang-without-jtag.md`(draft). 25~28행 DEBUG_UART BASE 0x30890000·CLOCK 24000000이 BSP ch06 157~159행과 같고 52~56행 첫 글자 진단은 BSP ch06 270행과 같은 질문이다. 143·158·162행 openocd·gdb-multiarch·target remote :3333은 BSP ch11 288~294행과 거의 같다. 228~242행 매트릭스는 ch21 344행, BSP ch11 316~326행과 역할이 겹친다. 209~226행 ramoops는 tools ch14 69~86행과 같다. ch23은 겹치지 않는다. 콘솔 명령 중심 역할이 남아 9. |
| E | 6 | 제목의 DEBUG·JTAG·serial·post-mortem은 19·137·58/101·197행 절이 있다. 제목의 '분석'과 description의 'panic dump 읽기'에 비해 post-mortem 절(197~226행)은 목록과 DT 조각뿐이라 부분 미이행이다. 대상 SoC(i.MX8MM)는 142~143행 명령에만 드러난다. |
| F | 4 | 13행 '이 시리즈의 마지막', 309행 '22편'인데 seriesOrder 23 `chapter23-bootrom-efuse-otp.md`(공개)부터 ch37까지 있고 다음 편 안내가 없다. 311~317행 요약이 실제 장과 다르다(312행 'Ch 4~7: SPL, DDR…'인데 ch04는 boot-stages, 313행 ch08은 board-init, 314행 ch12는 usb-boot). 357·358행 라벨은 맞다. 362행 라벨 'doc/usage/debug.rst'와 URL usage/index.html이 다르고 330행 Practical RTOS Internals는 링크가 없다. F ≤ 5에 다음 편 부재가 겹쳐 4. |
| G | 1 | 본문 출처는 362행 링크 하나이고 라벨과 URL이 달라 주장과 연결되지 않는다. U-Boot 버전·보드·DDR 크기가 없고 25~31행 Kconfig 심볼과 75행 relocation 동작에 1차 출처가 없다. 앵커 part1-04(G 1)와 같은 수준. |

uncertainties:
- 26행 `CONFIG_DEBUG_UART_NS16550=y`와 27행 BASE 0x30890000 조합: 같은 BASE를 쓰는 BSP ch06 159행은 `CONFIG_DEBUG_UART_IMX=y`다. U-Boot drivers/serial로 확인하지 않았다(다른 글과의 모순).
- 31행 `CONFIG_DEBUG_UART_SKIP_INIT=n` 표기와 30행 ANNOUNCE 문자열 '<debug_uart>'는 U-Boot 소스로 미확인.
- 52행 '`printf`는 아직 동작하지 않습니다'는 U-Boot doc으로 미확인.
- 158행 `gdb-multiarch u-boot`인데 176~177행 bt가 SPL의 spl.c 심볼을 해석한다. 빌드 산출물 지식에 기대므로 오류 확인 근거에서 뺐다.
- 199행 '부트 도중 패닉 시 RAM이 깨끗'은 SoC·리셋 종류에 따라 다르며 1차 자료 없음.
- 244행 '60%'는 출처 없는 수치.
- 339행 OpenOCD `reset run` 권고, 342행 U-Boot의 ramoops 영역 zero-fill 주장은 문서로 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치라 병합 대상은 적지 않았다. D 근거의 겹침(bsp ch06·ch11, ch21)은 보강 때 링크로 줄일 후보다.

### `chapter23-bootrom-efuse-otp.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. 36행 'PC는 i.MX 8M ROM base인 `0x00910000`으로 설정됩니다'와 40행 'SPL을 OCRAM(`0x00910000~`) 또는 TCM에 적재'는 같은 주소를 한쪽은 mask ROM base, 다른 쪽은 SPL을 써 넣는 OCRAM이라고 한다. 37행이 OCRAM을 `0x00900000`에 두고 21·273행이 BootROM은 die에 새겨져 수정할 수 없다고 했으므로 두 진술은 동시에 참일 수 없다. 1차 자료(IMX8MPRM 메모리 맵)는 열지 않았다. git log(b6dedf23 신규 작성, ac24bb76, fa55144d, e85d7684, be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 것은 SoC 다섯 종 boot mode 입력 비교표(70~76행), fuse map 비트 위치와 맞춘 `fuse prog` 값(61~62행 bit13·bit25, 234행 JTAG_SMODE 011<<3=0x18, 237행 bit2=0x4 — 116~125행 표와 산술이 맞음), 사고·회복 가능성 표(246~254행), 양산 fuse 순서(258~265행)다. OTP 개념(82~84행), RoT 해시 원리(145행), anti-rollback 원리(190~202행)는 표준 설명이다. 256·269행('0.5%의 보드')은 출처 없는 사례다. 13~19 구간 하단. |
| B | 14 | BootROM 순서(33~40행) → boot mode(46~78행) → eFuse·fuse map(80~141행) → RoT(143~186행) → anti-rollback(188~218행) → JTAG(220~240행) → 실수·양산 순서(242~269행) → 정리(271~280행)로 흐름은 완결된다. 31행 TikZ가 TODO 주석으로 남아 순서도가 없다. 86행 '크게 네 분류'라고 하고 네 분류를 나열하지 않는다. 209~211행 의사 코드가 부팅 성공 확인 전에 fuse를 굽는 위험을 설명하지 않는다. Rockchip(130~139행)·TI(141행)는 표 하나와 한 문장뿐이다. |
| C | 7 | U-Boot `fuse prog`/`fuse sense`(59~64, 176~182, 232~238행)와 CST 절차(149~172행)는 구체적이다. U-Boot·CST 버전, 대상 보드, 실제 실행 결과가 없다. 104~108행 출력은 deadbeef·cafebabe 같은 자리표시 값이고 171·179행은 '...'·'0x...'로 잘려 있다. 34·35·269행 수치는 출처·환경이 없어 C ≤ 8. 36·40행 모순으로 SPL 적재 위치를 그대로 따라 할 수 없다. |
| D | 9 | 비교한 글: 같은 시리즈 `chapter22-debugging.md`(137행 JTAG는 디버깅용이라 겹치지 않음), `chapter24-spl-deep.md`(역할 구분), `chapter27-chain-of-trust.md`(19~27행 RoT ↔ 143~145행, 239행 SRK revocation ↔ 97·122·254행, 241~245행 anti-rollback ↔ 188~202행), `chapter10-storage-boot.md`(23행 BOOT_MODE 핀, 364~371행 `fuse prog` 부팅 잠금 ↔ 46~66행), 다른 시리즈 `embedded-security/chapter02-secure-boot.md`(108행 ↔ 80~84행, 159~171행 HABv4 SRK ↔ 145~184행, 218행 SEC_CONFIG ↔ 128·184행, 247~252행 anti-rollback ↔ 190~202행, 336행 ↔ 218행 같은 결론). fuse map 비트 표(116~126행), JTAG fuse(220~240행), 양산 순서(258~265행)는 남는다. |
| E | 7 | 제목·description(5행)의 mask ROM 동작, eFuse/OTP 키, anti-rollback, secure boot 시작점을 33~44·143~186·188~218행이 이행한다. 'SoC' 일반을 내걸지만 순서·fuse map·명령은 i.MX 8M Plus 전용(29·88·114행)이고 다른 SoC는 표 수준이며 '분석'에 비해 실제 동작 관찰이 없다. |
| F | 5 | 284행 다음 편 안내(Ch 24 SPL·TPL)는 seriesOrder 24 `chapter24-spl-deep.md`와 맞고 186·291행 Ch 27 링크도 맞다. 292행 라벨 'Buildroot Ch 18: 보안 기능 — 빌드 시스템 관점의 secure boot'의 대상 `buildroot/chapter18-security-cve.md`는 제목이 'Buildroot Security·CVE 추적'이고 'secure boot'·'HAB'·'서명'이 0건이다. F ≤ 5. 284행 'SRAM 안 50 KB'도 ch24 17·23·34행과 다르고 31행 TikZ 자리가 비어 있다. |
| G | 2 | 본문 출처는 293~294행 NXP AN4581·IMX8MPRM 링크 두 개뿐이고 revision이 없으며 어느 주장(116~126행 비트 위치 등)과도 연결되지 않는다. Rockchip OTP 표(132~139행), TI AM62x(74·141행), STM32MP15x OTP word 17(76행)은 출처가 없다. U-Boot·CST 버전이 없다. |

uncertainties:
- 38~39행 i.MX 8M(HABv4)에 'boot container header'·'container 안 SRK table'이라 썼으나 ch27 122행은 HABv4를 IVT+CSF로 설명한다. container는 AHAB 계열이라는 의심, 1차 자료 미확인.
- 36행 ROM base, 40행 SPL 적재 주소의 실제 값은 IMX8MPRM으로 열어 보지 않았다.
- 98·99행 fuse bank 표에서 Bank 9가 두 번 나오고 126행은 9/3을 SW_GP1로 둔다. 실제 OCOTP 배치 미확인.
- fuse 주소 체계가 글마다 다르다: 이 글 61~62·123행(bank 1 word 3, bank 9 word 0), ch10 364~371행(bank 6 0x730), embedded-security ch02 218행(`fuse prog -y 0 6`). 다른 글과의 모순이라 1차 자료로 정해야 한다.
- 86행 '크게 네 분류'인데 네 분류를 나열하지 않는다(개수 표기).
- 240행 'JTAG 완전 비활성화한 칩은 살릴 방법이 없다'와 252행 '부분 회복 (BootROM USB downloader)'·39행의 관계가 모호하다.
- 209~211행 의사 코드 주석('부팅 후 굳혀야 함')과 즉시 굽는 코드의 시점 차이. 의사 코드라 오류 확인에 넣지 않았다.
- 120행 WDOG_ENABLE [27:26], 61행 BOOT_CFG[13], 74행 AM62x 'MMR_BOOTCFG', 76행 STM32MP15x 'OTP word 17', 141행 tamper 시 키 erase, 132~139행 RK3568 OTP 크기는 기억으로만 의심.
- 34·35행 '수십 ms'·'수 ms', 269행 '0.5%'는 출처·환경 없는 수치. 104~108행 출력은 자리표시 값.
- 284행 'SRAM 안 50 KB'는 ch24 17·23·34행(32~256 KB, i.MX 8M Plus 256 KB)과 다르다(다른 글과의 모순).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 같은 시리즈 `chapter27-chain-of-trust.md`(RoT·SRK revocation·anti-rollback), `chapter10-storage-boot.md`(boot mode fuse lock, 364~371행), `embedded-security/chapter02-secure-boot.md`(HABv4·SEC_CONFIG·anti-rollback)다. i.MX 8M Plus fuse map 비트 표, JTAG fuse 잠금, 양산 fuse 순서·사고 표는 세 글에 없어 다음 조치는 보강이다(36·40행 주소를 IMX8MPRM으로 대조, 292행 라벨, 284행 SRAM 크기를 ch24와 맞춤, RoT·anti-rollback 원리는 ch27 링크로 줄임).

### `chapter24-spl-deep.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. (1) 103행 `CONFIG_SPL_TEXT_BASE=0x00910000`과 106행 `CONFIG_SPL_BSS_START_ADDR=0x00910000`은 .text와 .bss 시작이 같은데, 151~158행 linker script는 .bss를 .data 뒤(`__image_copy_end` 다음)에 두고 165·334행은 'text → rodata → data → bss → stack' 연속 배치라고 한다. 105행 `SPL_STACK=0x00920000`도 TEXT_BASE+MAX_SIZE(0x942000) 안에 들어가 334행 layout과 맞지 않는다. (2) 66행은 TPL이 'SRAM에 적재된 SPL로 점프'한다는데 67행은 SPL이 'DDR 위에서 동작', 72행은 'SPL은 그 뒤에 DDR에서 동작'이라 하고 재배치 설명이 없다. (3) 248행 Falcon 단축 '수백 ms ~ 1초' vs 336행 '1초 이상'(정리 문장의 과장으로 볼 여지가 있는 경계 사례). (1)만으로 오류 확인은 성립한다. git log(b6dedf23, ac24bb76, fa55144d, e85d7684, be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 부분은 SoC별 SRAM·SPL 크기 표(31~37행), SPL config 트리와 옵션 표(90~125행), linker script 발췌(137~162행), next stage 적재 4패턴과 코드(169~227행), 'S 한 글자' UART 디버깅(272~293행), 흔한 실수 6가지(311~325행)다. TPL(55~82행), spl_image_info(231~241행), Falcon(246~262행)은 ch04·ch05 재정리 수준이다. 직접 겪은 실패 사례나 선택 기준 분석이 없다. 앵커 part1-04(A 10)보다 패턴 비교가 있어 12. |
| B | 11 | 문제(19~39행) → 역할(41~53행) → TPL(55~82행) → config(84~127행) → layout(129~167행) → 적재(169~244행) → Falcon(246~264행) → 디버깅(266~309행) → 실수(311~325행) → 정리(327~338행)로 이어진다. 63행 TODO 아래 TPL 흐름 그림이 없다. 103·106행 vs 151~158·334행, 66행 vs 67·72행 모순이 정확성을 깎는다. 222행 주석은 구조체 하나로 여러 이미지를 어떻게 다루는지 설명하지 못한다. AP-C-24에 따라 13 이하. |
| C | 6 | 31~37행 표, 80행 '500 KB ~ 1 MB', 127·315행 '수 KB ~ 십수 KB', 225행 '십수 KB', 248행 단축 폭에 출처·환경이 없어 C ≤ 8. 273~290행은 'i.MX 계열'이라면서 CCM·IOMUX와 PL011식 `UART_FBRD`·`UART_LCR`·`UART_DR`을 섞었다. 198행 `spl_load_image_fat(spl_image, …)`은 196행에서 값으로 선언한 구조체를 포인터 없이 넘긴다. 293·307행은 확인 절차만 있고 실제 출력이 없다. 앵커 part1-04(C 6)와 같은 수준. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter04-boot-stages.md`(57~59행 RK3399 TPL ↔ 55~72행, 192~201행 `struct spl_image_info` ↔ 231~241행, 360~362행 TEXT_BASE 불일치 ↔ 321행, 67~76행 SPL·BL2 ↔ 342행 예고), `chapter07-driver-model.md`(347~386행 SPL_DM·OF_PLATDATA ↔ 96~99·118~127행), `chapter05-falcon-mode.md`(15~30·372행 ↔ 246~262행), `chapter22-debugging.md`(19~31행 ↔ 266~293행), 인접 `chapter23`·`chapter25`(역할 다름), 다른 시리즈 `buildroot/chapter13-uboot-integration.md`(267~280행 ↔ 17·76~80행), `modern-recipes/part3-12-bootloader-chain.md`(26~45행 ↔ 41~72행). config 트리·linker script·적재 4패턴은 이 글에만 있지만 나머지가 네 편에 흩어져 반복돼 8. |
| E | 5 | 제목(2행)이 '동작 추적'을 약속하지만 실제 부트 로그, bootstage report 출력, map 파일 발췌가 없고 307행은 '확인할 수 있다'뿐이다. description(5행)의 '정확한 역할'·'SRAM 안 코드 구조'·'DDR이 없는 환경'은 41~53·129~167·19~27행이 다루나 '정확한 역할'은 66행과 67·72행 모순으로 흐려진다. 분석·추적 약속에 개념 소개 수준이라 3~5. |
| F | 4 | 342행 다음 편 'Ch 25: ARM TF-A 통합'은 seriesOrder 25 `chapter25-tfa-optee.md`와 제목이 맞지만, 예고한 'SPL이 BL2 자리에서 동작하거나 TF-A BL2가 SPL과 함께 묶이는 두 패턴'은 ch25 H2(39·67·102·144·179·197·232·280·313행)에 없고 SPL은 351행에 한 번 나온다. 그 내용은 ch04 67~76행에 있다. 351행 라벨 'Ch 25 — SPL과 BL31의 관계'도 대상과 맞지 않는다. ch01·ch04·ch05·ch23·ch26 라벨은 맞다. F ≤ 5에 63행 그림 누락과 전제 지식 안내 부재로 4. |
| G | 2 | 본문 출처는 353행 U-Boot SPL 문서 링크(`latest`, 버전 없음) 하나와 131행 linker script 경로뿐이다. U-Boot 버전, 대상 보드, SoC reference manual이 없고 31~37행 표와 248·336행 수치는 어떤 출처와도 연결되지 않는다. 앵커 part7-05(G 2)와 같은 수준. |

uncertainties:
- 31~37행 SoC별 SRAM·SPL 크기는 데이터시트로 확인하지 않았다. 35행 'Allwinner H3는 TPL을 보통 같이 씀'은 기억으로는 sunxi가 TPL을 쓰지 않는 것 같지만 미확인.
- 133행 캡션 'i.MX 8M, 192 KB'와 34행 'i.MX 8M Plus 256 KB'는 다른 칩이라 모순으로 보지 않았다. 103~107행 config가 어느 SoC 기준인지 본문에 없다.
- 167행 '모든 섹션이 같은 region에 들어가야 한다'는 BSS를 별도 region에 둘 수 있는 U-Boot armv8 SPL lds와 맞지 않을 수 있다(소스 미확인).
- 179행 `CONFIG_SYS_TEXT_BASE`는 최신 U-Boot에서 `CONFIG_TEXT_BASE`로 바뀌었을 수 있다.
- 298~304행 `BOOTSTAGE_ID_SPL_CLOCK`·`_DRAM`·`_CONSOLE`이 include/bootstage.h에 있는지 미확인.
- 198행 `spl_load_image_fat`, 214행 `spl_load_simple_fit` 시그니처가 현재 U-Boot와 맞는지 미확인.
- 313행 'MAX_SIZE 초과 시 빌드 경고만'과 125행 '빌드 시 SRAM overflow 체크'의 긴장. 경고인지 오류인지 미확인.
- 72행 TPL '수 KB'와 66·78행 '8~32 KB'의 표기 차이(산문 표기라 오류 확인 제외).
- 53행 'EL2의 U-Boot Proper'는 보드 설정에 따라 다를 수 있다.
- Falcon 단축 폭이 ch05 15·28·30·372행과 이 글 248·336행에서 제각각이다(다른 글과의 모순).

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `chapter04-boot-stages.md`(TPL·spl_image_info·TEXT_BASE 실수·SPL/BL2 중복)와 `chapter07-driver-model.md`(SPL_OF_PLATDATA)다. config 트리·linker script·적재 4패턴은 'SPL 내부 구조'라는 독립 검색 의도가 있어 다음 조치는 보강이다. 103~107행 config 주소와 66·67·72행 SPL 동작 위치를 U-Boot 소스(arch/arm/cpu/armv8/u-boot-spl.lds, 대상 보드 defconfig)와 SoC RM으로 확인해 고치고, 248·336행 수치를 하나로 맞추고, ch04와 겹치는 설명은 링크로 줄이고, 342행 예고와 351행 라벨을 ch25 실제 내용에 맞추거나 ch04로 돌린다.

### `chapter25-tfa-optee.md` — 56점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순. 72~81행 i.MX 8M Plus 메모리 맵이 74행 `0x0091_0000 ── OCRAM (BL2) ~256 KB`로 적고 바로 다음 경계를 75행 `0x0094_0000`으로 둔다. 0x0094_0000 − 0x0091_0000 = 0x30000 = 192 KB라 '~256 KB'가 이 범위에 들어갈 수 없다(같은 그림의 BL31은 1 MB 칸 안에 ~64 KB라 크기 표기는 칸 안에 들어가는 크기로 읽힌다). 79행 BL32 '~32 MB'도 0xBE10_0000~0xC000_0000(31 MB) 칸보다 크고, 90행 reserved-memory는 같은 영역을 0x01e00000 = 30 MB로 잡아 세 수치가 맞지 않는다. 1차 자료는 열지 않았다. git log(b6dedf23, ac24bb76, fa55144d, e85d7684, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | i.MX 8M Plus 주소 맵(71~81행)과 reserved-memory carveout(87~100행), FIP UUID 표(223~228행), vendor별 산출물·부트 미디어 위치 표(270~276행), 증상·확인 명령을 붙인 흔한 실수 5개(317~351행)는 이 글이 모은 정리다. BL 단계 설명(41~65행)·PSCI 표(286~292행)·SMC 경로(168~177행)는 TF-A 공식 문서의 표준 내용이고 47~53행 표와 57~63행 표는 같은 내용을 두 번 싣는다. 177·311행은 근거 없는 단정이다. 13~19 구간 하단. |
| B | 12 | 흐름(21~37 → 39~65 → 67~100 → 102~195 → 197~230 → 232~278 → 280~311 → 313~351 → 353~364행)은 완결돼 있다. 74·79·90행 수치 모순이 있고, 183행 'BL2가 BL33 점프 시 EL을 정함'과 335·360행 'BL31의 BL33_SPSR', 215행 fiptool 출력 이름 등 불확실이 열려 있다. B ≤ 13에 확인된 모순을 더해 12. |
| C | 8 | OP-TEE·U-Boot·TF-A·imx-mkimage 빌드 명령(236~264행), fiptool create/info(203~219행), objdump로 BL31 VMA 확인(321~327행), bdinfo로 현재 EL 확인(337~343행)이 있다. 버전·태그와 실행 환경이 없고 74·78·79행 크기, 177행 '수 µs', 272~275행 sector offset은 출처 없는 수치라 C ≤ 8. 215~218·340행 출력이 실제 실행 기록인지 알 수 없다. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter24-spl-deep.md`, `chapter26-ddr-training.md`(겹침 적음), `chapter31-tfa-bl31-runtime.md`, `chapter32-psci-smccc.md`, `chapter02-u-boot-position.md`, 다른 시리즈 `bsp/chapter07-tfa-trustzone.md`, `embedded-security/chapter05-tee.md`. 83~100행 TZASC·reserved-memory는 ch31 53~67행과 거의 같은 문장·코드이고 133~142행 BL31 서비스 표는 ch31 202~210행과 같은 질문이다. 296~309행 PSCI DT는 bsp ch07 208~236행과 같다. 47~63행 BL 표는 bsp ch07 31~38행, ch02 74~94행과 반복된다. 168~177행은 embedded-security ch05 37·119행과 겹친다. FIP·fiptool·vendor 패키징(197~278행)은 이 글에만 있다. |
| E | 7 | 제목 'ARM Trusted Firmware-A 통합 — BL1·BL2·BL31·BL32·BL33 흐름'(2행)과 description(5행)의 'OP-TEE(BL32)·U-Boot(BL33) 위치'를 39~65·144~195행이 다루고 355~364행 정리가 같은 질문으로 끝난다. '통합'의 실제 빌드 예는 i.MX 8M Plus 하나(236~264행)뿐이고 대상 독자·전제 지식이 없다. |
| F | 5 | 368행 다음 편 'Ch 26: DDR training 깊이'는 seriesOrder 26 `chapter26-ddr-training.md`와 맞다. 373행 'Ch 23: Secure Boot 체인 — verified boot'는 `chapter23-bootrom-efuse-otp.md`, 374행 'Ch 24: HAB·AHAB·HBK — vendor secure boot'는 `chapter24-spl-deep.md`로 가서 라벨이 대상과 다르다. 372·375·376행은 대체로 맞다. F ≤ 5. 47~63행 중복 표와 45행 TODO 주석도 흐름을 흐린다. |
| G | 2 | 377~379행에 TF-A·OP-TEE 공식 문서와 Arm PSCI spec(DEN0022) 링크가 있으나 끝에 모아 둔 것이고 PSCI 표(286~292행)·UUID 표(223~228행) 옆에서 인용하지 않는다. TF-A·OP-TEE·U-Boot 버전, PSCI spec 판, imx-mkimage 태그가 없다. |

uncertainties:
- 215행 `--tb-fw bl2.bin`(206행)의 info 출력 'Firmware Updater NS_BP-BL2'를 fiptool 소스(tools/fiptool/tbbr_config.c)로 확인하지 않았다.
- 183행 'BL2가 EL을 정함'과 335·360행 'BL31이 정한 SPSR', 266행이 결정 주체를 다르게 쓴다. 둘 다 느슨하게 맞을 수 있어 오류 확인으로 올리지 않았다.
- 69행 'crash 주소가 0xFFFF_XXXX이면 BL1, 0x0091_XXXX이면 SRAM의 BL2'와 72행 BL1 ROM 0x0000_0000. 69행이 i.MX 예라고 하지 않아 판정 보류.
- 216행 BL31 size 0x1E000(120 KB)과 78행 ~64 KB·324행 ro 0x10000은 다른 빌드 예일 수 있어 판정 보류.
- 250~263행 'TF-A bl2 + FIP + imx-mkimage' 경로가 ch02 30~34행(SPL → BL31)·bsp ch07 49~51행과 다르다(다른 글과의 모순).
- 298~302행 `arm,psci-1.0` 노드의 cpu_on·cpu_off·cpu_suspend 프로퍼티가 PSCI 0.1 전용인지 미확인.
- 311행 '일부 ARMv7 환경에서는 hvc', 23행 'ARM Holdings가 유지보수'(현재 TrustedFirmware.org) 미확인.
- 340행 bdinfo 'current_el = 2' 형식, 210행 `--hw-config fdt-bl31.dtb` 용법 미확인.
- bsp ch07 131·151행은 BL31_BASE를 SRAM(0x970000)에, 이 글 78·327행은 DDR 0xBE00_0000에 둔다(다른 글과의 모순).
- 223~228행 UUID, 286~292행 PSCI function ID는 1차 자료로 대조하지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `chapter31-tfa-bl31-runtime.md`(83~100·133~142행), `chapter32-psci-smccc.md`(280~311행), `bsp/chapter07-tfa-trustzone.md`(BL 표·PSCI DT)다. 'BL1~BL33 전체 흐름 + FIP·fiptool·vendor 패키징'(197~278행)은 다른 글에 없어 다음 조치는 보강이다. 71~81행 크기를 경계 주소와 맞추고 i.MX 8MP 수치를 TF-A plat/imx/imx8m/imx8mp·imx-mkimage로 확인한 뒤, 57~63행 중복 표 제거, 373·374행 라벨 수정, BL31 런타임·PSCI 세부는 ch31·ch32 링크로 넘긴다.

### `chapter26-ddr-training.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순 세 건. (1) 94행 DDR4 clock 칸 'single-ended CK_t, CK_c (differential)'은 한 칸 안에서 single-ended와 differential을 동시에 말하고 197행 'DQS·CK는 differential 100Ω'과도 맞지 않는다. (2) 162행 Allwinner H6/H616 칸이 `dram-h6.bin`이라는 blob 파일 이름을 적고 같은 칸에 '별도 blob 없음, 코드에 통합'이라 적었다. (3) 99행 LPDDR4 read DQS 'single-ended' vs 196~197행(DDR4·LPDDR4 임피던스를 함께 다룬 뒤) 'DQS·CK는 differential 100Ω'. 사실 관련 커밋 bf206362 'Fact-check bootloader network and DDR guidance'는 본문이 비어 있고 1차 자료 이름이 없으며 고친 내용(37·41·51행)도 단정을 완곡하게 바꾼 것뿐이라 검증됨 근거가 되지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글에만 있는 내용은 실패 원인 5가지와 원인별 확인 절차(181~243행: SI, dual-source tRFC, Vref, ZQ 저항, IBIS), DDR4 vs LPDDR4 표와 FSP가 `t->fsp_msg[]`로 이어지는 설명(92~103행), byte lane별 RdLvl 값으로 PCB skew를 읽는 해석(249~259행), board revision별 `dram_timing_*` 선택 코드(311~339행)다. 37·41·51행('정확한 순서는 SoC와 PHY 구현에 따라 다릅니다', '달라지며', '일반화하면 안 됩니다')은 구체 주장을 완곡 표현으로 바꾼 일반론이다. training 표·timing 출처·stress test는 ch09와 겹친다. |
| B | 12 | controller/PHY 분리(19~37행) → training 단계(39~86행) → DDR4/LPDDR4(88~105행) → timing(107~145행) → blob(147~179행) → 실패 원인(181~243행) → dump(245~293행) → post-training(295~305행) → revision(307~339행) → 실수(341~348행)로 흐름은 갖췄다. 94·99/197·162행 모순과 46·166·207·209·250행 불확실이 남아 B ≤ 13. 제목의 '보드별 파라미터 튜닝'은 293행 한 줄뿐이다. |
| C | 7 | 168~177행 flash.bin 빌드, 249~257행 md dump, 263~273행 mtest(0x20000000 = 536870912 bytes로 산술은 맞음), 277~291행 memtester, 301행 stress-ng가 있다. 보드·U-Boot 버전·환경이 없고 183행 '90%', 187행 '1 mm', 195행 '≤ 25 mil', 259행 '5 이상 차이/±2 이내', 278행 '보통 10분', 105행 '수십 ms ~ 수백 ms', 111~121행 일반값 표가 출처·환경 없는 수치라 C ≤ 8. 예시 출력이 실측인지 표시가 없어 7. |
| D | 7 | 비교한 글: 같은 시리즈 `chapter09-dram-init.md`, 인접 `chapter25`·`chapter27`(주제 다름), 다른 시리즈 `bsp/chapter05-ddr-params.md`, `modern-recipes/part4-14-ddr-init-failure.md`. ch09와 겹침: training 표(43~49행 ↔ ch09 283~289행), `ddr_load_train_firmware` 코드(53~84행 ↔ ch09 296~312행), mtest·memtester·stress-ng(261~301행 ↔ ch09 336~365행), dual-source(203행 ↔ ch09 402행), ZQ 저항 BOM(211~213행 ↔ ch09 404행), 온도 sweep(344행 ↔ ch09 409행), retraining(302·346행 ↔ ch09 367~376행), `spl_dram_init`+self-test(313~336행 ↔ ch09 382~394행). BSP ch05와 겹침: stress test(277~293행 ↔ 251~254행), firmware 버전 불일치(343행 ↔ 329~331행). |
| E | 7 | 제목·description의 controller·PHY calibration, 보드별 timing parameter, training 실패 디버깅은 19~105·107~179·181~305행이 다룬다. '보드별 파라미터 튜닝'은 307~339행까지만 있고 튜닝 절차는 293행 한 줄이다. 제목은 SoC를 특정하지 않는데 코드·명령은 i.MX8MM 위주(54·132·169행)라 AP-C-24에 따라 E ≤ 8, 부분 미이행으로 7. |
| F | 5 | 363행 다음 편 'Ch 27: 신뢰 체인'은 seriesOrder 27 `chapter27-chain-of-trust.md`와 맞다. ch09(368행)·ch08(369행)·ch22(371행) 라벨은 맞다. 370행 'Ch 24: SPL 분리 빌드 — DDR firmware blob이 들어가는 SPL 빌드 흐름'의 대상 `chapter24-spl-deep.md`는 blob이 DTB 관련 127·237·319행뿐이고 DDR firmware·flash.bin 내용이 없다. F ≤ 5. |
| G | 2 | 본문 출처는 372행 JEDEC JESD209-4B 링크 하나이고 LPDDR4 표(92~101행)나 timing 값(111~121행)과 연결이 없다. DDR4는 JESD79-4 인용이 없다. 54·132행 U-Boot 소스 경로에 버전·태그가 없고 86행 'PMU training major message 표'도 문서명·판이 없다. |

uncertainties:
- 46행 write leveling 실패 증상 'write가 wrong bank로 들어감'은 bank 주소가 CA 경로라 의심스럽다(JESD79-4 미확인).
- 99행 LPDDR4 read DQS single-ended 주장 자체가 맞는지(기억으로는 differential) JESD209-4로 대조하지 않았다. 197행과의 모순은 factcheck에 올렸다.
- 113~121행 DDR4-3200·LPDDR4-3200 일반값 표(tCL 22/28, tRFC 350 ns, tFAW 30/40 ns 등)는 출처가 없다.
- 127행 DRAM timing 출처로 'eMMC EXT_CSD'를 든 근거가 불명확하다.
- 145행 벤더 tool이 'datasheet PDF를 입력으로 받는다'는 서술을 확인하지 못했다.
- 166행 firmware 없을 때 '런타임 segfault', '`MAINTAINERS`가 binary release로 배포' 서술 미확인. 166행 복사 경로와 170행 `$(pwd)` 위치도 다르다.
- 207·209행 DDR4 외부 `VREFDQ` 핀 측정 서술이 맞는지 미확인.
- 250~251행 `mw 0x3d000d0`에 값 인자가 없다. 70행 APB 0xd0000과의 매핑 설명이 없고 md 주소 0x3d0080000(9자리)이 i.MX8M 주소 공간과 맞는지 미확인.
- 70~73행 TrainEnable 0x9→0x1→0x0 시퀀스를 upstream ddr_init.c와 대조하지 않았다. ch09 300행과도 다르다(다른 글과의 모순).
- 213행 'ZQ 저항 오류 시 out-of-range 보고'와 ch09 404행 'calibration은 통과하지만 ODT/Ron이 어긋남'이 다르다(다른 글과의 모순).
- 343행 NXP firmware가 silicon revision별로 다르고 잘못 쓰면 '거짓 성공'을 보고한다는 주장은 출처가 없다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 같은 시리즈 `src/content/blog/embedded/bootloader/chapter09-dram-init.md`(training 표·코드·stress test·흔한 실수)다. 실패 원인별 진단(181~243행)·lane dump 해석(245~259행)·revision 선택(307~339행)은 따로 찾는 독자가 있어 다음 조치는 보강이다. 94·99/197·162행 모순을 JESD79-4, JESD209-4, sunxi U-Boot 소스로 고치고 ch09와 겹치는 절(43~84·261~301행)은 ch09 링크로 줄인다.

### `chapter27-chain-of-trust.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 241행은 anti-rollback 검사를 '부팅 시 *eFuse 카운터 ≥ 펌웨어 버전*인지 확인'이라고 정의한다. 243~246행 예시는 eFuse counter = 2인 상태에서 v1을 flash하면 'counter 1 < 2 → BootROM이 거부'라고 쓴다. 241행 조건을 적용하면 2 ≥ 1이 참이라 v1을 받아들여야 하므로 두 진술은 동시에 참일 수 없다. 35행('anti-rollback 카운터가 옛 버전이면 끊깁니다')도 예시 쪽 방향이라 241행만 부호가 반대다. git log(0a9dd7bc, be973200, fa55144d, ac24bb76 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 54~69행 TF-A 인증서 트리(trusted-key-cert 아래 soc-fw/tos-fw/nt-fw의 key cert + content cert 두 단)와 69행 'BL33만 갱신했다면 nt-fw-content-cert만 다시 서명'이라는 키 회전 비용 설명, 73~172행 NXP HABv4·Rockchip·TI K3 키 계층 비교, 255~264행 단계별 실패 메시지 표는 이 글만의 구조다. 87~122행 CSF·IVT는 벤더 문서 흐름을 옮긴 수준이고 249행 '며칠 검증된 뒤'는 기준 없이 끝난다. 핵심 규칙(241행)이 틀려 13~19 구간 중간. |
| B | 12 | RoT(19~27행) → 단계표(39~46행) → 인증서 계층(48~69행) → 벤더 3종(71~172행) → FIT(174~210행) → 모듈 서명(212~233행) → rollover·revocation(235~249행) → 실패 진단(251~291행) → 정리(293~302행)로 흐름은 완성됐다. 13·17행이 약속한 체인 끝(dm-verity)은 46행 표 한 칸과 296행 한 줄뿐이고 241행이 243~246행과 모순된다. 262·263·264행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | cst 서명(77~83행), CSF 입력(87~105행), mkimage(178~185행), sign-file(226~231행) 명령과 bootm 거부 로그(268~275행), hab_status 출력(281~289행)이 있다. 대상 보드·SoC 리비전·U-Boot/TF-A/커널 버전이 없고 로그 환경을 밝히지 않았다. 23행 'eFuse는 비싸서 256비트가 한계', 104행 Blocks 주소(0x877FF400·0x0009E000) 같은 수치로 C ≤ 8. |
| D | 9 | 비교한 글: 인접 `chapter26-ddr-training.md`·`chapter28-flash-layout.md`(주제 무관), 같은 시리즈 `chapter16-verified-boot.md`·`chapter23-bootrom-efuse-otp.md`·`chapter25-tfa-optee.md`, 다른 시리즈 `embedded-security/chapter02-secure-boot.md`·`bsp/chapter20-production.md`. 73~122행 HABv4 ↔ security ch02 159~219행 ↔ ch23 143~184행 ↔ bsp ch20 224~250행. 241~249행 anti-rollback ↔ ch16 173~186행(249행과 같은 '부팅 성공 후 일정 횟수 뒤 갱신' 조언) ↔ security ch02 247~267행. 176~210행 FIT 서명 ↔ ch16. TBBR 트리(54~69행)·벤더 비교·실패 진단 표(255~291행)는 다른 글에 없다. |
| E | 7 | 제목의 'Chain of Trust'·'다단계 서명 검증'과 5행 description의 'BootROM PK hash → BL2 → BL31/BL33 → kernel FIT key' 체인을 39~46행 표와 296행 정리가 따라간다. 13행이 약속한 '어디서 어떻게 거부되는지'는 251~291행이 답한다. dm-verity는 46행 한 칸뿐이고 대상 독자·SoC 범위가 없다. |
| F | 5 | 306행 다음 장 예고는 seriesOrder 28 `chapter28-flash-layout.md`와 맞는다. 310~315행 내부 링크 6개(ch15·16·23·25·28, buildroot ch18)는 모두 공개 글이고 주제가 맞으나 라벨은 옛 'Ch N: …' 표기라 실제 제목과 문구가 다르다. 316행 라벨 'NXP HABv4 RM (i.MX Reference Manual, HAB chapter)'은 URL이 application-note/AN4581.pdf라 응용 노트를 가리킨다. F ≤ 5. |
| G | 2 | 316~318행에 NXP AN4581, TF-A Trusted Board Boot, 커널 module-signing 링크가 있지만 끝 목록에만 있고 52행 'Trusted Boot Boot Sequence 표준', 224행 -EKEYREJECTED, 152~153행 TI 키 이름 같은 주장에 연결되지 않는다. TF-A·커널 링크는 latest라 버전이 없고 Rockchip·TI K3 절(124~172행)에는 1차 출처가 없다. |

uncertainties:
- 224행 '-EKEYREJECTED로 실패'와 263행 표의 'Required key not available'(ENOKEY 문자열로 기억됨)이 같은 상황인지 커널 소스로 확인하지 않았다.
- 264행 'Module verification failed: signature and/or required key missing'이 MODULE_SIG_FORCE 강제 모드 메시지인지, 비강제 모드 taint 메시지인지 미확인.
- 262행 'No signature found in image'의 원인을 '-r 빠뜨림'으로 적었는데 -r은 키를 required로 표시하는 옵션이라 관계가 다를 수 있다.
- 147행 TI K3 '키 계층이 4단'인데 156행 설명은 ROTPK → BMPK/SMPK(병렬) → INTPK → 이미지로 3단으로 읽힌다(개수 표기로 보고 오류 확인 제외). 152~153행 BMPK·SMPK 명칭 미확인.
- 52행 'Trusted Boot Boot Sequence 표준'과 317행 링크 대상(trusted-board-boot.html)의 문서명이 다르다.
- 160~165행 K3_HSFS_KEY·K3_HSFS_TYPE·tisdk-secure 변수, 170행 'Cortex-M3 DMSC'가 AM64에 맞는지 미확인.
- 126·139~140행 rkdeveloptool wf로 eFuse를 굽는다는 명령이 실제 도구 기능인지 미확인.
- 239행 'SRK2 revoke 후 SRK3으로 옮기며 ROTPK은 손대지 않는다'는 NXP 개념(SRK가 루트 키)과 섞였을 가능성.
- 233행 CONFIG_LOCKDOWN_LSM만으로 /dev/mem·kexec·BPF kprobe가 막힌다는 서술은 lockdown 모드 설정 필요 여부 미확인.
- 316행 AN4581 PDF는 직접 열지 않았고 URL 경로로 라벨 불일치를 판단했다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 HABv4 절(73~122행)이 `embedded-security/chapter02-secure-boot.md` 159~219행·`chapter23-bootrom-efuse-otp.md` 143~184행과, anti-rollback 절(241~249행)이 `chapter16-verified-boot.md` 173~186행·security ch02 247~267행과 겹친다. TBBR 트리·세 벤더 비교·실패 진단 표는 'chain of trust 전체 흐름'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 241행 비교 부호를 고치고, 겹치는 HABv4·FIT 절은 링크로 줄이고, TF-A·HABv4·TI K3 주장에 1차 출처와 버전을 붙인다.

### `chapter28-flash-layout.md` — 56점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순. 161행 'Bad eraseblock 47 at 0x000005e0000'은 47×0x20000(128 KiB)=0x5E0000이라 128 KiB eraseblock을 전제한다. 같은 dmesg 출력의 162행 'Bad eraseblock 312 at 0x000027000000'은 312×0x200000(2 MiB)=0x27000000, 163행 'Bad eraseblock 891 at 0x00006f600000'은 891×0x200000=0x6F600000이라 2 MiB eraseblock을 전제한다(128 KiB라면 0x2700000·0x6F60000). 165행 'bbt found at page 524160'은 2 KiB page·64 page/block이면 block 8190, 즉 1 GiB 장치의 끝이므로 163행 0x6F600000(약 1.74 GiB)은 같은 장치 안에 있을 수 없다. 글이 쓰는 128 KiB 블록(173행, 210행 '-p 128KiB')과도 162·163행이 맞지 않는다. git log(ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글 고유의 부분은 partition별 sizing rule 표(82~93행), A/B 분할 여부 표(126~135행), 7단계 설계 워크플로(284~294행), 흔한 실수 8개(300~307행)다. 핵심 근거인 '2년치 OTA 누적 시 1.3~1.5배'(95행), '실제 크기 × 1.5'(84~90행), 'UBI overhead 5~10%'(212행)에 출처나 측정·실패 사례가 없다. 매체 비교 표(23~29행)와 UBI 스택(179행)은 MTD 문서 수준의 일반론이다. 13~19 구간 하단. |
| B | 13 | 매체 특성(19~33행) → 설계 항목(35~50행) → sizing(78~97행) → env(99~120행) → A/B(122~152행) → NAND BBT(154~175행) → UBI(177~214행) → eMMC hardware partition(216~280행) → 워크플로(282~294행) → 실수·정리(296~319행)로 흐름은 완성됐다. 173행 블록 범위, 232~240행 partconf 설정값과 확인 출력 불일치, 54~74행 fixed-partitions와 243행 GPT가 열려 있어 B ≤ 13. OTA staging은 91·306행에서 필수처럼 말하지만 54~74행 layout에 없다. |
| C | 7 | dts fixed-partitions(54~74행), U-Boot Kconfig(105~116행), ubinize.cfg와 명령(185~210행), mmc partconf(230~241행), genimage cfg(249~278행)가 있으나 대상 SoC·U-Boot·커널·mtd-utils 버전이 없다. 1.5배(84~90행)·5~10%(212행)·'4~10 MB이 일반'(42행)·RPMB '4~16 MB'(224행)로 C ≤ 8. 159~166행 dmesg는 블록 크기가 맞지 않아 관찰 결과로 쓸 수 없고 291행 prototype 검증은 합격·실패 관찰이 없다. |
| D | 8 | 비교한 글: 인접 `chapter27-chain-of-trust.md`·`chapter29-distro-boot.md`(주제 다름), 같은 시리즈 `chapter17-ab-update.md`·`chapter13-env-bootcmd.md`·`chapter10-storage-boot.md`, 다른 시리즈 `bsp/chapter17-image-packaging.md`·`buildroot/chapter16-ota.md`. 137행 A/B 공유 원칙 ↔ ch17 65행, 126~135행 표 ↔ ch17 312~322행. 105~118행 redundant env ↔ ch13 191~205행, buildroot ch16 353행. 230~241행 partconf ↔ ch10 139~152행, 177~214행 UBI ↔ ch10 187~205행. bsp ch17(제목 'Flash Layout·Partition·GPT 설계') A/B 69~81행, genimage 138~213행, fixed-partitions 266행, ubinize 291~295행(같은 '-m 2048 -p 128KiB') ↔ 54~74·249~278·185~210행. 307행 ↔ buildroot ch16 351행. |
| E | 7 | 제목 키워드 partition·NAND·eMMC·UBI는 78~97·154~175·216~280·177~214행에서 다루고 23~29행 표가 '비교'를 이행한다. description의 'OTA slot sizing'은 82~95행, 'NAND/eMMC/UBI 차이'는 214행에 있다. '양산 firmware의 설계'를 약속하면서 sizing 근거가 출처 없는 배수라 판단 기준이 약하다. |
| F | 5 | 323행 다음 편(Ch 29 Distro Boot)은 seriesOrder 29 `chapter29-distro-boot.md`와 맞는다. 327~329·331행 라벨은 대상 제목과 맞는다. 245행 '[Ch 27: chain of trust]에서 RPMB 활용을 다룹니다'와 330행 라벨 'Chain of trust와 RPMB — RPMB key·anti-rollback'은 대상 `chapter27-chain-of-trust.md`에 'RPMB'가 한 번도 없고 anti-rollback도 eFuse 카운터(241행)로만 설명한다. F ≤ 5. |
| G | 2 | 332~334행에 U-Boot env, Linux MTD, UBI 문서 링크가 있지만 끝에 모아 둔 것이라 95·212·224행 수치, 105~116행 Kconfig 이름과 연결되지 않는다. U-Boot·커널·mtd-utils 버전, 218행 'JEDEC 표준'의 판 번호, 대상 보드 표기가 없다. |

uncertainties:
- 173행 2048블록에서 'block 2044 ~ 2046 reserve, block 2046 ~ 2048 BBT'는 반열린 구간으로 읽으면 성립해 오류 확인에 넣지 않았다.
- 76행 '1 GB를 채웁니다'인데 54~74행 마지막 partition은 0x3E000000(992 MiB)에서 끝나고 0x320000~0x400000에 공백이 있다(산문 합계 표기).
- 232~240행 'mmc partconf 0 1 1 1' 뒤 확인 출력이 'PARTITION_ACCESS: 0x0'이다. ch10 148~152행은 같은 명령 뒤 'PARTITION_ACCESS = boot0'이다(다른 글과의 모순, U-Boot cmd/mmc.c 미확인).
- 54~74행 eMMC 노드 아래 'fixed-partitions'가 Linux mmc 드라이버에서 지원되는지 미확인. 243행 GPT와 offset 0 spl partition이 GPT 헤더 영역과 겹칠 수 있다.
- 114행 CONFIG_SYS_REDUNDAND_ENVIRONMENT가 현재 Kconfig 이름인지 미확인.
- 118행 flag 무효 처리 방식이 MMC 백엔드에도 맞는지 U-Boot env 소스로 확인하지 않았다.
- 192행 static volume에 vol_flags=autoresize가 허용되는지 미확인.
- 222~224행 boot0/boot1 '표준 크기 4 MB', RPMB '4~16 MB'가 JEDEC eMMC 표준과 맞는지 미확인.
- 95·212·290행 주장은 출처가 없다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `src/content/blog/embedded/bsp/chapter17-image-packaging.md`(A/B layout·fixed-partitions·ubinize·genimage 겹침)다. sizing rule 표(82~93행)와 설계 워크플로(284~294행)는 bsp ch17에 없어 다음 조치는 보강이다. 161~166행 dmesg를 한 장치 기준으로 고치고, 배수·overhead 수치를 1차 자료로 확인하거나 지우고, ch10·ch13·ch17·bsp ch17과 겹치는 설명은 링크로 대체하고, 245·330행 Ch27 RPMB 라벨을 고친다.

### `chapter29-distro-boot.md` — 54점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(b6dedf23 신규 작성, 620ab97b, ffe6517b 언어 태그, ac24bb76 제목 변경, fa55144d 링크 재매핑, be973200 topic 메타, 68525f0c 코드 펜스 산문 이동, 0a9dd7bc slug 고정)에 U-Boot 소스·문서나 syslinux 사양과 대조한 커밋이 없다. bf206362 'Fact-check bootloader network and DDR guidance'는 이 파일을 건드리지 않았다. 평가 중 1차 자료를 열지 않았다. 원문 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(83행 32MiB/1102ms=29.0MiB/s, 86행 64KiB/8ms=7.8MiB/s 일치, 99·121행 timeout 30=3초, 298·314행 timeout 50=5초 일치).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 내용은 네 표준화 경로 비교 표(33~40행), extlinux.conf와 boot.scr 차이 표(177~184행), 시나리오별 권장 표(279~286행), Raspberry Pi config.txt 경로(208~246행), extlinux 라벨 다중 부트(294~314행)다. bootflow scan -l 출력(190~202행)과 efidebug 블록(252~263행)은 ch14 44~54·152~162행을 거의 그대로 옮겼고 Distro Boot 설명(44~69행)은 ch13 140~175행과 겹친다. 선택 근거는 288·347행 '양쪽이 깨끗해집니다' 수준이고 실패 사례·측정이 없어 구간 하단. |
| B | 13 | 동기(21~40행) → 네 경로(42~273행) → 선택 표(275~288행) → 다중 부트(290~326행) → 흔한 실수(328~336행) → 정리(338~349행)로 문제 정의에서 결론까지 간다. 134행 'signed script' 제목, 326행 'scan -b는 첫 valid만'과 '두 번째로 자동 진행', 38행 '2022.10+' 등 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | mkimage 명령(149행), mkimage -l 출력(152~160행), extlinux.conf 전문(97~114행), bootflow scan -l(190~202행), 부트 로그(73~89행)가 있다. 보드·U-Boot 버전을 밝히지 않았고 80·83·86행 바이트 수·전송률, 273행 'i.MX 8M Plus EVK에 꽂으면 extlinux'는 환경·출처가 없어 C ≤ 8. 168행 boot.scr 로그가 83행과 같은 '33554432 bytes read in 1102 ms'를 되풀이하고 155행 Created 날짜가 글 날짜와 같아 1점 더 낮게 7. |
| D | 8 | 비교한 글: 인접 `chapter28-flash-layout.md`·`chapter30-bootloader-ci.md`(겹침 없음), 같은 시리즈 `chapter10-storage-boot.md`·`chapter13-env-bootcmd.md`·`chapter14-bootflow-bootmeth.md`, 다른 시리즈 `buildroot/chapter13-uboot-integration.md`·`modern-recipes/part7-02-uboot-usage.md`·`modern-recipes/part3-12-bootloader-chain.md`·`bsp/chapter08-kernel-config.md`. 252~263행 efidebug ↔ ch14 152~162행 글자 그대로. 190~202행 bootflow ↔ ch14 44~54행(같은 mmc@30b40000·ethernet@30be0000). 44~69행 ↔ ch13 140~175행. 138~150행 boot.cmd → mkimage ↔ ch10 382~392행, ch13 179~189행, buildroot ch13 160~176행, part7-02 86~97행. part3-12·bsp ch08은 한 줄 언급뿐. 네 표준 비교·선택 역할은 다른 글에 없다. |
| E | 7 | 제목 'extlinux·boot.scr 표준화 분석'과 description '차이와 선택'을 177~184·279~286행이 이행한다. Distro Boot(42~91행), extlinux(93~132행), boot.scr(134~184행)를 모두 다루고 Raspberry Pi(208~246행)·EFI(248~273행)도 주제 안이다. '분석'에 비해 선택 근거가 일반론이고(288행) 대상 독자를 밝히지 않았다. |
| F | 4 | 353행 다음 편 안내는 seriesOrder 30 `chapter30-bootloader-ci.md`와 맞는다. 357~360행(ch13·14·18·19)은 라벨과 맞는다. 314행 본문과 361행 'Ch 26: A/B 슬롯'은 `chapter26-ddr-training.md`로 간다(A/B 글은 `chapter17-ab-update.md`). 362행 'Buildroot Ch 8 — extlinux.conf가 들어가는 자리'의 대상 `buildroot/chapter08-filesystems.md`에는 extlinux가 0건이다. 틀린 곳이 둘(세 위치)이라 4. |
| G | 2 | 363행 U-Boot Standard Boot 문서, 364행 syslinux wiki 링크가 끝에 있고 44행에 include/config_distro_bootcmd.h 경로가 있다. 버전 표기는 38·344행 'U-Boot 2022.10+'뿐이고 로그의 버전·보드가 없다. 35행 'Stephen Warren (NVIDIA)', '2014~2022 주류', 132행 'Debian·Fedora·OpenSUSE 모두 extlinux'에는 출처가 없다. |

uncertainties:
- 134행 'boot.scr — signed script'와 136행 설명(legacy header의 magic·CRC)이 맞는지. buildroot ch13 162행은 'CRC는 무결성 확인용이지 cryptographic 서명이 아닙니다'라고 적었다(다른 글과의 모순, U-Boot image.h 미확인).
- 326행 'bootflow scan -b는 첫 valid만 부트'와 같은 문단의 '두 번째로 자동 진행'이 bootstd 동작과 어떻게 맞는지 미확인.
- 38·344행 'U-Boot 2022.10+'와 ch14 15행 '2023년 즈음', 18행 '2023.07부터'가 다르다.
- 35행 'Stephen Warren (NVIDIA)', '2014~2022 주류'는 출처가 없다.
- 132행 배포판별 기본 경로(EFI·GRUB 여부) 미확인. 같은 글 246·273행은 GRUB EFI 경로도 든다.
- 239행 'SoC ROM 안의 GPU firmware가 bootcode.bin → start.elf'가 224행 bcm2711(Pi 4)에도 같은지 미확인.
- 333행 'mkimage -A arm으로 만들면 U-Boot이 거부', 335행 'EFI bootmgr는 GPT partition type을 확인'은 소스 미확인.
- 71·330행 탐색 순서와 scan_dev_for_extlinux_conf의 두 prefix 시도를 config_distro_bootcmd.h와 대조하지 않았다.
- 73~89행 로그는 extlinux.conf 241바이트·label 하나·initrd 없음인데 97~114행 예시 파일은 label 둘·initrd·timeout 30이다. 80행 241B/4ms는 계산하면 약 58.8KiB/s인데 58.6KiB/s로 적었다.
- 155행 Created 날짜가 글 날짜(2026-05-19)와 같고 168행이 83행 로그를 되풀이한다. 실제 출력인지 밝히지 않았다.

병합 대상: 후보는 `src/content/blog/embedded/bootloader/chapter14-bootflow-bootmeth.md`(190~202행 ↔ 44~54행, 252~263행 ↔ 152~162행)와 `chapter13-env-bootcmd.md`(44~69행 ↔ 140~175행)다. 'extlinux.conf', 'boot.scr vs extlinux', 'distro boot'는 독립된 검색 의도가 있고 네 표준 비교·선택 표(33~40·279~286행)는 다른 글에 없어 병합하지 않고 다음 조치는 보강이다. ch13·ch14에서 옮긴 블록을 링크로 줄이고, 314·361행 링크를 `chapter17-ab-update.md`로 고치고, 362행은 buildroot에 extlinux 글이 없으므로(grep 0건) 라벨을 대상 내용(rootfs 이미지 포맷)에 맞추거나 지우고, 로그의 보드·U-Boot 버전을 밝히고, 134행 'signed' 표현을 확인한다.

### `chapter30-bootloader-ci.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건. ① 113행 '이 script가 검증하는 것은 DRAM training + driver probe + console init 통과'(QEMU virt 스크립트 88~111행) vs 23행 'DDR·clock·PMIC는 simulator로 못 재현'·119행 'QEMU로는 잡히지 않는 회귀 … 실제 DDR controller … real silicon에서만 드러납니다'. 같은 QEMU 테스트가 DRAM training을 검증하면서 DDR을 재현하지 못할 수는 없다. ② 32행 'ARMv8-A에서는 TF-A의 BL31과 옵션 OP-TEE가 함께 묶여야 부팅 가능한 image가 됩니다' vs 86행 'ARMv8-A U-Boot은 QEMU virt에서 -bios u-boot.bin 한 줄로 뜹니다'(52~54행 build:qemu_arm64도 TF-A 없이 U-Boot만 빌드). git log(0a9dd7bc, be973200, fa55144d 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | U-Boot·TF-A·OP-TEE를 `needs:` DAG로 묶은 GitLab 예(34~72행), `=>` 프롬프트 anchor로 기다리는 QEMU 테스트(88~111행)와 write 명령(`mw`, saveenv)을 피하는 이유(113행), 빌드 실패를 `exit 125`로 skip하는 bisect 스크립트(223~236행), `meta.json`을 함께 보관하는 아카이브(262~279행), ephemeral CI key와 HSM production key 분리(285~307행)는 이 글만의 구성이다. LAVA·runner 비교표(173~178행), CI 플랫폼 표(319~325행)는 일반론이고 +2%·+100 ms 임계(208~215·315행)와 보관 기간(251행)은 출처 없는 운영 기준이다. |
| B | 12 | matrix → QEMU → 실 보드 farm → regression → bisect → archive → secure boot 흐름(28행 예고대로)이 끝까지 간다. 130·161·270행의 `flash.bin`을 만드는 job이 38~69행 어디에도 없고 `build:imx8mp`는 TF-A·OP-TEE를 `needs:`로 받기만 하고 묶는 단계가 없다(56~59행). 113행 vs 23·119행, 32행 vs 86행 모순과 불확실이 열려 있어 B ≤ 13. |
| C | 7 | QEMU 테스트(88~111행, PASS/FAIL 구분), regression 검사(193~204행), bisect 스크립트(223~234행)는 실행 가능하다. U-Boot·QEMU·TF-A·OP-TEE 버전과 환경이 없고 `size` 출력(185~188행)·bisect 출력(239~245행)·크기 표(253~260행)·임계 표(208~215행)는 출처·환경 없는 수치라 C ≤ 8. `flash.bin` 생성 단계가 빠져 실 보드 경로(121~169행)를 재현할 수 없어 1점 더 뺐다. |
| D | 10 | 인접 `chapter29-distro-boot.md`·`chapter31-tfa-bl31-runtime.md`는 주제가 달라 겹치지 않는다. 다른 시리즈와 겹침: `buildroot/chapter19-cicd.md` 289~297행 matrix 표 + '2 × 3 × 5 = 30 job … queue가 깁니다' ↔ 74~82행 같은 틀. `bsp/chapter20-production.md` 144~187행(lava-tool submit, runner label routing)·197~222행(HSM, YubiHSM) ↔ 117~143·171·285~307행. `tools/emulation/qemu-embedded/chapter20-ci-matrix.md`(draft) 274~305행 LAVA·`git bisect run` ↔ 117~143·223~240행. U-Boot 프롬프트 anchor, TF-A/OP-TEE DAG, SPL size metric은 부트로더 고유라 역할은 구별된다. |
| E | 8 | 제목의 'build matrix'(30~82행)와 '자동 부팅 테스트'(84~178행), description의 'QEMU·real board에서 boot까지'가 본문과 맞는다. description의 '여러 보드의 U-Boot/TF-A'는 qemu_arm64·imx8mp 두 보드뿐이고 TF-A 결합 단계가 없어(56~69행) 부분 미이행이며 113행이 QEMU 테스트 범위를 과장한다. |
| F | 4 | 217·361행 'Ch 25: 부트 시간 측정'은 `chapter25-tfa-optee.md`(TF-A 통합)로 가며 timestamp·bootstage 내용이 없다. 115·360행은 Ch 22에서 '로그 anchor 기반 검증'을 봤다는데 `chapter22-debugging.md`에 anchor 내용이 없고 360행 라벨 'JTAG·printk·boot log'도 실제 제목과 다르다. 329~343행 '시리즈 마무리'·'30장을 통해'는 seriesOrder 31(`chapter31-tfa-bl31-runtime.md`, 공개)~37이 있는 사실과 맞지 않고 다음 편 안내가 없다. 335·340행 'BSP Engineering'은 실제 'BSP Development'이고 339행 'Linux Kernel Internals'는 링크가 없다. F ≤ 5. |
| G | 2 | 364~365행 LAVA 문서와 U-Boot test/py 문서 링크가 본문 주장(121~141행 LAVA job 키, 86행 `-bios` 부팅)과 연결되지 않는다. U-Boot·TF-A·OP-TEE·QEMU 버전이 없고 40행 `bootloader-builder:2026.02`는 가상 레지스트리 이름이다. |

uncertainties:
- 25행 'debug ELF 50 ~ 100 MB'와 256행 '30 ~ 80 MB'가 다르나 범위가 겹쳐 모순으로 단정하지 않았다.
- SPL 경로가 45행 `size u-boot u-boot-spl`, 49행 `u-boot/spl/u-boot-spl.bin`, 185행 `u-boot-spl/u-boot-spl`로 세 가지다. 실제 빌드 트리 경로 미확인.
- 212행 boot time 기준 '첫 printk timestamp'가 U-Boot에서 무엇을 뜻하는지 불명확하다.
- 63행 TF-A `PLAT=imx8mp`, 68행 OP-TEE `PLATFORM=imx-mx8mpevk`와 64·69행 산출물 경로 미확인.
- 128~135행 LAVA job의 `deploy: to: usb`, `os: u-boot`, `boot: method: u-boot` 조합이 LAVA 문서와 맞는지 미확인.
- 294~303행 Vault transit 키 `ephemeral-ci-${SHA}`를 만드는 단계가 없고 서명 입력이 이미지가 아니라 sha256sum 텍스트 파일이다.
- 354행 '흔한 함정 … 다섯'인데 311~317행에는 일곱 개가 있다(산문 개수 실수).
- 201행 메시지 'u-boot.bin text'는 실제로 ELF `u-boot`의 text(185~187행)를 잰다.
- 50행 `expire_in: 1 year`가 모든 build job에 걸리는데 314행은 PR artifact 14일 retention을 권한다.
- 182·251·315행 운영 기준과 247행 '256 commit을 한 시간 안에'는 출처가 없다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(58점) 기준 병합 대상 없음. `buildroot/chapter19-cicd.md`와 `bsp/chapter20-production.md`는 rootfs·BSP 양산 범위이고 U-Boot 프롬프트 anchor·SPL size metric·TF-A/OP-TEE DAG는 거기에 없다. 다음 조치는 보강이다. 113행 QEMU 검증 범위를 console·driver model까지로 좁히고, 32행 vs 86행 전제(실 SoC는 TF-A 필요, QEMU virt는 단독 부팅 가능)를 밝히고, `flash.bin` 생성 단계를 넣고, 115·217·360·361행 라벨을 고치고, 329~343행 '시리즈 마무리'를 Ch31 다음 편 안내로 바꾸고, 74~82행 matrix 틀을 차별화한다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** ch21·ch22는 5534938b, ch23~30은 b6dedf23 일괄 작성 뒤 제목·링크·메타데이터·코드 블록 정리 커밋뿐이다. 유일한 'Fact-check' 커밋 bf206362는 ch26(과 ch11)만 건드렸고 본문·출처 없이 37·41·51행을 완곡하게 바꿨다. `factcheck: 검증됨`은 0편, 8편은 원문 내부 모순으로 오류 확인이다. 루프 01과 합쳐 Bootloader Internals는 `/fact-check-round` 대상이다.
- **'시리즈 마지막' 표기가 확장 뒤 갱신되지 않음 (3편).** ch21 392행 '다음 장이 시리즈 마지막', ch22 13행 '이 시리즈의 마지막'·309행 '22편'·311~317행 장 요약, ch30 329~343행 '시리즈 마무리'·'30장을 통해'. 실제 공개 장은 ch37까지이고 ch22 → ch23, ch30 → ch31 다음 편 안내가 없다. 허브(chapter01)와 마지막 글(chapter37)의 편수 표기도 함께 점검해야 한다.
- **관련 항목 라벨이 대상 글 제목·내용과 다름 (10편 전부).** ch21 398행(BSP Ch 6 → bsp ch01), ch22 362행(debug.rst ↔ usage/index.html), ch23 292행(buildroot ch18에 secure boot 없음), ch24 342·351행(ch25에 SPL/BL2 패턴 없음), ch25 373·374행(Ch 23 Secure Boot → bootrom 글, Ch 24 HAB → spl 글), ch26 370행(ch24에 DDR blob 없음), ch27 316행(RM 라벨 → AN4581), ch28 245·330행(ch27에 RPMB 없음), ch29 314·361행(Ch 26 A/B → DDR 글)·362행(buildroot ch08에 extlinux 없음), ch30 217·361행(Ch 25 부트 시간 → TF-A 글)·115·360행(ch22에 anchor 없음). fa55144d가 장 번호로만 대상을 다시 매핑하고 라벨을 남긴 패턴으로 보이며, 10편 모두 F ≤ 5의 원인이다. ch27 310~315행처럼 옛 'Ch N: …' 라벨이 남은 글도 있다.
- **1차 출처가 본문 주장에 붙지 않고 관련 항목 끝 링크로만 있음, 버전 없음 (10편 전부).** ch21 399행, ch22 362행, ch23 293~294행, ch24 353행, ch25 377~379행, ch26 372행, ch27 316~318행, ch28 332~334행, ch29 363~364행, ch30 364~365행. G가 10편 모두 1~2점인 공통 원인이다. U-Boot·TF-A·OP-TEE 버전·태그가 본문에 없고 U-Boot가 `data/upstream-tracking.yaml`에 없어 ③⑥ 자동화가 이 시리즈를 보지 않는다.
- **출처·측정 환경 없는 구체 수치와 실측인지 알 수 없는 예시 출력 (10편 전부, C ≤ 8 상한 반복).** ch21 253·317·333·338행, ch22 244행, ch23 34·35·269행·104~108행 자리표시 값, ch24 31~37·80·248행, ch25 74·78·79·177행, ch26 105·111~121·183·259·278행, ch27 23·104행, ch28 42·84~95·212·224행, ch29 80~86행·155·168행, ch30 185~188·208~215·239~260행.
- **예시 출력·메모리 맵 안의 산술 모순 (5편).** ch22 66~75·94·217행(bdinfo DRAM 범위 밖 주소), ch24 103~107행(TEXT_BASE = BSS_START), ch25 74~75·79~80·90행(칸 크기와 표기 크기), ch28 161~165행(eraseblock 크기·장치 크기), ch23 36·40행(ROM base = OCRAM 주소). 같은 시기에 쓴 다른 장의 주소·크기 예시도 산술 대조가 필요하다.
- **공개 글에 남은 TikZ TODO 주석 (3편).** ch23 31행, ch24 63행, ch25 45행(루프 01의 ch02 277행·ch04 272행 포함). bsp ch07 29행, buildroot ch13 273행에도 같은 패턴이 있다.
- **같은 내용이 시리즈 안팎에서 반복 (D 감점, 10편 전부).** i.MX8M 포팅·첫 부팅(ch21 ↔ bsp ch06·ch10), 디버깅 명령(ch22 ↔ bsp ch06·ch11), RoT·SRK·anti-rollback(ch23·ch27 ↔ ch16·embedded-security ch02·bsp ch20), SPL 설명(ch24 ↔ ch04·ch05·ch07·ch22), BL31·PSCI(ch25 ↔ ch31·ch32·bsp ch07), DDR training(ch26 ↔ ch09·bsp ch05), partconf·redundant env·A/B(ch28 ↔ ch10·ch13·ch17·bsp ch17), bootflow·efidebug(ch29 ↔ ch13·ch14), CI matrix·LAVA(ch30 ↔ buildroot ch19·bsp ch20). 시리즈 간 역할 분담 정리가 필요하다.
- **같은 주제에서 글 사이 사실 충돌 (6편 관련).** i.MX fuse bank/word 주소(ch23 61~62·123행 vs ch10 364~371행 vs embedded-security ch02 218행), anti-rollback 비교 방향(ch27 241행만 반대), Falcon 단축 폭(ch24 248·336행 vs ch05 15·28·30·372행), ZQ 저항 오류 결과(ch26 213행 vs ch09 404행), PHY training 시작 레지스터(ch26 70~73행 vs ch09 300행), i.MX 8MP 부트 경로·BL31 위치(ch25 78·250~263행 vs ch02 30~34행·bsp ch07 131·151행), partconf 확인 출력(ch28 240행 vs ch10 152행), DEBUG_UART 드라이버(ch22 26행 vs bsp ch06 159행), SRAM 크기(ch23 284행 vs ch24 17·34행). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 1차 자료로 한 번에 정한다.
- **공통 H2 뼈대 (b6dedf23 8편).** '한 줄 요약 → 본문 → 흔한 실수 → 정리 → 다음 편(다음 장 예고) → 관련 항목'이 ch23~30에 같은 순서로 있다(예: ch24 13·311·327·340·345행, ch28 15·296·309·321·325행). 시리즈 37편 모두 '## 한 줄 요약'으로 시작한다. 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 8편은 원문 내부 모순부터 고친다. ch26(3건: 94·99/197·162행), ch24(103~107행 config vs linker script, 66·67·72행 SPL 위치, 248·336행), ch30(113 vs 23·119행, 32 vs 86행), ch25(74·79·90행 메모리 맵), ch28(161~165행 dmesg), ch22(66~75·94·217행 bdinfo, 177·184행 gdb), ch23(36·40행 ROM/OCRAM), ch27(241행 부등호). 각 글의 1차 자료(IMX8MPRM, JESD79-4·JESD209-4, U-Boot 태그 고정 소스, TF-A plat/imx8mp, NXP AN4581)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 관련 항목 라벨을 대상 파일 제목·본문과 대조해 고친다(ch21 398, ch22 362, ch23 292, ch24 342·351, ch25 373·374, ch26 370, ch27 316, ch28 245·330, ch29 314·361·362, ch30 115·217·360·361행). '시리즈 마지막' 표기(ch21 392, ch22 13·309·311~317, ch30 329~343행)는 다음 편 안내로 바꾼다. F 감점 원인이라 다시 채점할 때 바로 반영된다.
- 병합 검토 2편: ch21은 `bsp/chapter06-u-boot-porting.md`와의 병합 또는 차별화를 사용자가 결정한다. ch29는 보강(ch13·ch14 블록을 링크로 줄이고 링크 수정).
- 시리즈 단위로 기준 U-Boot·TF-A 버전을 정하고 `data/upstream-tracking.yaml` 등록 여부를 사용자가 결정한다.
- '글 사이 사실 충돌' 아홉 건과 루프 01의 일곱 건은 Bootloader Internals `/fact-check-round`에서 한 번에 정한다.
- TikZ TODO 주석·라벨 재매핑 문제는 시리즈 나머지(ch31~37)와 bsp·buildroot에도 있는지 grep으로 센 뒤 다음 루프 채점에 반영한다.
