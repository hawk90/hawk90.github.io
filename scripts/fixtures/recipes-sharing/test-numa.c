#include <assert.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/mman.h>
#include <numa.h>
#include <numaif.h>
#include <errno.h>
static int deny_policy,deny_bind,deny_unmap;
static uintptr_t failed_address;
static long checked_get_mempolicy(int*m,unsigned long*n,unsigned long max,void*a,unsigned long f){
 if(deny_policy){errno=EACCES;return -1;}return get_mempolicy(m,n,max,a,f);
}
static long checked_mbind(void*a,unsigned long n,int m,const unsigned long*b,unsigned long max,unsigned f){
 if(deny_bind){failed_address=(uintptr_t)a;errno=EACCES;return -1;}return mbind(a,n,m,b,max,f);
}
static int checked_munmap(void*a,size_t n){if(deny_unmap){errno=EIO;return -1;}return munmap(a,n);}
#define get_mempolicy checked_get_mempolicy
#define mbind checked_mbind
#define munmap checked_munmap
#include "numa-bound-region.c"
#undef get_mempolicy
#undef mbind
#undef munmap
#include "thread-affinity.c"
int main(void){
 assert(numa_available()>=0);cpu_set_t allowed,previous,now;
 assert(sched_getaffinity(0,sizeof(allowed),&allowed)==0);int cpu=-1;
 for(int i=0;i<CPU_SETSIZE;++i)if(CPU_ISSET(i,&allowed)){cpu=i;break;}
 assert(cpu>=0);
 assert(pin_current_thread(-1,&previous)==-EINVAL&&pin_current_thread(CPU_SETSIZE,&previous)==-EINVAL);
 assert(pin_current_thread(cpu,&previous)==0&&sched_getcpu()==cpu);
 struct bitmask *nodes=numa_get_mems_allowed();assert(nodes);
 long page=sysconf(_SC_PAGESIZE);assert(page>0);int first=-1;unsigned tested=0;
 struct bound_region r={0};
 assert(allocate_bound_region(-1,4096,&r)==-EINVAL&&allocate_bound_region(0,0,&r)==-EINVAL&&allocate_bound_region(999999,4096,&r)==-EINVAL);
 for(unsigned long node=0;node<nodes->size;++node)if(numa_bitmask_isbitset(nodes,(unsigned)node)){
  if(first<0){first=(int)node;}
  assert(allocate_bound_region((int)node,(size_t)page*8,&r)==0);
  unsigned char *p=r.address;
  for(size_t i=0;i<r.length;i+=(size_t)page){
   p[i]=(unsigned char)(i/(size_t)page+node);int resident=-1;
   assert(get_mempolicy(&resident,NULL,0,p+i,MPOL_F_ADDR|MPOL_F_NODE)==0&&resident==(int)node);
  }
  for(size_t i=0;i<r.length;i+=(size_t)page)assert(p[i]==(unsigned char)(i/(size_t)page+node));
  assert(allocate_bound_region((int)node,4096,&r)==-EBUSY);
  deny_unmap=1;void *old=r.address;
  assert(release_bound_region(&r)==-EIO&&r.address==old);deny_unmap=0;
  assert(release_bound_region(&r)==0&&!r.address&&!r.length);++tested;
 }
 assert(tested==2&&first>=0);
 deny_policy=1;assert(allocate_bound_region(first,4096,&r)==-EACCES&&!r.address);deny_policy=0;
 deny_bind=1;assert(allocate_bound_region(first,(size_t)page,&r)==-EACCES&&!r.address);deny_bind=0;
 unsigned char vec;errno=0;
 assert(mincore((void*)failed_address,(size_t)page,&vec)==-1&&errno==ENOMEM);
 numa_bitmask_free(nodes);
 assert(restore_current_thread(&previous)==0&&sched_getaffinity(0,sizeof(now),&now)==0&&CPU_EQUAL(&allowed,&now));
 return 0;
}
