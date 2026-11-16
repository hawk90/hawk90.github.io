---
title: "CXL 커널 드라이버 디버깅 — ftrace·bpftrace·drgn 활용"
slug: "tools/debugging/kernel/chapter08-cxl-driver-debug"
date: 2026-06-18T09:03:00
description: "Linux drivers/cxl/ 서브시스템 디버깅 — ftrace로 probe 흐름 추적, bpftrace로 mailbox 명령 캡처, drgn으로 커널 상태 검사."
series: "Kernel Debugging"
seriesOrder: 8
tags: [cxl, kernel-debugging, ftrace, bpftrace, drgn, cxl-core]
draft: false
topics: ["tools", "tools/debugging"]
---

## 실습 환경 — QEMU CXL Type 3 장치

CXL 장치가 없어도 QEMU는 CXL host bridge·root port·Type 3 메모리 장치를 에뮬레이션합니다. 이 장의 출력은 앞 장들과 같은 Debian 13.7 arm64 게스트(커널 `6.12.116+deb13-arm64`)를 아래 장치 구성으로 띄워서 얻었습니다. [Postmortem Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)와 같은 구성이고, TCG(소프트웨어 에뮬레이션)로 돌렸습니다. 그래서 아래 시간 값은 실제 장치보다 훨씬 큽니다.

```bash
qemu-system-aarch64 -M virt,gic-version=3,cxl=on -m 4g,maxmem=8g,slots=4 -smp 4 -cpu max ... \
  -object memory-backend-ram,id=vmem0,share=on,size=256M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G
```

게스트에서는 장치와 드라이버가 이렇게 보였습니다(`cxl`은 ndctl 81의 cxl-cli).

```text
$ lspci -nn | grep 0502
0d:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
$ lsmod | grep cxl
cxl_pmem               24576  0
libnvdimm             217088  1 cxl_pmem
cxl_mem                12288  0
cxl_pci                28672  0
cxl_acpi               24576  0
$ ls /sys/bus/cxl/devices/
decoder0.0
decoder1.0
decoder2.0
decoder2.1
decoder2.2
decoder2.3
endpoint2
mem0
nvdimm-bridge0
port1
root0
$ cxl list -M -D -u
[
  {
    "memdevs":[
      {
        "memdev":"mem0",
        "ram_size":"256.00 MiB (268.44 MB)",
        "serial":"0",
        "host":"0000:0d:00.0",
        "firmware_version":"BWFW VERSION 00"
      }
    ]
  },
  ...
]
```

## drivers/cxl/ 모듈 구성

CXL은 *여러 모듈로 분할*되어 있어 *한 모듈만 추적해서는 안 됩니다*. `cxl_core`가 공통 기반이고 나머지 모듈이 모두 그 위에 올라갑니다. `drivers/cxl/Makefile`(v6.12, 3~9행)은 built-in일 때의 순서를 주석으로 밝혀 둡니다.

| 순서 | 모듈 | 소스 | 역할 | Debian 6.12 |
|------|------|------|------|-------------|
| 1 | cxl_core | `core/` | port·decoder·region·memdev 객체, mailbox 공통부, CXL bus | built-in (`CONFIG_CXL_BUS=y`) |
| 2 | cxl_port | `port.c` | port 드라이버. platform root 드라이버(acpi)보다 먼저 | built-in |
| 3 | cxl_acpi | `acpi.c` | ACPI CEDT 파싱, CXL root·root decoder 등록 | 모듈 |
| 4 | cxl_pmem, cxl_mem | `pmem.c`·`security.c`, `mem.c` | persistent memory, memdev 드라이버 | 모듈 |
| 5 | cxl_pci | `pci.c` | PCI 드라이버. 레지스터 매핑·mailbox·memdev 생성 | 모듈 |

`lsmod`에 `cxl_core`·`cxl_port`가 없는 것은 이 커널에서 built-in이기 때문입니다. 문제가 *어느 모듈에서 발생*했는지에 따라 추적 도구의 대상도 달라집니다. 예를 들어 `available_filter_functions`에서 `cxl_pci_probe`는 `[cxl_pci]` 꼬리표가 붙지만 `cxl_internal_send_cmd`는 꼬리표가 없습니다.

```text
$ grep -E '^(cxl_pci_probe|cxl_mem_probe|cxl_port_probe|cxl_acpi_probe|cxl_internal_send_cmd|cxl_pci_mbox_send|cxl_decoder_commit)( |$)' \
    /sys/kernel/tracing/available_filter_functions
cxl_internal_send_cmd
cxl_decoder_commit
cxl_port_probe
cxl_acpi_probe [cxl_acpi]
cxl_pci_probe [cxl_pci]
cxl_pci_mbox_send [cxl_pci]
cxl_mem_probe [cxl_mem]
```

## ftrace로 probe 흐름

장치를 드라이버에서 떼었다 다시 붙이면 probe가 한 번 더 돕니다. PCI의 `unbind`·`bind` 파일로 `cxl_pci`만 다시 probe시키고, [Ch 3](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)의 `function_graph`를 `cxl_pci_probe` 아래 2단계로 제한했습니다.

```bash
D=0000:0d:00.0
T=/sys/kernel/tracing
echo "$D" > /sys/bus/pci/drivers/cxl_pci/unbind     # mem0, endpoint2 등이 사라짐
echo function_graph > $T/current_tracer
echo cxl_pci_probe > $T/set_graph_function
echo 2 > $T/max_graph_depth
echo 1 > $T/tracing_on
echo "$D" > /sys/bus/pci/drivers/cxl_pci/bind       # probe 다시 실행
sleep 3
echo 0 > $T/tracing_on
cat $T/trace
```

```text
 2)               |  cxl_pci_probe [cxl_pci]() {
 2) + 70.000 us   |    pci_find_host_bridge();
 2) ! 734.000 us  |    pcim_enable_device();
 2) ! 275.000 us  |    pci_set_master();
 2) + 53.000 us   |    cxl_memdev_state_create();
 2) ! 251.000 us  |    pci_get_dsn();
 2) + 78.000 us   |    pci_find_dvsec_capability();
 2) # 1139.000 us |    cxl_pci_setup_regs [cxl_pci]();
 2) ! 707.000 us  |    cxl_map_device_regs();
 2) ! 303.000 us  |    cxl_pci_setup_regs [cxl_pci]();
 2) ! 136.000 us  |    cxl_map_component_regs();
 2) + 27.000 us   |    cxl_mailbox_init();
 2) ! 158.000 us  |    cxl_await_media_ready();
 2) * 11463.00 us |    pci_alloc_irq_vectors();
 2) + 37.000 us   |    cxl_pci_mbox_wait_for_doorbell [cxl_pci]();
 2) + 14.000 us   |    init_timer_key();
 2) + 83.000 us   |    pci_irq_vector();
 2) + 14.000 us   |    devm_kmalloc();
 2) # 5442.000 us |    devm_request_threaded_irq();
 2) # 1293.000 us |    cxl_enumerate_cmds();
 2) + 78.000 us   |    cxl_set_timestamp();
 2) + 57.000 us   |    cxl_poison_state_init();
 2) + 95.000 us   |    cxl_dev_state_identify();
 2) ! 129.000 us  |    cxl_mem_create_range_info();
 2) * 51562.00 us |    devm_cxl_add_memdev();
 2) # 2264.000 us |    devm_cxl_setup_fw_upload();
 2) + 83.000 us   |    devm_cxl_sanitize_setup_notifier();
 2) ! 186.000 us  |    cxl_count_regblock();
 2)               |    cxl_event_config [cxl_pci]() {
 3) * 17302.00 us |    } /* cxl_event_config [cxl_pci] */
 3) + 32.000 us   |    pcie_aer_is_native();
 3) + 87.000 us   |    pcie_capability_read_word();
 3) ! 833.000 us  |    pci_save_state();
 3) * 96555.00 us |  } /* cxl_pci_probe [cxl_pci] */
```

이 순서가 [Ch 9](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough#probe-흐름-추적)에서 소스로 읽은 `cxl_pci_probe()`의 단계와 그대로 맞습니다. 다만 소스의 함수 이름 일부가 trace에 없습니다. `cxl_pci_type3_init_mailbox()`, `cxl_alloc_irq_vectors()`, `cxl_pci_setup_mailbox()`, `cxl_pci_ras_unmask()`는 모두 `pci.c` 안의 `static` 함수이고, 이 커널의 `available_filter_functions`에 하나도 없었습니다. 컴파일러가 `cxl_pci_probe()` 안으로 인라인했기 때문에, 그 함수들이 부른 `cxl_mailbox_init()`, `pci_alloc_irq_vectors()`, `cxl_pci_mbox_wait_for_doorbell()`·`devm_request_threaded_irq()`, `pcie_aer_is_native()`·`pcie_capability_read_word()`가 대신 한 단계 위로 올라와 보입니다. 소스와 trace를 대조할 때는 이 점을 감안합니다.

시간은 TCG 에뮬레이션 기준이라 절대값은 의미가 없지만, 비율은 읽을 수 있습니다. 전체 96.6 ms 중 `devm_cxl_add_memdev()`가 51.6 ms, `cxl_event_config()`가 17.3 ms, `pci_alloc_irq_vectors()`가 11.5 ms였습니다. probe가 어디서 멈추는지 볼 때는 마지막으로 진입하고 반환하지 않은 함수가 이 표에서 찾을 곳입니다.

## dynamic_debug로 probe 메시지 켜기

`drivers/cxl`에는 `dev_dbg`가 많습니다. 이 커널의 `/proc/dynamic_debug/control`에서 `cxl`이 들어간 줄은 187개였습니다. [Ch 2](/blog/tools/debugging/kernel/chapter02-printk-dmesg)의 방법으로 켜고 다시 bind하면, 레지스터 탐색부터 mailbox 명령까지 probe가 무엇을 했는지 그대로 찍힙니다.

```text
# echo 'module cxl_pci +p' > /proc/dynamic_debug/control
# echo 'module cxl_core +p' > /proc/dynamic_debug/control
# echo 0000:0d:00.0 > /sys/bus/pci/drivers/cxl_pci/unbind
# echo 0000:0d:00.0 > /sys/bus/pci/drivers/cxl_pci/bind
# dmesg
[  172.356073] cxl_mem mem0: disconnect mem0 from port1
[  172.360904] cxl_pci 0000:0d:00.0: Mapped CXL Memory Device resource 0x0000000010210000
[  172.361063] cxl_pci 0000:0d:00.0: found Status capability (0x80)
[  172.361155] cxl_pci 0000:0d:00.0: found Mailbox capability (0x88)
[  172.361195] cxl_pci 0000:0d:00.0: found Memory Device capability (0x8a8)
...
[  172.361653] cxl_pci 0000:0d:00.0: found HDM decoder capability (0x128)
[  172.361728] cxl_pci 0000:0d:00.0: Set up component registers
[  172.363422] cxl_pci 0000:0d:00.0: Doorbell wait took 0ms
[  172.363468] cxl_pci 0000:0d:00.0: Mailbox payload sized 2048
[  172.364894] cxl_pci 0000:0d:00.0: Mailbox interrupts enabled
[  172.364974] cxl_pci 0000:0d:00.0: Sending command: 0x0400
...
[  172.365181] cxl_pci 0000:0d:00.0: Opcode 0x0005 unsupported by driver
...
[  172.365432] cxl_pci 0000:0d:00.0: Opcode 0x4000 enabled
...
[  172.365800] cxl_pci 0000:0d:00.0: Sending command: 0x4000
[  172.365818] cxl_pci 0000:0d:00.0: Doorbell wait took 0ms
[  172.365857] cxl_pci 0000:0d:00.0: DPA(ram): [mem 0x00000000-0x0fffffff flags 0x200]
[  172.366070] cxl_pci 0000:0d:00.0: DPA(pmem): no capacity
[  172.367331] cxl_mem mem0: scan: iter: mem0 dport_dev: 0000:0c:00.0 parent: pci0000:0c
[  172.367407] cxl_mem mem0: found already registered port port1:pci0000:0c
...
# echo 'module cxl_pci =_' > /proc/dynamic_debug/control
# echo 'module cxl_core =_' > /proc/dynamic_debug/control
```

`enabled`는 장치가 광고한 opcode가 드라이버의 명령 표(`cxl_mem_commands`)나 poison·security 명령에 있다는 뜻입니다(`core/mbox.c:725~755`의 `cxl_walk_cel()`). 그래서 `unsupported by driver`로 찍힌 0x0301·0x0100·0x0102·0x0103도 아래 bpftrace에서 보듯 드라이버가 내부적으로 보냅니다. 이 밖에도 mailbox payload가 2048바이트, DPA가 RAM 256 MiB(`0x00000000-0x0fffffff`), PMEM 없음이라는 것까지 나옵니다. `cxl list`의 `ram_size` 256 MiB와 같은 값입니다.

## bpftrace로 Mailbox 명령 캡처

CXL 디바이스와 호스트는 *mailbox*로 명령·응답을 주고받습니다. 커널 내부 명령의 공통 진입점은 `cxl_internal_send_cmd(struct cxl_mailbox *cxl_mbox, struct cxl_mbox_cmd *mbox_cmd)`(`drivers/cxl/core/mbox.c:244`)이고, opcode는 두 번째 인자의 `opcode` 필드에 있습니다. 필드 배치는 BTF에서 바로 확인할 수 있습니다.

```text
# bpftrace -lv 'struct cxl_mbox_cmd'
struct cxl_mbox_cmd {
	u16 opcode;
	void *payload_in;
	void *payload_out;
	size_t size_in;
	size_t size_out;
	size_t min_out;
	int poll_count;
	int poll_interval_ms;
	u16 return_code;
};
```

먼저 모든 명령을 찍어서, 다시 bind할 때 드라이버가 장치에 무엇을 보내는지 봤습니다.

```text
kprobe:cxl_internal_send_cmd {
  @op[tid] = ((struct cxl_mbox_cmd *)arg1)->opcode;
  @seen[tid] = 1;
}
kretprobe:cxl_internal_send_cmd /@seen[tid]/ {
  printf("%-8s opcode=0x%04x ret=%d\n", comm, @op[tid], retval);
  delete(@op[tid]);
  delete(@seen[tid]);
}
```

```text
Attaching 2 probes...
bash     opcode=0x0400 ret=0
bash     opcode=0x0401 ret=0
bash     opcode=0x0301 ret=0
bash     opcode=0x4000 ret=0
bash     opcode=0x0102 ret=0
bash     opcode=0x0103 ret=0
bash     opcode=0x0102 ret=0
bash     opcode=0x0100 ret=0
bash     opcode=0x0100 ret=0
bash     opcode=0x0100 ret=0
bash     opcode=0x0100 ret=0
```

`drivers/cxl/cxlmem.h`(v6.12, 519~538행)의 `CXL_MBOX_OP_*`로 풀면 Get Supported Logs(0x0400) → Get Log(0x0401) → Set Timestamp(0x0301) → Identify(0x4000) → Get/Set Event Interrupt Policy(0x0102/0x0103) → Get Event Records(0x0100) 네 번입니다. `comm`이 `bash`라는 것은 `bind` 파일에 쓴 셸의 문맥에서 probe가 실행됐다는 뜻입니다. Get Health Info(0x4200)는 probe 중에는 나가지 않았습니다.

실제 장애 조사에서는 실패한 명령만 보면 됩니다. 반환값이 음수일 때만 찍도록 바꿔 같은 bind를 다시 했고, 한 줄도 나오지 않았습니다. 성공 여부는 앞 스크립트의 `ret=0` 11줄이 이미 보여 줍니다. `cxl_internal_send_cmd()`는 `int`를 돌려주므로 비교는 32비트로 잘라서 합니다. 처음에는 `(int64)retval`로 비교했는데, 64비트 레지스터의 위쪽 절반이 음수 부호로 채워진다는 보장이 없어서 `(int32)`로 고쳐 다시 실행했고 결과는 같았습니다.

```text
kretprobe:cxl_internal_send_cmd {
  if (@seen[tid] && (int32)retval < 0) {
    printf("opcode=0x%04x ret=%d\n", @op[tid], retval);
  }
  delete(@op[tid]);
  delete(@seen[tid]);
}
```

이 probe는 커널 내부 명령만 봅니다. 사용자 공간이 ioctl로 보내는 명령은 `handle_mailbox_cmd_from_user()`가 `cxl_mbox->mbox_send()`를 직접 부르므로(`mbox.c:609`) 이 함수를 거치지 않습니다. 실제 장치에서 doorbell 대기가 2초(`CXL_MAILBOX_TIMEOUT_MS`, `drivers/cxl/pci.c:42`의 `(2 * HZ)`)를 넘기면 `-ETIMEDOUT`(-110)이 돌아오고 dmesg에 `mailbox timeout (opcode: …)`가 찍힙니다(`pci.c:272`). 이 실패 경로는 에뮬레이션 장치에서 재현하지 않았습니다. 실패한 opcode는 조사 대상을 좁혀 줄 뿐이고, 장치 firmware와 호스트 드라이버 중 어느 쪽 문제인지는 dmesg, 반환 코드, 장치 상태와 함께 판단해야 합니다.

## drgn으로 커널 상태 검사

drgn은 살아 있는 커널의 CXL 객체를 Python으로 순회할 수 있습니다. CXL bus(`cxl_bus_type`)의 모든 장치를 돌며 `device_type` 이름으로 객체를 구분하는 스크립트입니다.

```python
from drgn import container_of
from drgn.helpers.linux.device import bus_for_each_dev, dev_name

for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    tname = dev.type.name.string_() if dev.type else b""
    line = [dev_name(dev).decode(), tname.decode()]
    if tname in (b"cxl_port", b"cxl_endpoint"):
        port = container_of(dev, "struct cxl_port", "dev")
        line += ["nr_dports", str(port.nr_dports.value_()), "commit_end", str(port.commit_end.value_())]
    elif tname == b"cxl_region":
        cxlr = container_of(dev, "struct cxl_region", "dev")
        line += ["interleave_ways", str(cxlr.params.interleave_ways.value_()),
                 "state", cxlr.params.state.format_(type_name=False)]
    print(" ".join(line))
```

pip로 빌드한 drgn 0.3.0([Ch 6](/blog/tools/debugging/kernel/chapter06-crash-drgn))으로 실행한 결과입니다.

```text
root0 cxl_port nr_dports 1 commit_end -1
decoder0.0 cxl_decoder_root
port1 cxl_port nr_dports 1 commit_end -1
decoder1.0 cxl_decoder_switch
nvdimm-bridge0 cxl_nvdimm_bridge
mem0 cxl_memdev
endpoint2 cxl_port nr_dports 0 commit_end -1
decoder2.0 cxl_decoder_endpoint
decoder2.1 cxl_decoder_endpoint
decoder2.2 cxl_decoder_endpoint
decoder2.3 cxl_decoder_endpoint
```

`ls /sys/bus/cxl/devices`와 같은 11개 장치가 나왔고, sysfs에 없는 내부 필드까지 읽혔습니다. 세 port 모두 `commit_end`가 -1, 즉 commit된 decoder가 하나도 없습니다. region을 만들지 않았으므로 맞는 값이고, endpoint도 `device_type` 이름이 `cxl_port`로 나왔습니다. 같은 스크립트를 Debian 패키지 drgn 0.0.31로 돌리면 `ImportError: cannot import name 'bus_for_each_dev' from 'drgn.helpers.linux.device'`로 실패합니다. helper 이름과 구조체 필드는 drgn과 커널 버전에 따라 다르므로, 위 필드는 v6.12 `drivers/cxl/cxl.h`(Ch 9 표)와 대조해 썼습니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl_pci_probe`가 호출 안 됨 | 장치 class code가 `0x0502`·prog-if `0x10`이 아님. `cxl_pci`의 id table(`pci.c:956`)이 이것만 받음 ([Ch 1](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)) |
| dmesg에 `Device DVSEC not present, skip CXL.mem init` | `cxl_pci_probe()`는 이 경고 후에도 계속 진행(`pci.c` 843~845행). 이 메시지만으로 장치 미등록이라고 판단하지 않음 |
| ftrace에 소스의 함수가 안 보임 | `static` 함수가 인라인됨 (위 probe trace의 네 함수) |
| bpftrace에 사용자 명령이 안 잡힘 | 사용자 명령은 `mbox_send()`를 직접 부름(`mbox.c:609`). `cxl_pci_mbox_send`에 probe |
| Mailbox timeout | 명령별 doorbell 대기 한도는 고정 2초(`CXL_MAILBOX_TIMEOUT_MS`). `mbox_ready_timeout` 모듈 파라미터(기본 60초, `pci.c:53~55`)는 초기화 때 mailbox ready를 기다리는 시간이라 별개 |
| drgn helper `ImportError` | drgn 버전. Debian 0.0.31에는 `bus_for_each_dev`가 없음 |
| AER 이벤트 후 memdev 드라이버가 내려감 | `cxl_error_detected()`(`core/pci.c:921`)가 uncorrectable·frozen이면 memdev 드라이버를 해제하고 reset 요청 |

## 정리

- CXL 드라이버는 *cxl_core*를 기반으로 *cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 올라가는 구조입니다. Debian 6.12에서는 core·port가 built-in입니다.
- QEMU CXL Type 3 에뮬레이션과 PCI `unbind`/`bind`만 있으면 probe를 원하는 때에 다시 돌려 볼 수 있습니다.
- *ftrace function_graph*로 `cxl_pci_probe()`의 호출 순서를 확인했고, 인라인된 `static` 함수는 그 자식이 대신 보입니다.
- *dynamic_debug*는 레지스터 탐색·지원 명령·DPA 크기까지 probe의 판단을 그대로 보여 줍니다.
- *bpftrace*로 `cxl_internal_send_cmd()`의 opcode와 반환값을 봤습니다. probe 중 11개 명령이 모두 0으로 끝났습니다.
- *drgn* 0.3.0으로 CXL bus의 객체와 `commit_end` 같은 내부 필드를 읽었습니다.

## 다음 장 예고

Ch 9 — drivers/cxl 코드 분석. 이 장에서 trace로 본 경로를 v6.12 소스로 분해합니다.

## 소스 기준과 실행 범위

소스 인용은 Linux v6.12의 `drivers/cxl/Makefile`, `drivers/cxl/pci.c`, `drivers/cxl/cxlmem.h`, `drivers/cxl/core/mbox.c`, `drivers/cxl/core/pci.c` 기준입니다. ftrace·dynamic_debug·bpftrace·drgn 출력은 모두 QEMU CXL Type 3 에뮬레이션 장치에서 실행한 결과이고, 실제 CXL 장치에서는 실행하지 않았습니다. mailbox timeout과 AER 경로는 에뮬레이션에서 재현하지 않았습니다.

## 관련 항목

- [Ch 3: ftrace와 tracepoints 활용](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 4: eBPF·bpftrace로 커널 디버깅](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
