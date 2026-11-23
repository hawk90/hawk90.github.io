#include <assert.h>
#include <errno.h>
#include <stdint.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include "file-transfer.h"
enum { BYTES=131101 };
static unsigned char expected(size_t i){return (unsigned char)((i*17+3)%251);}
static void check(int use_splice,int early){
 int input=memfd_create("transfer-review",MFD_CLOEXEC);assert(input>=0);
 unsigned char data[4096];size_t written=0;
 while(written<BYTES){size_t n=BYTES-written;if(n>sizeof(data))n=sizeof(data);for(size_t i=0;i<n;++i)data[i]=expected(written+i);ssize_t r=pwrite(input,data,n,(off_t)written);assert(r>0);written+=(size_t)r;}
 int sock[2];assert(socketpair(AF_UNIX,SOCK_STREAM,0,sock)==0);pid_t child=fork();assert(child>=0);
 if(!child){close(sock[0]);size_t off=0;for(;;){ssize_t n=read(sock[1],data,sizeof(data));if(n<0&&errno==EINTR)continue;assert(n>=0);if(!n)break;for(ssize_t i=0;i<n;++i)assert(data[i]==expected(off+(size_t)i));off+=(size_t)n;}assert(off==BYTES);close(sock[1]);_exit(0);}
 close(sock[1]);struct file_transfer state={0,BYTES+(early?23:0)};
 int ret=use_splice?splice_progress(sock[0],input,&state):sendfile_progress(sock[0],input,&state);
 assert(ret==(early?-ENODATA:0)&&state.offset==BYTES&&state.left==(early?23u:0u));
 close(sock[0]);close(input);int status;assert(waitpid(child,&status,0)==child&&WIFEXITED(status)&&WEXITSTATUS(status)==0);
}
int main(void){
 signal(SIGPIPE,SIG_IGN);check(0,0);check(1,0);check(0,1);check(1,1);
 struct file_transfer state={0,1};assert(sendfile_progress(-1,-1,&state)==-EBADF&&state.offset==0&&state.left==1);
 return 0;
}
