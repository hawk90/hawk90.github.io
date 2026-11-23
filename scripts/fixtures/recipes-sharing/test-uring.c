#include <assert.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/mman.h>
#include "uring-read-result.h"
int main(void){
 struct io_uring ring;assert(io_uring_queue_init(8,&ring,0)==0);
 int fd=memfd_create("uring-review",MFD_CLOEXEC);assert(fd>=0);
 unsigned char data[5]={1,2,3,4,5},buffer[64]={0};assert(write(fd,data,5)==5);
 struct iovec iov={buffer,sizeof(buffer)};assert(io_uring_register_buffers(&ring,&iov,1)==0);
 for(int error=0;error<2;++error){
  struct io_uring_sqe *sqe=io_uring_get_sqe(&ring);assert(sqe);
  io_uring_prep_read_fixed(sqe,error?-1:fd,buffer,sizeof(buffer),0,0);
  assert(io_uring_submit(&ring)==1);struct io_uring_cqe *cqe;int ret;
  do{ret=io_uring_wait_cqe(&ring,&cqe);}while(ret==-EINTR);
  assert(ret==0);ssize_t n=-99;ret=consume_read_result(&ring,cqe,sizeof(buffer),&n);
  if(error){assert(ret==-EBADF&&n==-99);}
  else{assert(ret==0&&n==5);for(int i=0;i<5;++i)assert(buffer[i]==data[i]);}
 }
 assert(io_uring_unregister_buffers(&ring)==0);close(fd);io_uring_queue_exit(&ring);return 0;
}
