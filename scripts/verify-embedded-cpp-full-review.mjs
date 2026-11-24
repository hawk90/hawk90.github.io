// Supplemental non-board checks for the 2026-11-19 full-series review.
// Run from the repo root. EMBEDDED_CXX selects Clang; arm-none-eabi tools must be on PATH.
// ETL_INCLUDE, CPP_REVIEW_DEPS, BOOST_INCLUDE and CMSIS_DEVICE_HEADER name pinned sources.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const root='src/content/blog/embedded/embedded-cpp/';
const work=mkdtempSync(join(tmpdir(),'cpp-full-review-'));
const cxx=process.env.EMBEDDED_CXX??'clang++';
const deps=resolve(process.env.CPP_REVIEW_DEPS??'');
const boost=resolve(process.env.BOOST_INCLUDE??'');
const etl=resolve(process.env.ETL_INCLUDE??'');
for(const key of ['ETL_INCLUDE','CPP_REVIEW_DEPS','BOOST_INCLUDE','CMSIS_DEVICE_HEADER'])assert.ok(process.env[key],`${key} must name the pinned dependency path`);
function blocks(file){return [...readFileSync(root+file,'utf8').matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map(x=>x[1]);}
function block(file,text){const b=blocks(file).find(b=>b.includes(text));assert.ok(b,`${file}: ${text}`);return b;}
function put(file,s){writeFileSync(join(work,file),s);}
function run(cmd,args,negative){const p=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:60000});if(p.error)throw p.error;const s=(p.stdout??'')+(p.stderr??'');if(negative){assert.notEqual(p.status,0,s);assert.match(s,negative);}else assert.equal(p.status,0,s);return s;}
function check(name,code,{standard='c++17',flags=[]}={}){put(name+'.cpp',code);run(cxx,[`-std=${standard}`,'-Wall','-Wextra','-Werror','-pedantic-errors','-fsanitize=address,undefined','-fno-sanitize-recover=all',...flags,name+'.cpp','-o',name]);run(join(work,name),[]);console.log('PASS '+name);}
function reject(name,macro,pattern,standard='c++17'){run(cxx,[`-std=${standard}`,'-pedantic-errors','-fsyntax-only','-D'+macro,name+'.cpp'],pattern);}
console.log('Workspace: '+work);console.log(run(cxx,['--version']).split('\n')[0]);
const ser=block('part2-03-constexpr-basics.md','void serialize(').split('// 사용')[0];
check('serialization',`#include <cstdint>\n#include <type_traits>\n#include <cassert>\n${ser}
int main(){uint8_t a[2]{};serialize(a,uint16_t{0x1234});assert(a[0]==0x12&&a[1]==0x34);uint8_t b[4]{};serialize(b,uint32_t{0xfedcba98});assert(b[0]==0xfe&&b[3]==0x98);
#ifdef BAD_SIZE
uint8_t short_buffer[1];serialize(short_buffer,uint16_t{1});
#endif
#ifdef BAD_BOOL
uint8_t boolean[sizeof(bool)];serialize(boolean,true);
#endif
}`);
reject('serialization','BAD_SIZE',/no matching function/);reject('serialization','BAD_BOOL',/unsigned integer except bool required/);
const search=block('part2-04-constexpr-advanced.md','constexpr int binary_search(').split('constexpr std::array<int, 8>')[0];
check('binary-search',`#include <array>\n#include <limits>\n#include <cstddef>\nusing std::size_t;\n${search}
constexpr std::array<int,0> empty{};constexpr std::array<int,1> one{7};constexpr std::array<int,5> a{1,3,7,9,11};
static_assert(binary_search(empty,7)==-1&&binary_search(one,7)==0&&binary_search(one,6)==-1);
static_assert(binary_search(a,1)==0&&binary_search(a,11)==4&&binary_search(a,8)==-1);int main(){}`);
const masks=block('part2-04-constexpr-advanced.md','constexpr uint32_t pins_mask()').split('GPIOA->ODR')[0];
check('pin-masks',`#include <cstdint>\n${masks}\nstatic_assert(kLedMask==0xe000u&&pins_mask<>()==0&&pins_mask<31>()==0x80000000u);\n#ifdef BAD_PIN\nconstexpr auto bad=pins_mask<32>();\n#endif\nint main(){}`,{flags:['-fno-exceptions']});
reject('pin-masks','BAD_PIN',/pin index out of range/);
const vector=block('part2-06-templates-basics.md','class FixedVector').split('FixedVector<int, 16>')[0];
check('fixed-vector-commit',`#include <cstddef>\n#include <cassert>\nusing std::size_t;\n${vector}
struct Item{Item& operator=(const Item&){throw 7;}};
int main(){FixedVector<Item,2> v;Item item;try{v.push_back(item);assert(false);}catch(int){}assert(v.size()==0);}`);
const decode=block('part2-10-concepts.md','concept HasUserDeserialize');
check('decode',`#include <array>\n#include <cstdint>\n#include <cstring>\n#include <type_traits>\n#include <concepts>\n#include <cassert>\nusing std::size_t;\n${decode}
int main(){std::array<uint8_t,4> dst{9,9,9,9};const uint8_t src[]{1,2,3,4};assert(!decode(dst,nullptr,4)&&dst[0]==9);assert(!decode(dst,src,3)&&dst[0]==9);assert(decode(dst,src,4)&&dst[0]==1&&dst[3]==4);}`,{standard:'c++20'});
const uart=block('part5-03-peripheral-abstraction.md','constexpr bool uart_brr_over16').split('template<uintptr_t Address>')[0];
check('uart-brr',`#include <cstdint>\n#include <cassert>\n${uart}
int main(){uint32_t out=99;assert(!uart_brr_over16(0,42000000,out)&&out==99);assert(!uart_brr_over16(115200,0,out));assert(uart_brr_over16(115200,42000000,out)&&out==365);assert(uart_brr_over16(1,16,out)&&out==16);assert(!uart_brr_over16(1,15,out));assert(uart_brr_over16(1,65535,out)&&out==65535);assert(!uart_brr_over16(1,65536,out));assert(!uart_brr_over16(UINT32_MAX,UINT32_MAX,out));}`);
// Compile the actual logging fragments with printf format checking and evaluate a macro argument once.
const logging=block('part3-06-error-handling-patterns.md','#define LOG_ERROR_RESULT').split('auto r = risky_operation();')[0];
const location=block('part3-06-error-handling-patterns.md','void log_if_error');
check('logging',`#include <expected>\n#include <source_location>\n#include <cinttypes>\n#include <cstdarg>\n#include <cstdio>\n#include <cassert>\nenum class Error{Timeout};template<class T>using Result=std::expected<T,Error>;const char* error_name(Error){return "Timeout";}
static int logged=0,calls=0;void log_error(const char*,...) __attribute__((format(printf,1,2)));void log_error(const char* f,...){char b[512];va_list a;va_start(a,f);int n=vsnprintf(b,sizeof b,f,a);va_end(a);assert(n>0);++logged;}
${logging}\n${location}
Result<int> fail(){++calls;return std::unexpected(Error::Timeout);}int main(){LOG_ERROR_RESULT(fail());assert(calls==1&&logged==1);log_if_error(fail());assert(calls==2&&logged==2);}`,{standard:'c++23',flags:['-Wformat=2']});
for(const f of ['tl/expected.hpp','boost/sml.hpp'])assert.ok(existsSync(join(deps,f)),`Pinned dependency needed: ${f}`);
check('tl-expected',`#include <tl/expected.hpp>\n#include <cassert>\nint main(){int calls=0;tl::expected<int,int> ok=42;auto step=[&](int n)->tl::expected<int,int>{++calls;return n+1;};assert(ok.and_then(step).value()==43&&calls==1);tl::expected<int,int> bad=tl::unexpected(7);assert(!bad.and_then(step)&&calls==1);auto recovered=bad.or_else([](int)->tl::expected<int,int>{return 9;});assert(recovered.value()==9);}`,{flags:['-I'+deps,'-fno-exceptions']});
const sml=block('part4-07-compile-time-fsm.md','#include <boost/sml.hpp>');
const start=sml.indexOf('sml::sm<Machine> fsm;');
check('sml',`#include <cassert>\n#include <array>\nstd::array<int,4> history{};int actions=0;void start_play(){history[actions++]=1;}void pause_play(){history[actions++]=2;}void stop_play(){history[actions++]=4;}void resume_play(){history[actions++]=3;}\n${sml.slice(0,start)}\nint main(){${sml.slice(start)}assert(actions==3);fsm.process_event(Stop{});assert(actions==4);assert((history==std::array<int,4>{1,2,3,4}));}`,{flags:['-I'+deps,'-fno-exceptions','-fno-rtti']});
assert.ok(existsSync(join(etl,'etl/version.h')),'ETL_INCLUDE must name real ETL 20.49.0 headers');
assert.ok(existsSync(join(boost,'boost/version.hpp')),'BOOST_INCLUDE must name real Boost 1.87.0 headers');
const observer=block('part4-02-etl-library.md','#include <etl/observer.h>').split('TempSensor sensor;')[0];
const router=block('part4-02-etl-library.md','#include <etl/message_router.h>').split('SensorRouter router;')[0];
check('etl-observer-router',`#include <cassert>\nint alarms=0,temperatures=0,pressures=0;void alarm(){++alarms;}float read_temperature(){return 81;}void log_temp(float){++temperatures;}void log_pressure(float){++pressures;}\n${observer}\n${router}
int main(){TempObserver obs;TempSensor sensor;sensor.add_observer(obs);sensor.update();assert(alarms==1);sensor.remove_observer(obs);sensor.update();assert(alarms==1);SensorRouter r;r.receive(TempMessage{25});r.receive(PressureMessage{101});assert(temperatures==1&&pressures==1);}`,{flags:['-I'+etl]});
put('object-pool.hpp',block('part3-03-pool-allocator.md','class ObjectPool'));
const events=block('part4-01-intrusive-containers.md','ObjectPool<Event, 64> event_pool;');
check('boost-pool-hooks',`#include <boost/intrusive/list.hpp>\n#include <boost/version.hpp>\n#include <cstdint>\n#include <cassert>\n#include "object-pool.hpp"\nnamespace bi=boost::intrusive;static_assert(BOOST_VERSION==108700);int handled=0;template<class T>void handle_event(const T&e){assert(e.type==7&&e.data==42);++handled;}\n${events}
int main(){assert(event_pool.available()==64);for(int i=0;i<64;++i)post_event(7,42);post_event(7,42);assert(event_queue.size()==64&&event_pool.full());process_events();assert(handled==64&&event_pool.empty()&&event_queue.empty());post_event(7,42);process_events();assert(handled==65);}`,{flags:['-isystem',boost]});
// Pool RAII move/reset behavior is checked against the article's actual pool.
const poolPtr=block('part3-03-pool-allocator.md','class PoolUniquePtr');
check('pool-owner',`#include "object-pool.hpp"\n#include <cassert>\n${poolPtr}
struct Value{static inline int live=0;explicit Value(int)noexcept{++live;}~Value()noexcept{--live;}};
int main(){ObjectPool<Value,2> p;{auto a=make_pool_unique(p,1);auto b=make_pool_unique(p,2);assert(p.full()&&Value::live==2);auto failed=make_pool_unique(p,3);assert(!failed);b=std::move(a);assert(!a&&b&&Value::live==1);auto c=std::move(b);assert(!b&&c);}assert(p.empty()&&Value::live==0);}`);
const allocator=block('part3-02-custom-allocator-basics.md','class MyAllocator');
check('allocator-fragment',`#include <memory>\n#include <new>\n#include <limits>\n#include <vector>\n#include <cassert>\n${allocator}
int main(){std::vector<int,MyAllocator<int>> v;v.push_back(42);assert(v[0]==42);MyAllocator<int> a;bool rejected=false;try{a.allocate(std::numeric_limits<std::size_t>::max());}catch(const std::bad_alloc&){rejected=true;}assert(rejected);}`);
const hfsm='#include <etl/hfsm.h>\n#include <etl/vector.h>\n#include <type_traits>\n#include <cassert>\nstatic_assert(std::is_base_of_v<etl::fsm,etl::hfsm>);int main(){etl::vector<int,4> v;unsigned dropped=0;for(int i=0;i<7;++i){if(v.full())++dropped;else v.push_back(i);}assert(v.size()==4&&dropped==3);}';
check('etl-no-exception',hfsm,{flags:['-I'+etl,'-fno-exceptions']});
// Compare the article layout/flags with the actual vendor device header.
const deviceHeader=process.env.CMSIS_DEVICE_HEADER;
assert.ok(deviceHeader&&existsSync(deviceHeader),'CMSIS_DEVICE_HEADER must name ST stm32f407xx.h');
const device=readFileSync(deviceHeader,'utf8');
function deviceType(name){const m=device.match(new RegExp('typedef struct\\s*\\{[^{}]*\\}\\s*'+name+';'));assert.ok(m,name);return m[0];}
const definitions=new Map([...device.matchAll(/^#define\s+(\w+)\s+([^\n]+)/gm)].map(m=>[m[1],m[2]]));
const selected=new Map();
function select(name){if(selected.has(name))return;const value=definitions.get(name);assert.ok(value,`ST macro ${name}`);selected.set(name,value);for(const token of value.replace(/\/\*.*?\*\//g,'').match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)??[])if(definitions.has(token))select(token);}
for(const name of ['GPIOA_BASE','GPIOB_BASE','USART1_BASE','USART2_BASE','SPI1_BASE','I2C1_BASE','USART_SR_RXNE','USART_SR_ORE','USART_SR_NE','USART_SR_FE','USART_SR_PE','USART_CR1_UE','USART_CR1_TE','USART_CR1_RE'])select(name);
const config=block('part2-04-constexpr-advanced.md','struct DeviceConfig');
const irqNumbers=['USART1','USART2','SPI1','I2C1_EV'].map(n=>{const m=device.match(new RegExp('\\b'+n+'_IRQn\\s*=\\s*(\\d+)'));assert.ok(m,n);return Number(m[1]);});
const gpio=block('part5-01-register-abstraction.md','struct GpioRegs').split('#define GPIOA')[0];
const uartSource=block('part5-03-peripheral-abstraction.md','constexpr bool uart_brr_over16');
const uartLayout=uartSource.match(/struct Regs \{[^{}]*\};/)[0].replace('Regs','ArticleUartRegs');
const status=block('part4-05-type-safe-flags.md','enum class UartStatus').split('template<>')[0];
check('st-register-contract',`#include <cstdint>\n#include <cstddef>\n#define __IO volatile\n${deviceType('GPIO_TypeDef')}\n${deviceType('USART_TypeDef')}\n${[...selected].map(([n,v])=>'#define '+n+' '+v).join('\n')}\n${gpio}\n${uartLayout}\n${status}
${['MODER','OTYPER','OSPEEDR','PUPDR','IDR','ODR','BSRR','LCKR','AFR'].map(m=>`static_assert(offsetof(GpioRegs,${m})==offsetof(GPIO_TypeDef,${m}));`).join('\n')}
${['SR','DR','BRR','CR1','CR2','CR3','GTPR'].map(m=>`static_assert(offsetof(ArticleUartRegs,${m})==offsetof(USART_TypeDef,${m}));`).join('\n')}
static_assert(sizeof(GpioRegs)==sizeof(GPIO_TypeDef)&&sizeof(ArticleUartRegs)==sizeof(USART_TypeDef));
static_assert(GPIOA_BASE==0x40020000u&&GPIOB_BASE==0x40020400u&&USART2_BASE==0x40004400u);
static_assert(USART_CR1_UE==(1u<<13)&&USART_CR1_TE==(1u<<3)&&USART_CR1_RE==(1u<<2));
${[['DataReady','RXNE'],['Overrun','ORE'],['NoiseDetected','NE'],['FramingError','FE'],['ParityError','PE']].map(([a,b])=>`static_assert(static_cast<uint32_t>(UartStatus::${a})==USART_SR_${b});`).join('\n')}
int main(){}`);
check('st-device-table',`#include <cstdint>\n#include <cstddef>\n#include <iterator>\n#include <string_view>\nusing std::size_t;\n${[...selected].map(([n,v])=>'#define '+n+' '+v).join('\n')}\n${config}\nstatic_assert(devices[0].base_address==USART1_BASE&&devices[1].base_address==USART2_BASE&&devices[2].base_address==SPI1_BASE&&devices[3].base_address==I2C1_BASE);\n${irqNumbers.map((n,i)=>`static_assert(devices[${i}].irq_number==${n});`).join('\n')}\nstatic_assert(find_irq("UART2")==${irqNumbers[1]}&&find_irq("missing")==-1);\nint main(){}`);
put('uart-arm.cpp','#include <stdint.h>\nusing size_t=__SIZE_TYPE__;\n'+uartSource.split('using Uart2')[0]+'\nusing Uart2=Uart<0x40004400>;\nextern "C" bool init_uart(unsigned baud,unsigned pclk){return Uart2::init(baud,pclk);}\nextern "C" void send_byte(unsigned char b){Uart2::send_byte(b);}\nextern "C" unsigned char receive_byte(){return Uart2::recv_byte();}');
run(cxx,['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-std=c++17','-Wall','-Wextra','-Werror','-pedantic-errors','-O2','-ffreestanding','-fno-exceptions','-fno-rtti','-c','uart-arm.cpp','-o','uart-arm.o']);
console.log('PASS article UART Cortex-M4 object compilation (no MMIO execution)');
// Real ARM final linking: article linker script, placement source and dynamic initializer.
put('memory.ld',block('part1-07-linker-scripts.md','ENTRY(Reset_Handler)'));
put('placement.cpp',block('part1-07-linker-scripts.md','Sensor sensor;'));
put('dynamic-init.cpp',block('part1-06-startup-code.md','BootValue first, second;'));
put('startup.cpp',`extern "C" {extern unsigned char dma_buffer[],cpu_scratch[];extern unsigned _estack;int read_sensor();void Reset_Handler();}
volatile int boot=42;int read_boot_value(){return boot;}extern "C" void early_init(){boot=101;}extern "C" void late_init(){boot=10000;}
using Fn=void(*)();__attribute__((section(".init_array.101"),used)) Fn init_first=early_init;__attribute__((section(".init_array.10000"),used)) Fn init_second=late_init;
__attribute__((section(".isr_vector"),used))const void* vectors[]={&_estack,(const void*)Reset_Handler};
extern "C" void Reset_Handler(){dma_buffer[0]=static_cast<unsigned char>(read_sensor());cpu_scratch[0]=3;for(;;)__asm volatile("wfi":::"memory");}`);
for(const file of ['placement','dynamic-init','startup'])run(cxx,['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-std=c++17','-O0','-ffreestanding','-fno-exceptions','-fno-rtti','-ffunction-sections','-fdata-sections','-c',file+'.cpp','-o',file+'.o']);
const inputs=['startup.o','placement.o','dynamic-init.o'];
put('firmware.link.log',run('arm-none-eabi-ld',['-T','memory.ld','--gc-sections','-Map=firmware.map',...inputs,'-o','firmware.elf']));
const sections=run('arm-none-eabi-readelf',['-SW','firmware.elf']);
assert.match(sections,/\.dma\s+NOBITS\s+2000/);assert.match(sections,/\.ccmram\s+NOBITS\s+1000/);
put('firmware.sections.txt',sections);
const names=run('arm-none-eabi-nm',['firmware.elf']);put('firmware.symbols.txt',names);
const symbols=Object.fromEntries([...names.matchAll(/^([\da-f]+)\s+\w\s+(\S+)$/gm)].map(m=>[m[2],Number.parseInt(m[1],16)]));
assert.equal(symbols._estack,0x20020000);assert.ok(symbols._sdata>=0x20000000&&symbols._edata>symbols._sdata);assert.ok(symbols._sidata>=0x08000000&&symbols._sidata<0x08100000);assert.ok(symbols._end+0x600<=symbols._estack);
run('arm-none-eabi-objcopy',['--dump-section','.init_array=init.bin','firmware.elf']);
const init=readFileSync(join(work,'init.bin'));assert.ok(init.length>=12);assert.equal(init.readUInt32LE(0),symbols.early_init|1);assert.equal(init.readUInt32LE(4),symbols.late_init|1);
put('overflow.ld',readFileSync(join(work,'memory.ld'),'utf8').replace('LENGTH = 128K','LENGTH = 4K'));
put('overflow.link.log',run('arm-none-eabi-ld',['-T','overflow.ld','--gc-sections',...inputs,'-o','overflow.elf'],/overflow|will not fit/));
console.log('PASS real GNU ld ARM ELF: SRAM/CCM NOLOAD, Flash data LMA, init priority ordering, GC retention and RAM overflow rejection');
console.log('No physical board, MMIO execution, IRQ/DMA, startup execution, timing/WCET or exhaustive interleaving proof.');
