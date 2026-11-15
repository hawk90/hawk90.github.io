# 공개 글 AdSense 평가 — 루프 08

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-08.md) · [재검토 기록](double-check-loop-08.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-19. 기준은 rubric v1.2·anchors·antipatterns. 대상10편 원문 전문을 직접 읽고 아래 D 양쪽 구간과 내부 링크의 title/slug/seriesOrder/draft 및 후행 설명을 확인했다. 이전보고서 인용의 정확한 부분은 전문 확인 후 활용했다. Luna 초벌 파일 double-check-evidence-08.md는 존재하지 않아 이번10편은 Sol이 직접 최종 검토했다. 본문·기존 보고서·사용자 package.json 변경은 수정하지 않았다.

앵커는 앞선15 검토에서 git show 10550ca1의 옛경로 원문을 읽은 UART49(10/11/6/11/5/5/1), ISR40(10/8/4/8/6/3/1), Build50(9/10/8/10/4/7/2)를 사용한다. 현재 Recipes 수정본을 역사 앵커로 대체하지 않는다. 현대 Recipes는 D 비교에 허용된다. D에 사용한 Recipes3편·BSP·Bootloader·CMake 비교글은 git diff ba9f7104 대비 변경이 없었다. D점수는 유지하며 범주/뼈대의 유사성만으로 중복을 늘리지 않았다.

공통 check/build/내부 링크/ads/sitemap/앵커/reading 검사는 [double-check-gates-2026-10-18.md](double-check-gates-2026-10-18.md)를 참조한다. 이는 기술 정확성·모바일 렌더 검증을 대신하지 않는다. 이번 전체 SDK/보드 이미지 빌드와 RAUC 설치는 실행하지 않았다. 전편 잠정·confidence 중간이며 열린 불확실로 B≤13, 출처·환경 없는 수치로 C≤8을 유지한다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `buildroot/chapter13-uboot-integration.md` | 12 | 11 | 7 | 11 | 7 | 5 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter14-build-caching.md` | 13 | 11 | 7 | 10 | 7 | 5 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter15-post-build-deep.md` | 13 | 12 | 6 | 8 | 7 | 4 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter16-ota.md` | 15 | 13 | 7 | 7 | 7 | 4 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter17-sdk.md` | 13 | 13 | 7 | 12 | 8 | 5 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter18-security-cve.md` | 14 | 12 | 7 | 11 | 8 | 5 | 2 | **59** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter19-cicd.md` | 13 | 13 | 7 | 10 | 8 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `buildroot/chapter20-yocto-migration.md` | 14 | 13 | 7 | 9 | 7 | 4 | 2 | **56** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter01-intro.md` | 11 | 13 | 7 | 10 | 7 | 7 | 2 | **57** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter02-language.md` | 11 | 12 | 8 | 11 | 7 | 7 | 3 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계566, 평균56.6, 범위52~60. 이전566 대비0. 우선조치7편·병합검토3편;오류확인7·미검증3. 전편잠정.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `buildroot/chapter13-uboot-integration.md` | 55 | 55 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter14-build-caching.md` | 55 | 55 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter15-post-build-deep.md` | 52 | 52 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter16-ota.md` | 55 | 55 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter17-sdk.md` | 60 | 60 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter18-security-cve.md` | 59 | 59 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 미검증 유지(신규 SSH gate 철회) |
| `buildroot/chapter19-cicd.md` | 58 | 58 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |
| `buildroot/chapter20-yocto-migration.md` | 56 | 56 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 미검증 유지 |
| `cmake/chapter01-intro.md` | 57 | 57 | +0 | 병합 검토 | 병합 검토 | A~G 점수 동의; 미검증 유지 |
| `cmake/chapter02-language.md` | 59 | 59 | +0 | 우선 조치 | 우선 조치 | 점수동의;오류·D/F근거범위교정 |

## 검증 기록과 이전 근거의 채택·기각

- [Buildroot 2026.08 manual](https://buildroot.org/downloads/manual/manual.text), revision d5180309b1, §8.2·8.13·8.14.1·25를 직접 열었다. post-image는 [공식 upstream 문서](https://raw.githubusercontent.com/buildroot/buildroot/master/docs/manual/customize-post-image.adoc), SDK는 [공식 toolchain 문서](https://raw.githubusercontent.com/buildroot/buildroot/master/docs/manual/using-buildroot-toolchain.adoc)도 대조했다. BR15의 인자/uid/gid/capability 오류와BR19의SDK경로 오류를 채택한다.
- BR18의 신규 SSH gate는 재검토 후 철회한다. [Buildroot 2024.02 system/Config.in](https://raw.githubusercontent.com/buildroot/buildroot/2024.02/system/Config.in)287~317행의 빈 password는 로컬 계정 값이며 SSH 서버의 허용 정책을 대신하지 않는다. 같은 릴리스의 [dropbear.mk](https://raw.githubusercontent.com/buildroot/buildroot/2024.02/package/dropbear/dropbear.mk)5행은 Dropbear2022.83을 선택한다. 그 판의 [svr-authpasswd.c](https://raw.githubusercontent.com/mkj/dropbear/DROPBEAR_2022.83/svr-authpasswd.c)92~98행은 빈 password를 거부하고 [svr-runopts.c](https://raw.githubusercontent.com/mkj/dropbear/DROPBEAR_2022.83/svr-runopts.c)76~80/155~158행은 allowblankpass=0 기본값과 -B 허용 옵션을 정의한다. [Buildroot S50dropbear](https://raw.githubusercontent.com/buildroot/buildroot/2024.02/package/dropbear/S50dropbear)5/8/28~29행은 사용자 /etc/default/dropbear 값을 읽고 기본 -R만 더하며 -B를 기본 주입하지 않는다. 따라서 본문의 기본 비PAM Dropbear SSH에서 빈 비밀번호 거부와 콘솔 passwordless root는 양립한다. 해시 사용 권고와 plain 입력 허용 계약도 양립하며 $6$...는 생략 예시다. 이 둘을 대체 오류 gate로 삼지 않는다. PAM/사용자 override/실제 기기 전체 동작은 열려 있어 검증됨으로 올리지 않는다. 최신 SBOM 직접 출력 기능도 판 차이로 남긴다.
- BR13은 [U-Boot v2025.01 env/Kconfig](https://raw.githubusercontent.com/u-boot/u-boot/v2025.01/env/Kconfig)와 [Linux MMC core](https://raw.githubusercontent.com/torvalds/linux/master/drivers/mmc/core/mmc.c)430~436행, [공식 partition 문서](https://raw.githubusercontent.com/torvalds/linux/master/Documentation/driver-api/mmc/mmc-dev-parts.rst)를 대조했다. 부트 영역 numbering을 확인해 약한 서명용어 추론을 새 gate로 교체했다.
- CMake는4.4.4 `--help-policy CMP0135`, `--help-command if` 및 [공식 CMP0135](https://cmake.org/cmake/help/latest/policy/CMP0135.html)를 대조했다. `/private/tmp/adsense-loop08-probe.cmake` 실행 결과는 PATH 한항목,OFF=false,IS_EQUAL=1,SYSROOT빈값. archive 프로브(`/private/tmp/adsense-loop08-sdk-myproduct-v1.4.2.tar.gz`)는 파일명 변경과 내부경로를 분리한다. OTA 분기는 두 상태를 직접 재생했다. 전체 SDK/RAUC/임베디드보드 실행은 아니다.
- BR14의 요약/조건부 설명과 toolchain차이만의 모순, BR15의 data 초기화 의도, BR17의 CC 출력예 차이, CMake02 TRUE/1의 논리동치 등은 기존처럼 모두 독립 오류로 세지 않는다. 오류상태는 각각 더 강한 공식 계약/실행근거로 유지한다.
- F에서 실제 후행 기능약속 불이행은 유지하되 구제목의 요약라벨차이는 감점근거에서 뺐다. BR14의 per-package 링크는 공식parallel-build절에서 실제 다뤄져 대상오안내 근거는 철회했다. 점수5상한은 별도377행없는hit-rate설명 약속으로 유지한다.
- Luna 초벌은 없으므로 채택/기각은 기존 published-loop-08의 판단에 대한 것이다. A~G점수10/10동의, 판정10/10동의. BR18 신규 gate는 인증 계층 혼동을 바로잡아 철회했다. 모든불확실이닫혔다는의미가아니다.

## 글별 근거

### `buildroot/chapter13-uboot-integration.md`

source_file: `src/content/blog/embedded/buildroot/chapter13-uboot-integration.md`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. 213행 CONFIG_SYS_MMC_ENV_PART=1은 첫 eMMC boot partition인데 238~239행 fw_env.config는 mmcblk0boot1(둘째)을 지정한다. 같은 환경을 맞춘다는219행 요구와 어긋남을 U-Boot v2025.01 env/Kconfig 192~201행과 Linux mmc.c 430~436행의 idx=0부터 boot%d 생성 및 공식 MMC device-partitions 문서로 확인했다. 기존162/315행 cryptographic 서명과191행 서명·CRC는 magic/header 의미 차이가 가능해 이 표현 쌍만을 오류 확정 근거로 삼지 않는다.

uncertainties:
- 213행 CONFIG_SYS_MMC_ENV_PART=1('boot partition 1')과 238~239행 /dev/mmcblk0boot1의 대응(hwpart 1 = mmcblk0boot0인지)을 U-Boot 문서로 확인하지 않았다(기억에 근거한 의심).
- 227~230행 libubootenv '권장 — newer, FIT 지원', BR2_PACKAGE_UBOOT_TOOLS_FW_PRINTENV 심볼, 223행 'BusyBox의 fw_printenv/fw_setenv'는 Buildroot·BusyBox 소스로 확인하지 않았다.
- 145행 u-boot.sb를 'Freescale/NXP Vybrid'라 했는데 i.MX23/28 형식일 가능성이 있다.
- 141행 'SPL'과 291행 'u-boot-spl.bin' 중 어느 쪽이 맞는지 확인하지 않았다.
- 271행 SPL 32~128 KB는 `bootloader/chapter24-spl-deep.md` 16·22행 '32~256 KB'와 다르다(다른 글과의 차이).
- 250행 '<num-sectors> NAND에서만', 307행 'mmcblk0boot1은 보통 read-only'는 확인하지 않았다.
- `chapter16-ota.md` 249행 'Buildroot가 자동으로 /etc/fw_env.config를 만든다'와 이 글의 관계는 확인하지 않았다.
- 150~153행 ls 출력은 51행 am335x 설정으로는 나오기 어려운 조합이라 합성 예일 가능성이 있다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 것은 Buildroot 설정 심볼 표(27~43행)와 U-Boot env 값과 fw_env.config를 맞춰야 한다는 관점이다(219행, 297행 offset 불일치 사고, 252행 redundant 한 줄 사고). Source 4가지(63~91행), defconfig·fragment(93~130행), 산출물 표(136~145행), SPL 2단계(267~282행)는 매뉴얼·U-Boot 문서의 일반 설명 수준이다. 91·301·305행은 구체 기준 자리에 놓인 일반론이다. 재현 로그가 없어 6~12 구간 위쪽. |
| B | 11 | 27~43/47~58행 통합 심볼·소스·defconfig·산출물·boot.scr·env·SPL로 흐름은 완성.273행 TODO와예제 보드 혼합 및213/238행 실제 partition 불일치가 있어11. 서명 용어 두 뜻 가능성과 산문 개수는 별개 불확실이며 그 자체 정확성 gate가 아니다. |
| C | 7 | 설정 조각(47~58, 85~89, 119~127, 210~217행), fw_env.config 예(235~240행), fw_printenv·fw_setenv 예(256~263행)가 있다. 실행 보드·Buildroot 버전·실행 결과는 없고 예제 보드가 섞였다. 271행 'SPL 32~128 KB'·'main U-Boot 500 KB~1 MB', 322행 '30 ~ 50분짜리 재빌드'는 출처·환경 없는 수치라 C ≤ 8. 함정 절(297~307행)은 증상만 있고 확인 절차가 없다. |
| D | 11 | 이글199~206행 env 표 ↔ bootloader/chapter13-env-bootcmd.md25~32행,235~240행 fw_env ↔ bsp/chapter18-ota-recovery.md86~94행·Buildroot16 251~255행,267~282행 SPL ↔ bootloader/chapter24-spl-deep.md14~36행,110~130행 fragment ↔ Buildroot12 142~156행을 직접 대조. Buildroot 심볼/통합 위치는 별도라11. |
| E | 7 | 제목 '빌드·env·fw_env 흐름'과 description의 빌드·패키징·env·fw_env.config 접근은 23~156·195~219·221~265행이 다룬다. 대상 보드·독자 수준이 없고 예제 보드가 섞여 6~8 구간. |
| F | 5 | 322행 다음 편 'Ch 14: 빌드 캐싱'은 seriesOrder 14 `chapter14-build-caching.md`와 맞고 327~330행 Ch 7·11·12·16 라벨도 맞다. 331행 'Bootloader 시리즈 Ch 18: U-Boot env in flash'는 `bootloader/chapter18-efi-in-uboot.md`(EFI 호환)로 가는 틀린 링크라 F ≤ 5다(맞는 대상은 `bootloader/chapter13-env-bootcmd.md`). 327행 Ch 7 설명 'boot.cmd, fw_env.config 배치'는 ch07 본문에서 찾지 못했다. 전제 지식 안내가 없다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 332~333행 Buildroot Manual §17·U-Boot Documentation 링크는 문서 끝에 모은 것이라 개별 주장과 연결되지 않는다. 버전은 예시 값 U-Boot 2024.04(50·88행)뿐이고 Buildroot 릴리스·대조 시점이 없다. 0b676f7e의 대조는 커밋 본문에만 있다. |

병합 대상: env/SPL 공통절은 bootloader13/24;Buildroot 통합 글은 유지. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter14-build-caching.md`

source_file: `src/content/blog/embedded/buildroot/chapter14-build-caching.md`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. 기존15행 단정 대208/218행 조건부 설명은 요약의 과장과 조건 차이로 분리하고,144/153행 hash 대302행 다른 toolchain도 같은 실행파일 내용일 가능성이 있어 독립 확정 근거에서 제외한다. 대신23~25행 defconfig 변경 시 영향 패키지만 재빌드한다는 자동 추적 기대와294~295행 config toggle 재빌드 범위를 Buildroot 2026.08 manual §8.2의1108~1115·1121~1129행과 대조했다. 패키지 옵션/의존성 변경을 자동으로 추적해 재빌드하지 않으며 명시적 재빌드가 필요하다. 단순한 예상 시간 차이와 다른 기술 동작이다.

uncertainties:
- 116·157·160~161·355행 `BR2_CCACHE_SIZE`가 Buildroot Kconfig에 실제로 있는지 미확인(117행 BR2_CCACHE_INITIAL_SETUP로 준다는 기억은 1차 자료 미확인).
- 153행 'Buildroot가 기본으로 CCACHE_COMPILERCHECK=content를 켠다'와 144행 전제는 toolchain wrapper·ccache 문서로 미확인.
- 120행 BR2_CCACHE가 host·cross toolchain 모두의 wrapper를 바꾼다는 범위 미확인.
- 52·55·58행은 `.hash`가 dl/ 안에 있다고 그리지만 70행은 package/openssl/openssl.hash를 보여 준다. 실제 위치 미확인.
- 75행 'hash가 다르면 재다운로드'가 실패인지 재다운로드인지 미확인.
- 215행 per-package가 병렬 빌드 race를 막는다는 설명이 매뉴얼 전제와 같은 뜻인지 미확인.
- 261행 awk 의미 판단은 코드 해석이라 오류 확인에 넣지 않았다.
- 276행 `BR2_TIME_TAR_GZ`, 284행 `br2-builds`의 존재 미확인. 381~382행 §8.13·§8.14 절 번호 미확인.
- 233행 '수 분'과 297~300행 '30-50분' 사이 긴장. toolchain 재빌드 포함 여부를 글이 밝히지 않는다.
- 308행 '30분 → 5분 이하'는 313행 '1.5~3배'로는 10분 이상이 된다. dl·output 효과를 더한 수치인지 밝히지 않았다.
- 214행 '양산 빌드에 per-package 켬'과 314·366행 'CI에서는 OFF'의 관계를 정하지 않는다.
- 137행 hit rate 80% 기준과 `chapter19-cicd.md` 258·372행 '목표 50~70%'가 다르다(다른 글과의 모순).
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 계층별 '무엇을 캐싱/언제 무효화/공유 범위' 표(34~38행), per-package를 reproducibility 도구로 규정한 절(210~218행), sstate를 넣지 않은 이유(224~235행), 변경 유형별 재빌드 범위 표(290~300행)가 이 글의 관점이다. 226~228행 sstate 이유는 출처 없는 추론이고 290~300행 시간·137행 hit rate 80% 기준은 근거가 없다. 15행 요약이 본문 결론(218·352행)과 어긋난다. 13~19 하단. |
| B | 11 | 30~42행 계층→44~164행 dl/ccache→166~235행 per-package/sstate→237~304행 측정/변경→306~367행 CI/정리.276행 제목과 내용 불일치 및23~25/294~295행 재빌드 추적 설명 오류로11.15행 단정과208/218행 조건 차이는 gate 대신 설명 정합성 감점. |
| C | 7 | Kconfig 줄(81~85·113~118·178~180행), `ccache -s` 출력(124~135행, 85.08%로 산술은 맞음), `time make` 출력(245~251행), GitHub Actions YAML(319~342행)이 있다. 버전·보드·호스트 사양이 없고 206~207행 '10-20% 증가·2-3배', 107행 '1~5 GB', 290~300행 시간 표, 313행 '1.5~3배'는 출처 없는 수치라 C ≤ 8. 261행 awk는 저장된 로그에 현재 시각을 찍어 274행이 약속한 단계별 시간을 내지 못해 7. |
| D | 10 | 이글319~344행 actions/cache ↔ Buildroot19 157~170행,89~105행 dl ↔19 193~242행,122~164행 ccache ↔19 244~264행. 다른 시리즈 Recipes part7-05-kernel-build.md156~177행·part7-14-rootfs-buildroot.md204~205/237행은 개관만 공유한다.166~235행 격리/sstate 역할이 남아10. |
| E | 7 | 제목의 dl·ccache·per-package는 44·109·166행 절이, description의 'sstate가 없는 이유'는 220~235행이 다룬다. '분석'에 비해 무효화 시점(36~38행)을 코드·매뉴얼로 추적하지 않고 276행 절 제목이 내용과 달라 9 이상은 아니다. |
| F | 5 | 371행다음15와376/378~380행대상title/order/draft맞음.377행후행ccache hit rate영향은Buildroot11전문검색에서ccache없어약속불이행으로5.382행top-level-parallel-build앵커는공식manual8.13 1510~1528행실제로per-package를다뤄서잘못된대상이라는기존근거는기각;절번호8.14만어긋난다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 매뉴얼 링크(381~382행)는 관련 항목 목록에만 있고 본문 주장(120·153·157·200행)과 연결되지 않는다. 예시 패키지 버전(51~58행)은 있지만 대상 Buildroot 릴리스와 ccache 버전이 없다. |

병합 대상: cache CI 예는 Buildroot19. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter15-post-build-deep.md`

source_file: `src/content/blog/embedded/buildroot/chapter15-post-build-deep.md`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. Buildroot 공식 post-image 문서13~27행에 SCRIPT는 공백 구분 스크립트 목록이고 첫 인자는 images 경로, 추가 인자는 POST_SCRIPT_ARGS/POST_IMAGE_SCRIPT_ARGS다. 원문52행 SCRIPT 뒤 extra-arg가 $1이라는 설명은 틀렸다. manual2026.08 §25 8197~8212·8241~8265행으로107행 uid/gid 이름 사용 불가,105행 symlink l 지원,119/297행 capabilities 처리 불가 결론도 재확인했다. device table은 이름 및 capability xattr를 지원한다.255행 data를 다시 포맷하는 예는 의도된 data 초기화로도 읽혀 그 사실만으로 A/B 내부 오류를 더하지 않는다.

uncertainties:
- 대조한 매뉴얼은 2026.08판이고 글 날짜는 2026-05-19다. uid/gid 이름, POST_SCRIPT_ARGS, xattr 지원이 작성 시점 판에도 같았는지 확인하지 않았다.
- 88행 device_table_dev.txt 적용은 정적 /dev 선택 시에만 참이다(조건 누락).
- 121·136행 'post-image에서 setcap·setfiles'와 28·44·308행 'TARGET_DIR 수정 무의미'는 대상이 불분명해 설명 부족으로만 본다.
- 29·45행 'post-build 시점 BINARIES_DIR은 비어 있음'은 실제 빌드 순서와 대조하지 않았다.
- 40·309행 '환경 변수 7개': 매뉴얼 9.7 목록에는 BR2_EXTERNAL이 없고 CONFIG_DIR·BASE_DIR 등이 있다. 264행 `${BR2_EXTERNAL}` 정의 여부 미확인.
- 132행 'ext4 path는 보통 genext2fs', 80행 'overlay 소유권은 항상 root:root', 125행 'fakeroot가 xattr을 흉내냄'은 확인하지 않았다.
- `chapter07-board-customize.md` 176·330행은 BR2_ROOTFS_POST_SCRIPT_ARGS와 $1=BINARIES_DIR을 쓰는데 이 글 52행은 다른 메커니즘을 쓴다(매뉴얼상 ch07이 맞음, 다른 글과의 모순).
- 19행 '트러블 슈팅의 9할'은 출처가 없다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 세 hook을 권한·디렉터리·시점으로 나눈 표(25~34행), fakeroot 한계 절(113~136행), post-image 서명 예(261~284행), 증상·원인·해결 표(290~301행)다. 핵심 결론 'capabilities는 fakeroot로 불가하니 systemd로'(119·297·303행)가 매뉴얼 25장의 xattr 기능과 어긋나고, 132행 '확인해야 합니다'는 완곡 표현이다. 독립 관점은 있으나 확인 오류가 핵심 선택 기준을 약하게 한다. |
| B | 12 | 17~34행 시점·권한부터38/65/86/113/138/185/257행 절을 거쳐305~314행 정리까지 완성.52/105/107/119행 공식 계약 오류·미실행 예외가 열려12.255행의 data 초기화 문장을 독립적인 기술 모순으로 세지 않는다. |
| C | 6 | 스크립트·cfg 조각(56~61, 151~181, 191~244, 261~280행)은 있으나 Buildroot 버전·보드·실행 출력이 없다. 60·243·267행은 BOARD_DIR을 정의하지 않고 쓴다(174행에서만 정의, 40~50행 표에도 없음). 그대로 복사하면 동작하지 않는다(AP-C-35). 19행 '트러블 슈팅의 9할'은 출처 없는 수치라 C ≤ 8. 검증 절차가 없어 앵커 part1-04(6)와 같은 구간. |
| D | 8 | 이글25~34/65~84/86~111/185~253행 ↔ Buildroot07 21~31/33~80/147~163/165~250행 hook·overlay·table·genimage 반복.185~253행 ↔ BSP17 138~216행은 partition/image 조립 같은 질문.65~84행 ↔ Recipes part7-14-rootfs-buildroot.md123~147행도 overlay 재설명. fakeroot/서명 차이를 남기되 긴 일반 예제를 줄이는8. |
| E | 7 | 제목과 description(5행)이 약속한 세 hook 차이·환경 변수·overlay 한계·system_table.txt·genimage를 17·38·65·86·185행이 다룬다. '정확한 차이'를 약속하는데 52·105·107행이 매뉴얼과 다르고 제목은 post-fakeroot를 뺐다. |
| F | 4 | 318행다음16맞음.326행Buildroot18후행secure boot signing흐름과327행BSP17후행서명흐름은실제대상전체검색에서없음(BSP17은138~216행genimage/partition).323~325행제목의요약표현차이만은결함아님.328행manual9.10은customizations quickguide이며실제post-image9.7과다름.4유지. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 본문 출처는 328행 매뉴얼 링크 하나이고 절 번호가 틀렸으며 판이 없다. genimage·mkimage·fakeroot 주장에 연결된 출처·버전이 없다. |

병합 대상: Buildroot07 overlay·table·genimage 정본. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter16-ota.md`

source_file: `src/content/blog/embedded/buildroot/chapter16-ota.md`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. 236~240행은 BOOT_ORDER=A B면 A, 그 외 B이며243행은 항상 B A로 덮어쓴다. 초기 A B와 B A 두 상태를 부작용 없는 분기 재생으로 확인: 둘 다 alt 후 B. 따라서247행 반대 슬롯으로 전환한다는 설명은 B 실패 때 성립하지 않는다. 실기 U-Boot 구동을 했다는 뜻은 아니다. RAUC의 상태변수 계약·인증서·이미지 서명 전체는 추가 검증 대상이다.

uncertainties:
- 170~180행 rootfs.ext4.gz를 `type = "ubivol"`로 적었는데 185·92·98행은 eMMC를 쓴다. swupdate 문서로 확인하지 않았다.
- 180행 .gz 파일에 `compressed = "zlib"`. swupdate 정의 미확인.
- 247행 RAUC가 mark-good 때 bootcount를 리셋한다는 설명. RAUC U-Boot 백엔드 변수(BOOT_ORDER, BOOT_x_LEFT)는 확인하지 않았다.
- 243행 altbootcmd가 bootcount를 리셋하지 않을 때 reset 뒤 다시 도는지는 U-Boot 문서로 확인하지 않았다.
- 221~227·363행 'newc만 정답' vs `bootloader/chapter20-rauc-swupdate.md` 200행 근처 `cpio -ov -H crc`(다른 글과의 차이).
- 254행 fw_env.config(`/dev/mmcblk0 0x100000 … 2`) vs `chapter13-uboot-integration.md` 237~238·250·297행(mmcblk0boot1 0xC0000, num-sectors는 NAND에서만, 0x100000은 잘못된 값의 예). 다른 글과의 모순.
- 347행 `BR2_PACKAGE_BUSYBOX_SHOW_OTHERS`로 watchdog을 켠다는 설명 미확인.
- 46·50~53행 Mender·swupdate 비교 칸 미확인.
- 361행 bundle 스크립트(143~148행)가 `--intermediate`를 넘기지 않을 때 검증 통과 여부 미확인.
- 62행 '5개 파일'과 370행 '세 파일'의 개수 차이(산문 개수 표기라 오류 확인 제외).
- 351행 820 MB 사례, 291행 800 MB × 2는 출처가 없다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 15 | 결정 차원 표(27~31행)와 37행의 passive/active rollback 역할 구분, 3도구 비교 표와 선택 기준(43~56행)이 있다. 실패 사례도 구체적이다(221·227행 CPIO 첫 파일 sw-description, 361행 RTC 1970년 cert not-yet-valid, 351행 slot 크기 부족). RAUC system.conf·manifest·3단계 CA는 다른 시리즈 두 편과 형태가 같고, 351행 '18개월 뒤 820 MB'·291행 '800 MB × 2'는 출처 없는 경험 수치다. 13~19 중간. |
| B | 13 | 결정 차원(23행) → 도구 비교(39행) → RAUC(60행) → swupdate(153행) → U-Boot 협업(229행) → partition(259행) → 서명(293행) → 롤백(324행) → 흔한 실패(349행) → 정리(365행)로 이어진다. 243행 rollback 코드 결함과 열린 불확실(170~180행 ubivol·zlib, 347행 BusyBox 옵션, 254행 fw_env.config)로 AP-C-24 B ≤ 13. |
| C | 7 | BR2_ 토글(66~71·159~164행), post-image 스크립트(130~149·206~224행), genimage.cfg(274~289행), openssl CA(299~318행), systemd unit(328~343행)이 있다. Buildroot·RAUC·swupdate·U-Boot 버전과 보드가 없고 관찰 결과는 오류 문자열 두 개(358·363행)뿐이다. 263~270·291·351행 수치는 출처 없음이라 C ≤ 8. 243행 코드는 그대로 쓰면 A로 돌아가지 못해 한 단계 더 내렸다. |
| D | 7 | 이글77~104/110~126행 ↔ BSP18 101~146행·Bootloader20 53~110행 system.conf/manifest,168~202행 ↔Bootloader20 148~200행 sw-description,299~317행 ↔BSP18 275~288행 CA,229~247/328~343행 ↔Bootloader17 77~109/362~380행 rollback/healthcheck,43~58행 ↔BSP18 244~257행 도구 비교를 직접 대조. 보드값/슬롯 설계는 달라도 핵심 설명 중복이 커7. |
| E | 7 | 제목의 'RAUC·swupdate 통합'은 60~227행이 이행한다. description(5행)은 Mender까지 통합한다고 약속하지만 58행은 Mender를 다루지 않는다고 밝히고 비교 표 한 열(43~54행)뿐이다. 나머지 약속은 259·128·229·293·324행 절이 다룬다. |
| F | 4 | 378행 다음 편 'Ch 17: SDK 생성·배포'는 seriesOrder 17과 맞다. 388행 'BSP Development Ch 14: 업데이트 시스템 설계'는 `bsp/chapter14-thermal-watchdog.md`로 간다(실제 OTA 글은 `bsp/chapter18-ota-recovery.md`). 385행 'Ch 18: 보안·CVE 관리 — secure boot, SBOM…'의 대상에는 'secure'·'서명'이 0회다. F ≤ 5. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 389~390행 RAUC·swupdate 문서 링크는 버전이 없고 주장과 연결되지 않는다. 본문 버전 표기는 126행 'RAUC 1.5+' 하나다. 비교 표(43~54행)의 라이선스·D-Bus·서명 알고리즘 칸에 출처가 없다. |

병합 대상: BSP18·Bootloader20 OTA 정본,Buildroot는 패키지/hook 차이. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter17-sdk.md`

source_file: `src/content/blog/embedded/buildroot/chapter17-sdk.md`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인.347~348행은 tarball 파일명만 바꾸지만363행은 내부 최상위 디렉터리까지 sdk-myproduct-v1.4.2로 바뀐다고 가정한다. tarfile로 원문과 같은 내부 경로를 가진 tar.gz를 새 이름으로 생성해 멤버를 읽으니 aarch64-buildroot-linux-gnu_sdk-buildroot/relocate-sdk.sh가 유지된다.136행 SYSROOT 비export 후204행 자식 CMake의 $ENV{SYSROOT}도 env -u SYSROOT sh로 실제 실행해 빈 값을 확인했다.127/139행 서로 다른 형태의 CC 예시는 출력/개념 예 차이 가능성이 있어 그 쌍만의 내부 오류 판정은 철회한다.

uncertainties:
- Buildroot 소스(support/scripts/mksdk·relocate-sdk.sh 템플릿)를 열지 않았다. 33~36행 출력 문구, 105행 'Patched 247 files', 132~156행 environment-setup의 실제 변수 목록은 미확인이다.
- 190·225·262행 `share/buildroot/toolchainfile.cmake`, `cross-compilation.conf`의 실제 경로·이름 미확인.
- 108·112행 relocate-sdk.sh의 patchelf 사용과 길이 제한 미확인.
- 116행 '사내 표준 경로로 통일하면 relocate가 사실상 no-op'은 92·96·390행과 어긋나 보인다. 빌드 자체를 그 경로에서 한다는 전제가 빠졌는지 확인 필요.
- 244행 meson cross-file `cpu = 'cortex-a72'`는 대상 SoC가 글에 없다.
- 378행 크기 범위, 431행 'Manual §8.13: make sdk' 절 번호 미확인.
- `chapter19-cicd.md` 317·330행 `sdk.tar.zst` vs 이 글 36·39행 `.tar.gz`(다른 글과의 모순).
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 시스템 팀·application 팀 분리 동기(19~23행), relocate 한계 세 가지(112~114행)와 설치 경로 표준화(116행), host architecture 종속(118행), Buildroot SDK·Yocto SDK·eSDK 비교와 팀 구조별 선택 기준(372~383행), 흔한 실수 6건(389~405행)이 이 글만의 관점이다. 112행 RPATH 한계는 '~경우가 있어'로 조건을 흐렸고 378행 크기 수치는 출처가 없다. 빌드 시스템 4종 예(166~257행)는 일반 cross-compile 자료 수준이다. |
| B | 13 | 27~92행 생성→94~160행 relocation/환경→162~337행4빌드시스템/IDE→339~417행 배포/비교/정리까지 충분.363행 내부archive경로 및136/204행 비export 오류,판미지정 불확실로 B13상한.127/139행 예시차이는 독립 오류로 세지 않는다. |
| C | 7 | 31~37/100~106/357~364행 명령·출력과132~156/199~214행 파일 조각이 있다.363행archive경로·204행ENV값 문제를 이번 실행으로 확인했다. Buildroot판/보드/SDK 실제빌드없고105행247files·378행크기 출처없어7. |
| D | 12 | 이글345~366행 ↔ Buildroot19 110~122/312~331행은 SDK 배포를 공유하나 수동 체크섬/버전과 CI 역할이 구분된다.210~213행 ↔Recipes part3-11-make-cmake-cross.md101~104행 root mode는 같지만 bare-metal/SDK 도입 질문이 달라12. 인접16/18은 OTA/보안으로 별개. |
| E | 8 | 제목의 'SDK 생성·배포'·'make sdk'·'application 워크플로'는 27~92·339~366·162~337행이, description의 'relocatable toolchain 한계'는 110~118행이 이행한다. 대상 독자는 19~23행에 있으나 Buildroot 버전 같은 적용 범위가 없어 9 이상은 아니다. |
| F | 5 | 421행 다음 편(Ch 18 Security·CVE)은 seriesOrder 18과 맞고 426~429행 라벨도 대상과 맞다. 430행 'BSP Development Ch 7: 크로스 컴파일 toolchain'의 대상 `bsp/chapter07-tfa-trustzone.md`는 TF-A·TrustZone 글이라 틀린 라벨이다. 431행 매뉴얼 링크는 절 앵커가 없다. 전제 지식 안내가 없다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 본문 출처는 431행 매뉴얼 링크 하나이고 버전·절 앵커가 없다. 132~156행 environment-setup, 190·225행 경로, 108·112행 patchelf 동작은 출처에 연결되지 않았다. 378행 Yocto 크기 수치도 출처가 없다. |

병합 대상: 없음;SDK 배포 정본. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter18-security-cve.md`

source_file: `src/content/blog/embedded/buildroot/chapter18-security-cve.md`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 전체 기술정확성 대조 미완료.

미검증 유지. 신규로 제안했던243~249행 SSH key-only 오류는 철회한다. 위 검증 기록의 Buildroot2024.02/Dropbear2022.83 소스상 기본 -B 없이 빈 비밀번호 SSH 인증을 거부한다. 계정의 빈 password가 로컬 콘솔에서 passwordless login을 뜻하더라도 SSH key-only와 모순되지 않는다.235/316행 해시 사용 문장은 보안 권고로 읽히고, 생략된 $6$... 예시도 실행 가능한 완전 해시라고 보장하지 않아 별도 오류로 세지 않는다. pkg-stats JSON·재현성 옵션·hardening 예외 등 나머지 구체 주장 전체는 아직 대조하지 못했다.

uncertainties:
- 46~61행 pkg-stats.json 예시 구조가 실제 출력과 같은지 미확인(289~290행 jq가 전제).
- 65·310행 '버전만 보고 CVE를 보고'한다는 주장. <PKG>_IGNORE_CVES 류 선언 메커니즘이 있는지 매뉴얼로 확인하지 않았다(기억에 근거한 의심).
- 120행 SBOM 직접 출력 미내장, 127~130행 cyclonedx-buildroot 도구 이름·옵션 미확인.
- 106행 manifest.csv 헤더 열 이름 미확인.
- 169행 BR2_REPRODUCIBLE_PATH, 224·314행 BR2_PACKAGE_<NAME>_DOES_NOT_USE_PIC 존재 미확인.
- 219·222행 kernel module PIE 로드 실패, JIT W^X·PIE 충돌은 출처가 없다.
- 236·316·326행은 해시 사용 권고로 읽을 수 있다. 공식 설정은 plain도 인코딩하지만 권고와 모순된다는 오류는 확정하지 않는다.
- 243~249행 기본 비PAM Dropbear의 blank-password 거부를 공식 소스로 확인했다. /etc/default/dropbear의 -B override·PAM·다른 계정·콘솔 잠금까지 포괄한 생산 인증 정책과 실제 기기 테스트는 별도 확인해야 한다.
- 306행 BR2_GENERATE_LOCALE과 manifest license 표시의 관계는 출처가 없다.
- 208~212행 비용 수치, 340행 '§10.3' 절 번호 미확인.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | pkg-stats 정확도 한계 세 가지(63~67행)와 triage yaml 예(69~79행), manifest 변환과 syft 스캔 비교·'manifest 기준이 진실, syft는 누락 검증용' 기준(138~143행), hardening 예외(217~224행), 주간 CVE diff 스크립트(278~298행)가 이 글만의 내용이다. 65·224·243행 핵심 메커니즘 주장에 출처가 없고 17~30행 4축 표·118행 규제 언급은 일반론이다. 역사 Build50의 A9보다 고유 예제가 많아14. |
| B | 12 | 4축 개요(17~30행) → pkg-stats(32~79행) → legal-info(81~114행) → SBOM(116~143행) → reproducible(145~190행) → hardening(192~224행) → password·서비스(226~259행) → 모니터링(261~300행) → 흔한 실수(302~316행) → 정리(318~327행). 정확성에 걸린 불확실(46~61행 JSON 형식, 169행, 224행, 243~249행)이 열려 있어 AP-C-24로 B ≤ 13. Dropbear 기본 거부 정책과 콘솔 인증을 구별해 신규 오류 gate를 철회했으며 B12를 유지한다. |
| C | 7 | 명령과 스크립트는 재현 가능한 형태다(36~40, 85~90, 122~134, 174~178, 184~188, 238~241, 278~298행). Buildroot 버전·실행 환경이 없고 출력은 예시뿐이다. 208~212행 비용 % 수치는 출처·환경 없음이라 C ≤ 8. 289~290행 jq는 46~61행 구조가 실제 출력인지 확인되지 않아 1점 더 뺐다. |
| D | 11 | 이글145~190행 ↔ BSP20 21~54행 reproducibility,81~143행 ↔ BSP20 323~351행 legal-info/SBOM 같은 질문. embedded-security/chapter10-sdlc.md198~200행은 SBOM 시작점만 공유(해당 세 줄만으로 깊은 중복이라고 하지 않음). Recipes part7-14-rootfs-buildroot.md200~203행은 옵션 한 줄. pkg-stats/triage가 남아11. |
| E | 8 | 제목(2행)의 pkg-stats·Reproducible Builds와 description(5행)의 CVE·legal info·SBOM·reproducible build를 32~79·81~114·116~143·145~190행이 다룬다. 대상 독자·Buildroot 버전·출하 조건이 없어 9 이상은 아니다. hardening·root password(192~259행)는 제목 밖이지만 과장은 아니다. |
| F | 5 | 331/339행후행pkg-stats·legal-info·diffoscope자동화는Buildroot19본문에pkg-stats/diffoscope가없어5상한.337행Buildroot16은293/324행서명/rollback이있어제목표현차이만으로오안내아님.338행SDKmanifest동봉도17본문에그절차없어약속점검필요.340행manual10.3은SELinux로실제CVEmanagement라벨과다름.모든내부대상공개/slug/order확인. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 본문 안에 주장과 연결된 1차 출처가 없고 끝의 340~341행 외부 링크 두 개뿐이다. 340행은 매뉴얼 전체 URL이고 Buildroot 릴리스 버전이 없어 169·196~200행 옵션 이름과 46~61행 출력 형식의 기준 판을 알 수 없다. |

병합 대상: BSP20 재현성/SBOM 공통절. 다음 조치: 독립 질문을 유지하되 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter19-cicd.md`

source_file: `src/content/blog/embedded/buildroot/chapter19-cicd.md`

score_status: 잠정 · score: 58 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. Buildroot official generated-toolchain 문서12~17행과 manual §8.14.1에 make sdk는 output/images/<TARGET-TUPLE>_sdk-buildroot.tar.gz를 만든다. 원문317행 sdk.tar.zst/output/host와330행 output/sdk.tar.zst는 추가 변환 명령 없이 이 산출물을 가리킬 수 없다.115행의 output/images/*sdk* rename은 실제 원출력 위치와 맞는다. GitLab cache key와 전체 공유 권고 차이 자체는 선택 가능한 전략이라 별도 내부 오류로 세지 않는다.

uncertainties:
- 19행 'toolchain 30~50분 + base packages 10~20분 + image 5분 → 40분에서 한 시간': 구성 요소 합은 45~75분이다(대략 표현이라 오류 확인 제외).
- 300행 '2 × 3 × 5 = 30 job'은 294~298행 표(2·2·3)와 285~289행 matrix(보드 5개)와 대응하지 않는다.
- 128행 dl 보드별 키 vs 304행 'dl/ 전체 공유'.
- 85~86행 상대 경로 cache paths와 69~70행 절대 경로. GitLab cache가 프로젝트 밖 경로를 저장하는지 미확인.
- 128·368행 'GitLab cache는 차분만 올림' 미확인.
- 262행 'root ccache를 non-root가 읽으면 hit가 안 됨' vs 347행 '읽기는 되지만 쓰기는 안 됨, hit rate 0%'. ccache 문서로 확인하지 않았다.
- 319행 output/sbom.json 고정 경로는 매뉴얼에 사용자 리다이렉트 예로만 나온다(WebFetch 요약 기준). 336행 output/update.raucb 미확인.
- 356~358·342·348행 플랫폼 한도 수치 미확인. 274·258·308행 수치는 출처가 없다.
- `chapter14-build-caching.md` 137·362행 '80% 이상' vs 이 글 258·372행 '50~70%', ch14 153·362행 공유 vs 이 글 263·305행 보드별 분리(다른 글과의 모순).
- 375행 '6가지'인데 4개 나열, 344~352행에는 7개(개수 표기 실수).
- 매뉴얼 확인은 WebFetch 요약(인용 포함)에 기댔고 판에 따라 절 번호가 다를 수 있다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 128행 GitLab cache 키를 보드별로 잡는 이유, 191행 dl 키를 hashFiles('package/**/*.hash')로 잡는 근거, 233행 --size-only를 runner 사이 mtime 차이로 설명, 266~272행 ccache를 tar.zst로 묶어 S3 호출 수를 줄이는 방식, 302~308행 공유 원칙이 이 글의 판단이다. 197~201·294~298·354~360행 표는 일반론이고 258행 '50~70%', 264행 '10G가 무난', 362행 '10개 이상'은 근거 없는 경험칙이다. 13~19 하단. |
| B | 13 | 25~58행container→60~191행GitLab/Actions→193~308행cache/matrix→310~375행배포/정리로 완결. SDK317/330행 실제경로 오류,69~70행 /cache 대85~86행상대cache경로 미정합 및 실행판미지정으로13. 보드별dl키와전체공유권고는 서로 다른 전략이라 그 차이만의 오류는 철회. |
| C | 7 | Dockerfile(29~54행), .gitlab-ci.yml(64~126행), GHA workflow(134~189행), S3 sync 스크립트(205~231행)가 있다. 19행 빌드 시간, 249~255행 ccache -s 예시, 258행 hit rate, 274행 압축 비교, 308행 600 MB, 356~358행 플랫폼 한도는 출처·환경 없음이라 C ≤ 8. 330행 명령은 실행하면 실패해 7. |
| D | 10 | 이글157~169행 ↔Buildroot14 319~344행 cache/restore-keys는 반복이나14의346행이 상세를19에 위임한다.292행 matrix·323~338행 S3·354~360행 CI 표 ↔Bootloader30 74~82/265~276/319~322행은 뼈대 공유이며 차원/산출물/비교 열은 다르다. BSP20 103~108/181~182행은 출시 CI. draft QEMU글은 공개 중복에 세지 않는다. dl·ccache 키 설계로10. |
| E | 8 | 제목의 'Container Build'는 25~58행, 'Cache 공유'는 193~308행, description의 GitLab·GitHub Actions·dl·ccache 팀 공유는 60~128·130~191·193~274행이 맡는다. 과장은 없다. 대상 독자 규모·출발점이 없고 310~342행 배포는 제목 밖이라 9는 아니다. |
| F | 5 | 379행다음20및384~387행관련14/16/17/18의실제title/order/draft·후행주제대조.제목요약표현차이는허용한다.388행manual8.13은Top-levelparallelbuild여서CI/CD considerations라는없는절라벨로5상한.375행개수실수는내비약함이지기술오류아님. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 버전 표기는 31행 ubuntu:22.04, 132·154·158·184행 actions/*@v4, 71·150행 이미지 태그 2026.02이고 Buildroot 버전은 없다. 본문에 주장과 연결된 1차 출처가 없고 유일한 388행 링크는 없는 절 라벨로 첫 페이지에 간다. |

병합 대상: Buildroot14 캐시 공통절. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `buildroot/chapter20-yocto-migration.md`

source_file: `src/content/blog/embedded/buildroot/chapter20-yocto-migration.md`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 전체기술정확성대조미완료.

미검증.273행 5×32=160,110+4×8=142 재계산은 맞다.4번째/5번째 빌드 언급은 데이터셋/요약 관점 차이 가능성이 있어 새 오류로 세지 않는다. meta-buildroot는 제공한 자체 wrapper 예일 수도 있으므로 외부 프로젝트의 실존 여부만으로 오류 확정하지 않는다. Yocto tasks/FILES의 기본 포함 규칙 및 재현 로그는 검증해야 한다.

uncertainties:
- 92행 등 'meta-buildroot' layer가 실제 공개된 layer인지 확인하지 않았다. 113~146행은 글이 직접 쓴 예로 보인다.
- 72행 `hostname_pn-base-files`는 옛 override 문법이고 144·205행은 새 문법을 쓴다. Scarthgap 기준 문법은 미확인.
- 210행 '/etc 아래 파일을 FILES:${PN}에 명시하지 않으면 빠진다': 기본 FILES:${PN}에 ${sysconfdir} 포함 여부 미확인.
- 263~273행 측정값은 명령·로그가 없고 1장 202~207행과 같은 수치다.
- 41·338·271행 '4번째 빌드부터'와 277행·1장 211행 '5번째 빌드부터'의 관계가 불분명하다.
- 275행 'Buildroot가 빠른 시나리오는 … single board incremental'과 269행(1 pkg 수정: 25초 vs 12초)이 맞지 않아 보인다.
- 214행 '한 줄짜리 configs/<board>_defconfig' 표현의 뜻이 불분명하다.
- 131행 `S = "${TOPDIR}/../buildroot"` 방식이 sstate·fetch 규칙과 맞는지, 194행 tag archive 디렉터리 이름 `myapp-${PV}` 미확인.
- 49~53·285~290행 수치는 출처가 없다. 349행 URL 유효성 미확인.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | Buildroot↔Yocto 개념 대응 표(63~78행)와 대응이 안 되는 두 지점(80행), .mk→.bb 변환 대조(156~206행)와 변수 대응(208행), defconfig를 MACHINE conf와 image recipe로 나누는 설명(214~259행), '옮기지 말아야 할 신호'(298~307행)가 이 글만의 부분이다. 이전 신호(23~41행)는 1장 116~121·153~155행과 같은 목록이고 비용 표(49~53·283~292행)는 출처 없는 견적이다. 43·55행 같은 일반론이 섞여 13~19 하단. |
| B | 13 | 신호(19~43행) → 비용(45~57행) → 개념 매핑(59~80행) → hybrid(82~150행) → recipe 변환(152~210행) → MACHINE conf(212~259행) → 빌드·운영 비용(261~294행) → 옮기지 말 신호(296~307행) → 정리(330~340행). hybrid 패턴 2의 meta-buildroot(90~150행)는 저장소·출처가 없고 72·210행 정확성 불확실이 열려 있어 AP-C-24로 B ≤ 13. |
| C | 7 | 코드 예(113~122, 126~146, 156~206, 216~257행)는 있으나 bitbake 실행 명령·예상 출력·검증 절차가 없다. 빌드 시간 표(263~273행)는 하드웨어 환경은 적었지만 명령·로그가 없고 같은 수치가 1장 202~207행에 그대로 있어 실측 여부를 알 수 없다(경험 진위, C ≤ 12). 49~53·283~292행은 출처 없는 수치라 C ≤ 8. 187·190행 체크섬은 자리 표시 값이다. |
| D | 9 | 이글263~269행32/110분·5/8초·25/12초 ↔Buildroot01 202~207행 표와 같은 수치,23~37행 신호 ↔01 116~121/153~155행 같은 선택기준,90~150행 hybrid ↔01 167행은 상세 위임 수준.216~237행 machine conf ↔BSP16 242~266행은 필드 구조 공유하나 SoC/tune/경로 다름.69/71행 ↔BSP16 326~338행 개념표도 공통. 변환 단계는 남아9. |
| E | 7 | 제목의 '언제'(19~43, 296~307행)와 '어떻게'(82~259행)를 모두 다루고 description의 'meta-buildroot 같은 hybrid 옵션'은 90~150행에 있다. meta-buildroot 실존을 본문이 출처로 보이지 않고 309~328행을 시리즈 회고가 차지해 6~8 중간. |
| F | 4 | 344~347행 관련 항목 4개는 대상 제목과 맞다. 그러나 시리즈 회고 표(313~319행)가 장 번호와 주제를 틀리게 적었다: 316행 Ch 6~10, 317행 Ch 11~15('device tree, BR2_EXTERNAL'), 318행 Ch 16~19('release branching, OTA·secure boot')가 실제 06~19장 제목과 다르다. 다른 글의 번호를 잘못 적은 경우라 5 이하. 마지막 편이라 다음 편은 없고 후속 안내(321~326행)는 Yocto '준비 중', BSP·Embedded C++ 링크 없음이다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 출처는 끝의 매뉴얼 링크 3개(348~350행)와 323행 매뉴얼 이름뿐이고 주장에 연결되지 않는다. 버전 표기는 265행 'Buildroot 2024.02 / Yocto Scarthgap'과 121행 LAYERSERIES_COMPAT 정도다. meta-buildroot(92행) 저장소, populate_sdk_ext(37행)·FILES 분할(210행)의 문서 위치가 없다. |

병합 대상: Buildroot01 선택표·측정표;변환 절은 유지. 다음 조치: 독립질문을 유지하되 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `cmake/chapter01-intro.md`

source_file: `src/content/blog/tools/build/cmake/chapter01-intro.md`

score_status: 잠정 · score: 57 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; 전체기술정확성대조미완료.

미검증. 일반 입문 동작은 확인했지만 모든 생성기·OS 설치·최적화 플래그 주장 전체의 1차 대조는 끝나지 않았다. makefile 첫 줄이라는195행은 파일명 안내 실수로 본다. 자동 재구성은474행에서 예외 설명을 붙였으므로470행과의 단정/완곡 차이만으로 정확성 오류를 만들지 않는다.

uncertainties:
- 316~321행 빌드 타입 표: GCC Debug 기본 플래그가 '-O0'인지('-g'만인지) 미확인. Release·RelWithDebInfo의 '-DNDEBUG'가 표에 없고 323행 'assert 비활성화'와 연결되지 않는다. Modules/Compiler/GNU.cmake로 확인 필요.
- 140행 FetchContent FIND_PACKAGE_ARGS·presets v6가 3.25부터라는 경계 미확인. 'CMakeLists.txt 모듈 개선'의 내용을 알 수 없다.
- 92행 'Ubuntu 22.04 LTS는 3.22', 285행 '-B는 3.13+'는 1차 자료로 대조하지 않았다.
- 307행 '대형 프로젝트에서 2~3배 빠른'은 출처·측정 환경이 없다.
- 435행 'project()가 먼저 오면 위쪽 코드는 아주 옛 동작'이 실제 정책 설정 시점과 맞는지 미확인.
- 470~475행은 '변경이 반영 안 됨'을 실수로 들면서 475행에서 자동 재구성된다고 해 항목 성립이 불분명하다.
- 142행 '3.0 이전과 3.x는 완전히 다른 도구'와 185행 '2.6 시절 파일도 3.x에서 거의 그대로 돈다'가 긴장 관계다(산문 수준이라 오류 확인 제외).
- 195행 'Makefile의 첫 줄'은 CMakeLists.txt의 오기로 보인다. 5행 '5줄 짜리'와 177행 '세 줄'의 개수가 다르다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 메타 빌드 시스템 설명(13~40행), 능력 표(48~54행), OS별 설치(81~131행), hello 프로젝트(146~241행)는 공식 Tutorial·입문서에 흔한 구성이다. 더 설명하는 부분은 cmake_minimum_required의 정책 기본값과 버전 범위 문법(183~193행), multi-config와 single-config 관행 대비(325~336행), 흔한 실수 5개(408~501행)다. 33행 '매주', 307행 '2~3배'는 근거가 없고 실패 사례·선택 기준이 없다. 6~12 위쪽. |
| B | 13 | 문제 제기(15~36행) → 설치(81~142행) → 첫 프로젝트(146~241행) → 구성·빌드(245~336행) → 구조 확장(340~404행) → 흔한 실수(408~501행) → 정리(505~514행)로 끝까지 간다. hello의 구성 로그·282행 실행 결과가 없고 316~321행 빌드 타입 플래그 표 같은 불확실이 열려 있어 AP-C-24로 B ≤ 13. 195행은 'Makefile의 첫 줄'이라 써 CMakeLists.txt와 헷갈린다. 474행 자동 재구성을 인정하는 후행 설명까지 확인했으며 수동 재구성 권고와 곧 기술 모순이라고 하지는 않는다. |
| C | 7 | 따라 할 수 있는 명령·파일이 있다(156~174, 274~283, 291~302행). 관찰 결과는 136~137행 버전 출력 예와 181행 에러 메시지뿐이고 빌드 로그·실행 결과·OS·컴파일러 버전이 없다. 307행 '2~3배'는 출처 없는 수치라 C ≤ 8. 4~7 상단. |
| D | 10 | 이글325~336행 ↔CMake02 600~610행·04 641~652행 multi-config,482~501행 ↔03 15~35행·08 60~70행 target 권고,461~463행 ↔04 280~289/570~575행 기본타입 코드 반복. GNU Make01은13/58/131/344/463행 입문 뼈대만 비슷해 내용 중복으로 더 감점하지 않는다. 설치/첫 프로젝트 역할로10. |
| E | 7 | 제목(2행) '설치부터 빌드까지'와 description(5행) '왜 메타 빌드 시스템이 필요한가'를 13~40·81~142·245~336행이 이행한다. 대상 독자·구체 문제가 없다. description '5줄 짜리 첫 프로젝트'와 177행 '세 줄이 전부'가 개수를 다르게 말한다(실제 167~174행은 명령 3개, 8줄). |
| F | 7 | 518행 다음 장 예고(Ch 2: CMake 언어)는 seriesOrder 2 `chapter02-language.md`(draft: false)와 맞다. 관련 항목 529행 Ch 2, 530행 Ch 3(`chapter03-targets.md`, seriesOrder 3), 531행 `gnu-make/chapter01-intro.md` 대상 파일을 열어 라벨과 내용이 맞음을 확인했다. 본문 241·369·501행도 Ch 3을 해당 개념 자리에서 가리킨다. 전제 지식 안내가 없고 렌더 확인을 하지 않아 8 이상은 아니다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 2 | 참고 자료(522~525행)와 532행 cmake(1) 링크는 모두 cmake.org/help/latest(버전 미고정)이고 140·285·316~321·92행 주장에 연결된 인용이 없다. 버전 정보는 137행 예시 3.28.1, 167행 최소 3.20 정도다. |

병합 대상: CMake03·04 타겟/타입 공통절. 다음 조치: 독립질문을 유지하되 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.

### `cmake/chapter02-language.md`

source_file: `src/content/blog/tools/build/cmake/chapter02-language.md`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART49 / ISR40 / Build50. blockers: P0미발견; P1 위기술오류.

오류 확인. 원문714~716행 PATH 변수를 그대로 CMake4.4.4 -P로 실행해 foreach 한 번 iter:C:/Program Files/MyApp를 관찰했다. 공백 기준 두 요소라는 주석은 틀렸다.321행 비어 있지 않으면 참 설명도 set(VAR OFF) 실행에서는 OFF=false이며 공식 if(<variable>)는 false constant를 제외한다.817행 CMP0135는 공식 문서/로컬 help-policy에서 archive 추출 timestamp 정책이므로 URL_HASH 경고 끄기 설명과 다르다. string COMPARE EQUAL은 IS_EQUAL=1이지만 TRUE와 논리값이 같다는 의미로 읽힐 수 있어 이 출력 표기만으로 새 핵심 오류를 세지 않는다.

uncertainties:
- 731~735행 '이중 역참조가 발생할 수 있음': CMake 4.4.4에서 SOME_VALUE를 비워도 if(VAR)는 참이었고 이중 역참조는 관찰되지 않았다. 완곡 표현이고 if(${VAR}) 상황을 뜻했을 수 있어 오류 근거에는 넣지 않았다.
- 515·789행 '빌드 시스템 생성 시점에 평가'와 531·771행 '빌드 시점에 평가'의 용어 불일치.
- 269행 IS_EQUAL 값은 4.4.4 실행 결과로 확인했고 3.15~3.20에서도 같은지는 실행하지 않았다.
- 43행 3.15와 794행 3.20이 섞여 예제 기준 버전이 불명확하다.
- 78행 '인자는 공백이나 세미콜론으로 구분'은 리터럴 인자에만 맞고 714~716행 오해와 같은 뿌리로 보인다.
- 387행 Clang -Weverything 권장은 근거 없는 실무 권고다.
- 위에서 출처/실행으로 확인하거나 기각한 해당 의문은 이 보고서의 gate 결론을 따른다. 그 밖의 버전·API·정량 관찰은 열려 있으며 검증됨으로 올리지 않는다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 89~690행 대부분이 cmake-language(7)·명령 문서 항목을 순서대로 옮긴 참조형 나열이다. 이 글만의 설명은 중첩 제너레이터 식을 안쪽부터 1/0으로 푸는 절과 표(552~582행), multi-config에서 if(CMAKE_BUILD_TYPE)이 항상 거짓이 되는 이유(599~612행), 흔한 실수 절(694~777행) 정도다. 714~716행 예는 공식 문서·실행 결과와 반대이고, 731~735행 '이중 역참조가 발생할 수 있음'은 근거 없는 완곡 표현이다. 6~12 상단. |
| B | 12 | 왜 언어를 알아야 하는가(13~34행) → 기초 → 변수 → 리스트 → 문자열 → 조건문 → 함수/매크로 → 제너레이터 식 → message → 흔한 실수 → 정리(781~790행)로 완결된다. 정리 뒤에 cmake_policy 절(792~823행)이 붙어 결론 위치가 어긋나고, 변수 스코프(124~130행)에 3.25 block() 스코프가 없다. 정확성 오류가 열려 있어 AP-C-24로 13 이하. |
| C | 8 | 100~103/179~188/219~229/291~293/429~433행예상관찰이 많고이번4.4.4-P에서PATH한항목/OFF=false/IS_EQUAL=1을 재현.714~716행틀린분리예·321행false상수누락,대상판불명으로8. TRUE/1동일논리값표기만으로 오류를 부풀리지 않는다. |
| D | 11 | 이글792~823행 ↔CMake01 179~195행 policy 개관은 상세로 이어짐.521~534/599~612행 ↔04 640~652행 multi-config 실패/해결 반복.643~652행 ↔03 400~421행·09 225~251행 BUILD/INSTALL_INTERFACE 반복. GNU Make03 72~96행 변수는 다른 도구/확장 규칙이라 동일 질문의 대체 글은 아니다. 언어 참조 정본 역할로11. |
| E | 7 | 제목 '변수·조건문·함수의 동작'과 description(5행)이 89~510행과 맞는다. '분석'은 552~612·694~777행에서 일부 이행되지만 대부분 사용법 나열이다. description에 없는 제너레이터 식(513~668행)·정책(792~823행) 비중이 크다. |
| F | 7 | 15행이 Ch1 전제를 밝히고, 827행 다음 편 'Ch 3: 타겟'은 seriesOrder 3 `chapter03-targets.md`(draft: false)와 맞다. 837~840행 관련 항목 대상(chapter01-intro, chapter03-targets, chapter04-options 189행 절, gnu-make/chapter03-variables 72행 절)의 라벨과 내용이 맞다. 정리(781행) 뒤 정책 절(792행) 구조와 모바일 확인 미실시로 9 이상은 아니다. 이번에도 링크줄 전체와 실제대상 내용을 대조했다. |
| G | 3 | 참고 자료(831~833행)와 823·841행에 cmake.org 공식 매뉴얼 링크가 있으나 모두 'latest'라 기준 버전이 없고 71·817·321행 주장에 출처가 붙어 있지 않다. 정책 절(823행)만 주장과 링크가 연결된다. 2~3. |

병합 대상: CMake03·04·09 genex 공통절. 다음 조치: 확인 오류를 먼저 정정하고 적용판·보드·명령·예상결과를 정본에 보강한다. 반복 예제는 위 대상에 모으고 후행 링크 약속은 실제 제공하는 절차에 맞춘다.
