---
title: "Scan Dump와 DFT — 테스트 회로를 디버깅에 쓰기"
slug: "tools/debugging/embedded/chapter16-scan-dump-dft"
date: 2026-10-05T10:16:00
description: "양산 테스트용 scan chain을 칩 내부 상태 덤프로 활용하는 방법과 그 한계를 공개 자료 범위에서 정리."
series: "Embedded Debugging"
seriesOrder: 16
tags: [dft, scan-chain, scan-dump, post-silicon, debugging]
draft: true
topics: ["tools", "tools/debugging"]
---

Ch 14와 Ch 15에서는 디버거 없이 칩이 스스로 흔적을 남기게 하는 방법(postcode, watchdog, trace 링 버퍼)을 봤습니다. 그런데 그 흔적조차 남지 않는 경우가 있습니다. 코어가 멈췄는데 trace 버퍼에는 아무것도 없고, 버스는 응답하지 않으며, 디버거는 접속 자체를 거부합니다.

이럴 때 마지막으로 꺼내는 도구가 **scan dump**입니다. 원래 양산 테스트를 위해 칩에 넣어 둔 회로를 빌려서, 멈춘 순간 칩 안의 플립플롭 값을 통째로 꺼내 보는 기법입니다. 이 장은 scan dump가 무엇이고 어떤 흐름으로 쓰는지, 그리고 왜 아무 때나 쓸 수 없는지를 공개된 자료 범위에서 정리합니다. 구체적인 절차와 도구는 칩 회사와 DFT 도구마다 크게 다르므로, 여기서는 원리와 판단 기준에 집중합니다.

## 모든 경로가 막혔을 때

이런 상황을 떠올려 보겠습니다. 새 SoC에서 특정 워크로드를 몇 시간 돌리면 시스템이 완전히 멈춥니다. SW 쪽에서 보면 커널 로그가 갑자기 끊기고, watchdog 리셋조차 일어나지 않습니다. HW 쪽에서 보면 전원과 클럭은 정상인데 디버거로 코어에 접근하면 timeout이 납니다. 인터커넥트 어딘가가 응답을 기다리며 영원히 멈춘 것으로 보이지만, 그게 어디인지 알 방법이 없습니다.

pre-silicon이었다면 waveform을 열어 멈춘 cycle의 모든 신호를 봤을 것입니다. 실리콘에서는 그 신호들이 칩 안에 갇혀 있습니다. 디버거는 코어와 버스가 살아 있어야 쓸 수 있는 도구라서, 버스 자체가 멈추면 함께 무력해집니다. 엘리베이터가 층 사이에 멈췄는데 인터폰까지 끊긴 상황과 비슷합니다. 안에서 무슨 일이 있는지 물어볼 통로가 없습니다.

scan dump는 기능 경로를 전혀 거치지 않는 별도의 통로로 칩 상태를 꺼냅니다. 그래서 버스가 멈춰도, 코어가 응답하지 않아도 쓸 수 있습니다. 대가는 크지만, 다른 모든 경로가 막혔을 때 남는 거의 유일한 통로입니다.

## scan chain 기초

scan dump를 이해하려면 먼저 **DFT**(Design for Test, 양산 테스트를 쉽게 하려고 설계 단계에서 칩에 넣는 회로)를 알아야 합니다. 칩 공장에서는 만든 칩 하나하나가 제대로 동작하는지 검사해야 합니다. 그런데 칩 안의 플립플롭은 수백만 개가 넘고, 외부 핀은 몇백 개뿐입니다. 핀으로 신호를 넣고 빼는 것만으로는 내부를 충분히 검사할 수 없습니다.

그래서 설계 단계에서 플립플롭 대부분을 **scan 플립플롭**으로 바꿉니다. scan 플립플롭은 입력 앞에 선택기(MUX)가 하나 붙어 있어서, 평소에는 원래 기능 경로의 값을 받고, 테스트 모드에서는 옆 플립플롭의 출력을 받습니다. 테스트 모드에서 플립플롭들이 한 줄로 연결된 것을 **scan chain**이라고 부릅니다. 염주 알을 실 하나에 꿰어 놓은 모습과 비슷합니다. 실 한쪽 끝에서 구슬을 밀어 넣으면 반대쪽 끝으로 하나씩 밀려 나옵니다.

![Scan chain — 각 플립플롭 앞의 MUX가 기능 경로와 시프트 경로를 고르고, scan enable이 1이면 플립플롭들이 scan_in에서 scan_out까지 한 줄로 연결된다](/images/blog/debugging/embedded/diagrams/ch16-scan-chain.svg)

양산 테스트에서는 이 줄을 이렇게 씁니다.

1. scan 모드에서 테스트 패턴을 한 비트씩 밀어 넣어(shift in) 모든 플립플롭을 원하는 값으로 채웁니다.
2. 기능 모드로 한 cycle만 돌려(capture) 조합 논리의 결과를 플립플롭에 받습니다.
3. 다시 scan 모드로 바꿔 결과를 밀어 내며(shift out) 기대값과 비교합니다.

이 패턴은 ATPG(Automatic Test Pattern Generation, 고장 모델을 바탕으로 테스트 패턴을 자동으로 만드는 도구)가 만듭니다. 칩 하나에 scan chain이 수십에서 수천 개 있을 수 있고, 테스트 시간을 줄이려고 패턴을 압축해서 넣고 빼는 구조를 함께 쓰는 경우가 많습니다.

SW 엔지니어 입장에서 기억할 점은 하나입니다. **칩 안의 플립플롭 대부분은 이미 "한 줄로 꺼낼 수 있는" 통로에 연결되어 있다**는 사실입니다. scan dump는 이 통로를 양산 테스트 대신 디버깅에 씁니다.

## scan dump로 상태 꺼내기

scan dump의 아이디어는 단순합니다. 문제가 생긴 순간에 클럭을 멈춰 모든 플립플롭 값을 고정하고, scan 모드로 바꿔서 그 값을 밖으로 밀어 냅니다. 술래가 "얼음"을 외치면 모두 그 자세로 멈추는 놀이와 같습니다. 멈춘 자세를 하나씩 기록하면 그 순간의 전체 장면이 남습니다.

![Scan dump의 흐름 — 트리거, 클럭 정지, scan 모드 진입, shift out, 매핑 파일로 복원, 시뮬레이션과 비교](/images/blog/debugging/embedded/diagrams/ch16-scan-dump-flow.svg)

단계별로 보면 각 단계에서 HW와 SW가 맡는 일이 다릅니다.

| 단계 | 무엇을 하나 | 누가 주로 다루나 |
|---|---|---|
| 트리거 | 문제가 생긴 순간을 알아챔. watchpoint, 성능 카운터, 외부 신호, hang 감지 타이머 등 | SW·검증 엔지니어가 조건을 정함 |
| 클럭 정지 | 칩 전체 또는 관심 영역의 클럭을 멈춤. 칩에 클럭 정지 회로가 있어야 함 | HW(DFT) 설계 |
| scan 모드 진입 | scan enable을 켜서 플립플롭을 chain으로 연결 | 테스트 접근 경로(JTAG 등) |
| shift out | chain 길이만큼 클럭을 넣어 비트열을 밖으로 읽음 | 랩 장비 또는 테스터 |
| 복원·비교 | 비트열을 신호 이름으로 바꾸고 기대 상태와 비교 | HW·SW 공동 |

여기서 가장 까다로운 부분은 첫 두 단계입니다. 트리거가 늦으면 이미 상태가 흐트러진 뒤를 찍게 되고, 클럭이 영역마다 따로 멈추면 서로 다른 시점의 상태가 섞입니다. 사진을 찍는 순간 일부 사람만 움직이면 단체 사진이 이상해지는 것과 같습니다. 그래서 칩마다 "클럭을 어떻게, 어디까지 멈출 수 있는가"가 scan dump의 실용성을 결정합니다. 이 기능이 있는지, 어떤 순서로 써야 하는지는 해당 칩의 DFT 문서에서 확인해야 합니다.

접근 경로는 보통 JTAG입니다(Ch 2에서 본 TAP 상태 머신). 칩마다 scan 제어용 JTAG 명령을 따로 두는 경우가 많고, 양산 테스터에 칩을 올려 직접 scan 핀을 쓰는 방법도 있습니다. 어느 쪽이든 **shift out을 시작하는 순간 칩의 기능 상태는 망가진다**는 점은 같습니다. 플립플롭 값을 밀어 내는 동안 원래 값이 사라지므로, 덤프 뒤에는 반드시 리셋해야 합니다. 한 번의 hang에서 덤프는 한 번만 뜰 수 있다는 뜻입니다.

## 덤프를 RTL 신호로 되돌리기

shift out으로 얻은 것은 수백만 비트짜리 0과 1의 나열입니다. 이것만으로는 아무 의미가 없습니다. 각 비트가 RTL의 어떤 신호인지 알려 주는 지도가 필요합니다. 이 지도를 보통 **scan 매핑 파일**이라고 부르며, DFT 도구가 scan 삽입 단계에서 만듭니다. 지도의 범례가 없으면 기호만 가득한 그림이 되는 것처럼, 매핑 파일이 없으면 덤프는 읽을 수 없습니다.

매핑 파일의 형식은 도구마다 다릅니다. 아래는 이해를 돕기 위한 **개념적인 예시**로, chain 이름과 비트 위치, 그 비트가 해당하는 RTL 신호, 그리고 반전 여부를 담고 있습니다. 실제 파일의 형식은 사용하는 DFT 도구의 문서를 따라야 합니다.

```text
# chain   bit   rtl_signal                                   invert
chain_07  0     soc.noc.router3.vc_state_q[0]                0
chain_07  1     soc.noc.router3.vc_state_q[1]                0
chain_07  2     soc.noc.router3.credit_cnt_q[0]              1
chain_07  3     soc.noc.router3.credit_cnt_q[1]              1
chain_07  4     soc.noc.router3.credit_cnt_q[2]              1
chain_12  0     soc.dma0.ch2.state_q[0]                      0
```

복원 과정은 결국 "비트열 + 매핑 파일 → 신호 이름별 값"의 변환입니다. 아래 스크립트는 그 변환의 뼈대를 보여 줍니다. chain별 비트열을 읽고, 매핑 파일에 따라 신호 이름에 값을 붙인 뒤, 같은 이름의 bus 비트를 모아 정수로 만듭니다.

```python
import re
from collections import defaultdict

def load_map(path):
    rows = []
    for line in open(path):
        if line.startswith("#") or not line.strip():
            continue
        chain, bit, sig, inv = line.split()
        rows.append((chain, int(bit), sig, inv == "1"))
    return rows

def restore(bits_by_chain, mapping):
    values = defaultdict(dict)             # "a.b.c_q" -> {index: bit}
    for chain, bit, sig, inv in mapping:
        v = int(bits_by_chain[chain][bit]) ^ inv
        m = re.match(r"(.+)\[(\d+)\]$", sig)
        name, idx = (m.group(1), int(m.group(2))) if m else (sig, 0)
        values[name][idx] = v
    return {n: sum(b << i for i, b in bits.items()) for n, bits in values.items()}

state = restore({"chain_07": "01111", "chain_12": "1"}, load_map("scan_map.txt"))
print(state["soc.noc.router3.credit_cnt_q"])   # 반전을 되돌린 credit 카운터 값
```

이렇게 복원한 값은 두 가지로 씁니다. 첫째, 의심 가는 블록의 상태 머신과 카운터를 직접 읽습니다. 위 예시라면 NoC 라우터의 credit 카운터(상대에게 보낼 수 있는 패킷 수를 세는 값)가 0에 멈춰 있는지 확인해, 흐름 제어가 교착됐는지 판단할 수 있습니다. 둘째, 가능하다면 같은 시나리오를 시뮬레이션에서 돌려 같은 cycle의 상태와 비교합니다. 다만 실리콘과 시뮬레이션의 cycle을 정확히 맞추기는 어렵습니다. 리셋부터 클럭까지 완전히 결정론적인 환경이 아니라면, 비교는 "이 상태가 시뮬레이션에서 나올 수 있는 상태인가" 정도의 질문으로 좁히는 편이 현실적입니다.

## 한계와 비용

scan dump는 강력하지만 아무 때나 꺼낼 수 있는 도구는 아닙니다. 한계를 미리 알아야 기대를 맞출 수 있습니다.

| 한계 | 왜 생기나 | 실무에서의 의미 |
|---|---|---|
| 메모리는 안 보임 | SRAM·레지스터 파일 같은 메모리 배열은 보통 scan chain에 들어가지 않음 | 캐시·FIFO 내용은 별도 경로(메모리 덤프 기능)가 없으면 알 수 없음 |
| 한 번만 뜰 수 있음 | shift out이 기능 상태를 덮어씀 | 재현이 어려운 hang이라면 그 한 번을 위해 준비를 철저히 해야 함 |
| 트리거·클럭 정지 정밀도 | 칩의 클럭 정지 회로 설계에 좌우됨 | 정지 기능이 없거나 거칠면 덤프가 여러 시점의 상태로 섞임 |
| 압축 구조 | 테스트 시간을 줄이려는 압축 회로가 chain 앞뒤에 있음 | 압축을 우회하는 모드가 없으면 원래 비트를 꺼내기 어려움 |
| 매핑 파일 관리 | 스테핑(같은 칩을 고쳐 다시 만든 버전, A0·A1 등)마다 scan 순서가 바뀔 수 있음 | 덤프한 칩의 스테핑과 정확히 같은 버전의 매핑 파일이 있어야 함 |
| 보안 잠금 | 양산 칩에서는 scan 접근을 막아 두는 것이 일반적 | 개발용 샘플에서만 쓸 수 있는 경우가 많음 |

마지막 항목은 특히 눈여겨봐야 합니다. scan chain은 칩 안의 거의 모든 상태를 읽고 쓸 수 있는 통로이므로, 그대로 열어 두면 보안 구멍이 됩니다. 실제로 2000년대 중반부터 학계에서 scan chain을 이용해 암호 칩의 비밀 키를 빼내는 공격이 여러 차례 보고됐습니다. 그래서 양산 칩은 eFuse(한 번 끊으면 되돌릴 수 없는 퓨즈 비트, Bootloader Ch 23 참고) 등으로 scan 접근을 막거나 인증을 요구하는 경우가 많습니다. 필드에서 돌아온 불량 칩을 scan dump로 분석하려면, 이 잠금을 다룰 수 있는 권한과 절차가 있어야 합니다.

비용 측면에서도 scan dump는 비쌉니다. 준비에는 DFT 팀의 도움이 필요하고, 덤프 한 번에 랩 장비와 사람이 묶이며, 결과를 해석하는 데 RTL을 아는 사람이 붙어야 합니다. 그래서 실무에서는 다음 순서를 지킵니다. 먼저 postcode, trace, 버스 timeout 같은 가벼운 수단을 다 써 보고(Ch 14·15), 그래도 원인이 안 보이고 재현이 가능할 때 scan dump를 계획합니다.

## 작은 예시 — 멈춘 인터커넥트 찾기

앞의 hang 사례를 scan dump로 끝까지 따라가 보겠습니다. 숫자와 블록 이름은 설명을 위한 가상의 값입니다.

1. **트리거를 정합니다.** SW 팀이 hang 직전에 항상 특정 DMA 채널이 큰 전송을 시작한다는 것을 로그에서 찾았습니다. 그래서 "DMA 시작 후 일정 시간 동안 완료 인터럽트가 없으면" 클럭 정지를 거는 hang 감지 조건을 준비합니다.
2. **덤프를 뜹니다.** 재현까지 몇 시간을 기다린 끝에 트리거가 걸리고, JTAG으로 모든 chain을 읽어 냅니다. 칩은 리셋합니다.
3. **복원합니다.** 매핑 파일로 NoC 라우터와 DMA 상태 머신의 값을 복원합니다. 라우터 하나의 credit 카운터가 0이고, 그 라우터로 들어가려는 요청이 여러 개 쌓여 있습니다. DMA 채널은 "응답 대기" 상태에 멈춰 있습니다.
4. **가설을 세우고 확인합니다.** 특정 순서로 요청이 겹치면 credit이 반환되지 않는 경로가 있다는 가설을 세우고, 같은 요청 순서를 시뮬레이션에서 만들어 봅니다. 시뮬레이션에서도 같은 교착이 재현되면 RTL 버그로 확정하고 Ch 20의 흐름(errata, 즉 칩 결함 공지 문서·workaround·ECO)으로 넘깁니다.

이 과정에서 SW 팀의 로그가 트리거 조건을 만들었고, HW 팀의 매핑과 시뮬레이션이 원인을 확정했습니다. scan dump는 두 팀이 함께 써야 제 역할을 합니다.

## 자주 하는 실수

- **매핑 파일 버전을 확인하지 않습니다.** 다른 스테핑의 매핑 파일로 복원하면 그럴듯하지만 틀린 값이 나옵니다. 덤프 기록에 칩의 스테핑과 매핑 파일 버전을 함께 남겨야 합니다.
- **반전 비트를 잊습니다.** scan 경로에는 반전된 비트가 섞여 있을 수 있습니다. 매핑 파일의 반전 정보를 빼먹으면 카운터 값이 엉뚱하게 보입니다.
- **메모리 내용까지 기대합니다.** scan dump로 캐시나 FIFO 내용을 볼 수 있다고 가정했다가 실망하는 경우가 많습니다. 메모리 배열은 별도 기능이 필요합니다.
- **트리거 없이 덤프합니다.** 시스템이 멈춘 뒤 한참 지나서 덤프하면, 그 사이 다른 회로가 상태를 바꿔 놓았을 수 있습니다. 가능하면 hang을 감지하는 즉시 클럭을 멈춰야 합니다.
- **가벼운 수단을 건너뜁니다.** 버스 timeout 레지스터 한 번만 읽어 봤어도 알 수 있었던 원인을 scan dump로 며칠 걸려 찾는 일이 생깁니다.

## 정리

- scan dump는 양산 테스트용 scan chain을 빌려, 멈춘 순간 칩 안 플립플롭 값을 통째로 꺼내는 기법입니다.
- DFT는 양산 테스트를 위해 칩에 넣는 회로이고, scan chain은 테스트 모드에서 플립플롭을 한 줄로 연결한 통로입니다.
- 흐름은 **트리거 → 클럭 정지 → scan 모드 → shift out → 매핑 파일로 복원 → 기대 상태와 비교**입니다.
- shift out은 기능 상태를 덮어쓰므로 한 번의 hang에서 덤프는 한 번뿐이고, 덤프 뒤에는 리셋해야 합니다.
- 메모리 배열은 보통 보이지 않고, 압축 구조와 보안 잠금, 매핑 파일 버전이 실용성을 제한합니다.
- 비용이 크므로 postcode·trace·버스 timeout 같은 가벼운 수단을 먼저 쓰고, 재현이 가능할 때 계획적으로 씁니다.
- 구체적인 절차와 파일 형식은 칩과 DFT 도구마다 다르므로, 해당 칩의 DFT 문서를 기준으로 삼아야 합니다.

## 다음 장 예고

다음 장에서는 bring-up 계단의 "메모리" 칸으로 돌아가 **메모리 bring-up triage**를 다룹니다. DDR이 안 뜰 때 문제가 보드인지, PHY 설정인지, 칩인지를 가르는 실험과 마진·ECC 에러 패턴을 읽는 법을 정리합니다.

## 관련 항목

- [Ch 15: 죽기 직전의 실행 흐름](/blog/tools/debugging/embedded/chapter15-trace-before-death) — scan dump 전에 써 볼 가벼운 수단
- [Ch 17: 메모리 bring-up triage](/blog/tools/debugging/embedded/chapter17-memory-bringup)
- [Ch 14: JTAG 없이 Hang 잡기](/blog/tools/debugging/embedded/chapter14-hang-without-jtag) — 버스 hang과 인터커넥트 timeout
- [Ch 2: JTAG·SWD·CoreSight 분석](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — scan 접근에 쓰는 TAP
- [Bootloader Internals Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp) — 디버그·테스트 접근 잠금
- [Driver-RTL Co-simulation Ch 16: 디버그 훅을 테이프아웃 전에 심기](/blog/tools/emulation/driver-cosim/chapter16-pre-to-post-handoff) — 클럭 정지와 디버그 경로를 미리 설계하기
