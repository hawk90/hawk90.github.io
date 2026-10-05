---
title: "실리콘 버그 대응 — Errata·Workaround·ECO"
slug: "tools/debugging/embedded/chapter20-errata-workaround-eco"
date: 2026-10-05T10:20:00
description: "실리콘 버그를 확정하고 SW workaround를 설계하며, errata 문서화와 metal ECO 협업까지 이어지는 흐름."
series: "Embedded Debugging"
seriesOrder: 20
tags: [errata, workaround, eco, silicon-bug, post-silicon]
draft: true
topics: ["tools", "tools/debugging"]
---

Ch 19에서 HW냐 SW냐를 가르는 방법을 봤습니다. 판정 결과가 "HW 버그"로 나와도 일이 끝나지 않고, 오히려 그때부터 시작됩니다. 칩은 이미 만들어졌고, 고객은 그 칩으로 제품을 만들어야 합니다. 다음 칩이 나오기까지 몇 달이 걸리는 동안 소프트웨어가 버텨야 합니다.

이 장은 실리콘 버그를 다루는 전체 흐름을 정리합니다. 문서와 실리콘이 다를 때 무엇을 기준으로 삼는지, 버그를 어떻게 확정하는지, SW workaround는 어떤 원칙으로 설계하고 그 비용은 얼마인지, errata(출시된 칩의 결함과 대응을 정리한 문서)는 어떻게 쓰는지, 그리고 다음 스테핑(칩을 고쳐 다시 만든 버전)에서 고칠지 말지를 어떻게 정하는지를 차례로 봅니다. SW 엔지니어는 workaround를 만들고, HW 엔지니어는 수정 방법을 찾습니다. 그래서 양쪽이 같은 흐름을 이해하고 있어야 합니다.

## 문서와 실리콘이 다를 때

실리콘 버그처럼 보이는 문제 중 상당수는 사실 **문서와 실리콘의 불일치**입니다. 데이터시트나 TRM(technical reference manual, 칩의 레지스터와 동작을 설명하는 기술 문서)에는 레지스터의 리셋값이 0이라고 쓰여 있는데, 실제 칩에서 읽어 보면 1인 경우가 있습니다. 문서에는 없는 초기화 순서를 지켜야만 어떤 블록이 동작하는 경우도 있습니다. 이번 스테핑에서는 아직 구현되지 않은 기능이 문서에는 있는 경우도 있습니다.

아파트 도면에는 벽이 여기 있는데 실제로 지어 보니 30cm 옆에 있다고 해 봅시다. 도면을 고칠지, 벽을 고칠지는 누가 맞는지에 달려 있습니다. 칩도 마찬가지로 세 가지 "진실"이 있습니다. 설계 의도를 담은 스펙, 실제로 만들어진 RTL, 그리고 그것을 설명하는 문서입니다. 불일치를 발견하면 어느 쪽이 틀렸는지부터 정해야 합니다.

| 불일치 유형 | 예 | 대개의 결론 |
|---|---|---|
| 문서가 RTL과 다름, RTL이 의도대로 | 문서의 리셋값 오타 | 문서 수정 |
| RTL이 의도와 다름 | 설계 실수로 비트 위치가 바뀜 | 실리콘 버그 → 이 장의 흐름 |
| 문서에 없는 요구 사항 | 블록 활성화 전 대기 시간이 필요 | 문서 보강, 때로는 errata |
| 이번 스테핑에 기능 없음 | 다음 스테핑에서 구현 예정인 기능 | 스테핑별 기능 표로 관리 |

bring-up에서 이런 불일치를 빨리 찾는 방법 하나는 리셋 직후 레지스터 값을 통째로 읽어 문서와 비교하는 방법입니다. 단, 읽기만 해도 상태가 바뀌는(read-to-clear) 레지스터나 FIFO는 덤프 대상에서 뺍니다. 아래 스크립트는 레지스터 덤프와 문서에서 뽑은 기대 리셋값 표를 비교해 다른 항목만 보여 줍니다. 입력 형식은 설명을 위한 예시입니다.

```python
import yaml

def compare_reset(dump_path, expected_path):
    actual = {}
    for line in open(dump_path):                 # 예: "0x40010000 0x00000001"
        addr, val = line.split()
        actual[int(addr, 16)] = int(val, 16)

    expected = yaml.safe_load(open(expected_path))   # 문서 표에서 뽑은 기대값
    for reg in expected["registers"]:
        addr, want = int(str(reg["addr"]), 0), int(str(reg["reset"]), 0)
        mask = int(str(reg.get("mask", "0xffffffff")), 0)    # 의미 없는 비트 제외
        got = actual.get(addr)
        if got is None:
            print(f"{reg['name']:24s} missing in dump")
        elif (got ^ want) & mask:
            print(f"{reg['name']:24s} doc={want:#010x} silicon={got:#010x}")

compare_reset("reset_dump.txt", "trm_reset_values.yaml")
```

이 비교에서 다른 항목이 나왔다고 바로 버그로 단정하지 않습니다. 부트 ROM이 리셋 직후 일부 레지스터를 이미 바꿨을 수도 있고, 문서의 "리셋값"이 특정 리셋 종류에만 해당할 수도 있습니다. 다른 항목 목록은 HW 팀과 함께 하나씩 확인할 질문 목록입니다.

## 버그를 확정하기까지

실리콘 버그를 확정하는 일은 신중해야 합니다. 한번 errata로 등록되면 고객 문서에 실리고, 다음 스테핑 계획에 영향을 주기 때문입니다. 반대로 확정이 늦어지면 SW 팀은 원인을 모르는 채로 계속 헤맵니다.

![실리콘 버그를 확정하기까지 — 증상 보고, 여러 칩·보드 재현, 최소 재현 코드, pre-silicon 재현, RTL 원인 확정을 거쳐 errata 등록·SW workaround·다음 스테핑 수정으로 나뉜다](/images/blog/debugging/embedded/diagrams/ch20-bug-confirm-flow.svg)

각 단계에서 확인하는 질문은 다음과 같습니다.

- **여러 칩·보드에서 재현되는가?** 한 칩에서만 나오면 개별 불량일 수 있습니다(Ch 10의 판정 질문).
- **최소 코드로 줄일 수 있는가?** 드라이버 전체가 아니라 레지스터 몇 개로 재현되면, 복잡한 SW 로직을 원인에서 제외할 수 있습니다.
- **pre-silicon에서 재현되는가?** 같은 시나리오를 시뮬레이션에서 돌려 같은 잘못된 동작이 나오면, waveform으로 원인 신호까지 볼 수 있습니다(Co-simulation 시리즈 Ch 15).
- **RTL에서 원인을 설명할 수 있는가?** "이 조건에서 이 신호가 이렇게 잘못 동작한다"를 설명할 수 있어야 확정입니다.

pre-silicon 재현이 어려운 경우도 있습니다. 전기적 마진 문제는 논리 시뮬레이션에서 재현되지 않고, 아주 긴 시나리오는 시뮬레이션으로 돌릴 수 없습니다. 이럴 때는 scan dump(Ch 16)나 trace(Ch 15) 같은 실리콘 측 증거와 타이밍 분석 결과로 확정합니다. 어떤 경우든 확정의 기준은 "재현할 수 있고, 원인을 설명할 수 있다"입니다.

## SW workaround 설계 원칙

다리를 다친 사람은 뼈가 붙을 때까지 깁스를 하고 목발을 짚습니다. 깁스는 치료가 아니지만, 그 기간 동안 생활을 가능하게 합니다. **workaround**(실리콘 버그를 고치지 않고 소프트웨어로 피해 가는 우회 방법)도 같습니다. 칩을 고치지는 못하지만, 다음 스테핑이 나올 때까지 제품이 동작하게 합니다. 그리고 깁스처럼, 언젠가 떼어 낼 것을 전제로 만들어야 합니다.

좋은 workaround는 다음 원칙을 지킵니다.

1. **영향받는 칩에서만 켭니다.** 칩의 리비전 ID 레지스터를 읽어, 버그가 있는 스테핑에서만 workaround를 적용합니다. 고쳐진 칩에서까지 성능을 잃을 이유가 없습니다.
2. **한 곳에 모읍니다.** 같은 workaround가 코드 여러 곳에 흩어지면 나중에 하나를 빠뜨립니다.
3. **errata ID를 남깁니다.** 코드 주석과 커밋 메시지에 errata 번호를 적어, 왜 이 코드가 있는지 추적할 수 있게 합니다.
4. **끌 수 있게 만듭니다.** 빌드 옵션이나 부트 파라미터로 workaround를 끌 수 있어야, 버그 재현이나 성능 비교를 할 수 있습니다.
5. **실패해도 안전한 쪽을 고릅니다.** 리비전을 판단할 수 없다면 workaround를 켜는 쪽이 안전합니다.

리눅스 커널에는 이 원칙을 체계화한 실제 사례가 있습니다. arm64 아키텍처 코드는 Arm 코어의 errata마다 `ARM64_ERRATUM_` 접두사가 붙은 Kconfig 옵션을 두고, 부팅할 때 코어의 ID 레지스터(MIDR)를 읽어 영향받는 코어에서만 workaround를 켭니다. 커널 문서에는 어떤 errata에 어떤 옵션이 대응하는지 정리한 목록도 있습니다. 칩 회사의 드라이버도 같은 구조를 따르면 좋습니다.

아래 코드는 이 원칙을 드라이버에 적용한 **예시**입니다. errata 번호, 레지스터 이름, 리비전 값은 모두 가상입니다. 리비전으로 적용 여부를 정하되 리비전을 모르면 켜는 쪽으로 정하고, 모듈 파라미터로 끌 수 있게 했으며, 적용 사실을 로그로 남깁니다.

```c
/* SOC-ERR-0042 (예시): A0 스테핑의 DMA 엔진은 특정 조건에서
 * 디스크립터 prefetch가 옛 값을 읽을 수 있다. A1에서 수정됨. */
static bool disable_err0042_wa;
module_param(disable_err0042_wa, bool, 0444);

static bool soc_needs_err0042(struct mydma *md)
{
    u32 rev = readl(md->sysctl + SYSCTL_REVISION) & REV_MASK;
    return !disable_err0042_wa && (rev == REV_A0 || !soc_rev_known(rev));
}

static void mydma_apply_errata(struct mydma *md)
{
    if (soc_needs_err0042(md)) {
        md->ctrl &= ~DMA_CTRL_DESC_PREFETCH;      /* prefetch 끄기 */
        dev_info(md->dev, "applying SOC-ERR-0042 workaround (A0)\n");
    }
}
```

## workaround의 비용 — 성능과 유지보수

workaround는 공짜가 아닙니다. 기능을 끄거나 추가 동작을 넣으면 성능이 떨어지고, 코드 경로가 갈라지면 유지보수 부담이 늘어납니다. 그래서 workaround를 설계할 때는 비용을 함께 기록하고, 그 비용이 다음 스테핑 결정에 반영되도록 해야 합니다.

| 비용 종류 | 예 | 줄이는 방법 |
|---|---|---|
| 성능 | 기능 비활성화, 추가 장벽·캐시 관리, 폴링 전환 | 영향받는 경로에만 적용, 실측해서 기록 |
| 전력 | 저전력 모드 사용 금지, 클럭 상시 공급 | 조건을 좁혀 필요한 상황에서만 적용 |
| 유지보수 | 스테핑별 코드 분기, 테스트 조합 증가 | 한 곳에 모으기, 스테핑별 CI 유지 |
| 망각 위험 | 고쳐진 칩에서도 workaround가 계속 켜짐 | 리비전 조건 필수, 제거 계획을 errata에 기록 |

workaround의 비용이 얼마나 커질 수 있는지 보여 주는 대표적인 사례가 2018년에 공개된 Meltdown입니다. 많은 프로세서의 추측 실행에서 생긴 이 보안 결함은 칩을 바로 고칠 수 없었기 때문에, 운영체제가 커널과 사용자 공간의 페이지 테이블을 분리하는 방식(리눅스에서는 KPTI라고 부름)으로 우회했습니다. 이 workaround는 시스템 콜이 잦은 워크로드에서 눈에 띄는 성능 저하를 가져왔고, 이후 나온 프로세서들은 하드웨어 수준의 대응을 넣게 됐습니다. workaround의 비용이 충분히 크면, 그 비용 자체가 하드웨어 수정의 근거가 된다는 사실을 보여 줍니다.

## errata 문서 쓰기

errata는 약 설명서의 부작용 항목과 비슷합니다. 어떤 상황에서 무슨 일이 생길 수 있는지, 그럴 때 어떻게 해야 하는지, 언제 고쳐지는지를 사용자가 알 수 있게 씁니다. 칩 회사들은 이런 문서를 공개하는데, Intel은 이를 "Specification Update"라는 이름으로 내기도 합니다.

좋은 errata 항목은 읽는 사람이 세 가지 질문에 답할 수 있게 합니다. 내 제품이 영향을 받는가, 영향을 받으면 무엇을 해야 하는가, 언제 해결되는가입니다. 아래는 사내 errata 항목을 관리하는 형식의 예시입니다.

```yaml
- id: SOC-ERR-0042
  title: "DMA 디스크립터 prefetch가 옛 값을 읽을 수 있음"
  affected_steppings: [A0]
  fixed_in: A1
  severity: high                     # 데이터 손상 가능
  conditions: >
    descriptor prefetch가 켜져 있고, 직전 fetch 직후 짧은 시간 안에
    CPU가 디스크립터 ring을 다시 쓸 때
  implication: "DMA가 이전 디스크립터 내용으로 전송할 수 있음"
  workaround: "A0에서 descriptor prefetch 비활성화 (driver: mydma)"
  workaround_cost: "대량 소형 전송에서 처리량 감소, 실측값은 링크한 보고서 참조"
  sw_reference: "drivers/dma/mydma.c: mydma_apply_errata()"
  status: fixed-in-next-stepping
```

쓸 때 주의할 점이 몇 가지 있습니다. 조건은 가능한 한 구체적으로 씁니다. "가끔 데이터가 깨질 수 있음"은 고객에게 아무 도움이 안 됩니다. 영향을 받지 않는 조건도 함께 쓰면 좋습니다. 그래야 고객이 자기 사용 방식이 안전한지 판단할 수 있습니다. 그리고 workaround의 비용을 숨기지 않습니다. 비용을 모르고 workaround를 적용한 고객은 나중에 성능 문제로 다시 찾아옵니다.

## metal ECO와 스테핑 관리

버그를 칩에서 고치기로 했다면, 다음 스테핑(A0·A1·B0 같은 이름을 붙임)에 수정을 넣습니다. 이때 수정 범위가 비용을 결정합니다.

칩은 여러 층의 마스크로 만듭니다. 아래쪽은 트랜지스터를 만드는 층이고, 위쪽은 트랜지스터를 연결하는 금속 배선층입니다. **metal ECO**(engineering change order, 위쪽 금속 배선층의 마스크만 바꿔 회로 연결을 고치는 수정)는 트랜지스터 층을 그대로 두고 배선만 바꿉니다. 옷으로 치면 단추 위치를 옮기는 수선이고, 트랜지스터 층까지 바꾸는 것은 옷을 새로 짓는 일입니다.

![스테핑과 마스크 — A0에서 A1로 가는 metal ECO는 상위 금속층 마스크만 새로 만들고, B0처럼 base layer를 바꾸면 트랜지스터층까지 모든 마스크를 새로 만든다](/images/blog/debugging/embedded/diagrams/ch20-stepping.svg)

metal ECO로 논리를 고칠 수 있는 이유는, 설계 단계에서 칩 곳곳에 **예비 셀**(spare cell, 쓰지 않는 상태로 미리 뿌려 둔 여분의 논리 게이트)을 넣어 두기 때문입니다. 버그를 고치는 데 게이트 몇 개가 필요하면, 가까운 예비 셀을 배선으로 연결해서 씁니다. 예비 셀로 해결할 수 없을 만큼 큰 수정이라면 base layer부터 다시 만들어야 하고, 비용과 기간이 크게 늘어납니다. 흔히 metal 수정은 숫자를 올리고(A0 → A1), base layer 수정은 알파벳을 올리는(A1 → B0) 방식으로 이름을 붙이지만, 이 관례는 회사마다 다릅니다.

다음 스테핑에서 고칠지는 여러 요소를 함께 보고 정합니다.

| 판단 요소 | 고치는 쪽으로 기우는 경우 |
|---|---|
| 심각도 | 데이터 손상, 보안, 안전 문제 |
| workaround 비용 | 성능·전력 손실이 크거나 workaround가 불완전함 |
| 영향 범위 | 주요 고객의 주요 사용 방식에 걸림 |
| 수정 범위 | 예비 셀로 metal ECO가 가능함 |
| 일정 | 다음 스테핑이 이미 계획되어 있어 함께 넣을 수 있음 |

하드웨어 결함이 얼마나 큰 비용이 될 수 있는지는 유명한 두 사례가 보여 줍니다. 1994년 Intel Pentium의 FDIV 버그는 부동소수점 나눗셈에 쓰는 표의 일부 항목이 빠져서 드물게 틀린 결과를 내는 결함이었습니다. 한 수학 교수가 계산 결과의 이상함을 추적하다 발견했고, Intel은 처음에는 일반 사용자에게 영향이 적다고 설명했다가 여론에 밀려 교체 프로그램을 시행했습니다. 이 일로 Intel은 4억 7,500만 달러를 비용으로 처리했고, 수정은 이후 스테핑에 들어갔습니다. 2011년에는 Intel 6 시리즈 칩셋(코드명 Cougar Point)의 SATA 포트 일부가 시간이 지나면서 성능이 떨어질 수 있는 결함이 발견됐습니다. Intel은 출하를 멈추고 수정된 스테핑(B3)으로 교체했습니다. 두 사례 모두 workaround만으로는 넘어갈 수 없는 결함이 스테핑 교체와 대규모 비용으로 이어진 경우입니다.

## 작은 예시 — SOC-ERR-0042의 일생

앞의 예시 errata가 어떻게 흘러가는지 처음부터 끝까지 따라가 보겠습니다. 모든 이름은 가상입니다.

1. **증상:** 고객 시험에서 DMA 전송 결과가 몇 시간에 한 번 이전 전송의 데이터로 채워집니다.
2. **판정:** 전압·온도와 무관하고, 캐시 관리와 장벽을 모두 점검해도 남습니다. 디스크립터를 다시 쓴 직후에 시작한 전송에서만 일어난다는 조건을 찾아 최소 코드로 줄입니다(Ch 19).
3. **확정:** 같은 시나리오를 시뮬레이션에서 돌리자 prefetch 로직이 무효화 신호를 놓치는 cycle이 waveform에 보입니다. RTL 버그로 확정하고 SOC-ERR-0042를 발급합니다.
4. **workaround:** A0에서만 prefetch를 끄는 코드를 드라이버에 넣고, 처리량 손실을 측정해 errata에 기록합니다.
5. **수정 결정:** 데이터 손상이라 심각도가 높고, 예비 셀 두 개로 고칠 수 있어 A1의 metal ECO에 포함합니다.
6. **마무리:** A1이 나오면 리비전 조건 덕분에 workaround가 자동으로 꺼집니다. A1에서 같은 시험을 다시 돌려 수정을 검증하고, errata 상태를 "A1에서 수정됨"으로 바꿉니다.

## 자주 하는 실수

- **리비전 조건 없이 workaround를 넣습니다.** 고쳐진 칩에서도 성능을 계속 잃고, 몇 년 뒤에는 왜 그 코드가 있는지 아무도 모르게 됩니다.
- **문서 불일치를 바로 버그로 보고합니다.** 문서 오타인지, 부트 ROM의 영향인지 먼저 확인해야 합니다.
- **errata 조건을 모호하게 씁니다.** 고객이 자기 제품이 영향을 받는지 판단할 수 없게 됩니다.
- **workaround 비용을 기록하지 않습니다.** 다음 스테핑에서 고칠지 판단할 근거가 사라집니다.
- **수정된 스테핑에서 재검증을 빠뜨립니다.** metal ECO가 원래 버그를 고쳤는지, 다른 문제를 만들지 않았는지 같은 시험으로 확인해야 합니다.

## 정리

- HW 버그 판정 뒤에는 workaround, errata, 다음 스테핑 결정이라는 새로운 일이 이어집니다.
- 문서와 실리콘이 다르면 스펙·RTL·문서 중 무엇이 틀렸는지부터 정합니다. 리셋값 비교는 불일치를 빨리 찾는 방법입니다.
- 버그 확정의 기준은 "재현할 수 있고, 원인을 설명할 수 있다"입니다. 가능하면 pre-silicon에서 재현합니다.
- workaround는 영향받는 스테핑에서만, 한 곳에서, errata ID와 함께, 끌 수 있게 만듭니다. 리눅스 arm64의 errata 옵션 구조가 좋은 본보기입니다.
- workaround의 성능·전력·유지보수 비용을 기록하면, 그 비용이 하드웨어 수정의 근거가 됩니다.
- errata는 영향 여부, 대응 방법, 해결 시점을 독자가 판단할 수 있게 씁니다.
- metal ECO는 예비 셀과 상위 금속층만으로 고치는 싼 수정이고, base layer 수정은 사실상 새로 만드는 일입니다.

## 다음 장 예고

다음 장에서는 post-silicon 파트의 마지막으로 **양산·필드 불량**을 다룹니다. 실험실이 아닌 고객의 손에서 발견되는 불량을 SoC ramdump, RMA 흐름, 로트·온도 통계, 실패 분석 팀과의 협업으로 추적하는 방법을 정리합니다.

## 관련 항목

- [Ch 19: HW냐 SW냐](/blog/tools/debugging/embedded/chapter19-hw-or-sw-triage)
- [Ch 21: 양산·필드 불량](/blog/tools/debugging/embedded/chapter21-field-failure-fa)
- [Ch 16: Scan Dump와 DFT](/blog/tools/debugging/embedded/chapter16-scan-dump-dft) — 실리콘 측 증거 수집
- [Driver-RTL Co-simulation Ch 15: Pre-silicon 실패 triage](/blog/tools/emulation/driver-cosim/chapter15-failure-triage) — 시뮬레이션으로 재현하기
- [BSP Development Ch 2: 데이터시트](/blog/embedded/bsp/chapter02-datasheet) — 데이터시트와 errata 읽기
- [BSP Development Ch 21: 유지보수](/blog/embedded/bsp/chapter21-maintenance) — 스테핑이 바뀐 뒤의 BSP 관리
