---
title: GDB
date: 2024-09-21
tags: CS
---
## Learn How To Debug Binary


Demo source code
```c
#include<stdlib.h>
#include<stdio.h>

void welcome(){
    printf("welcome!\n");
}
int add (int a, int b){
    return a + b;
}

int increase_int(int* a ){
    (*a)++;
    return 0;
}   

int main(){
    int a = 0;
    int *b = &a;
    float c = 2.1;
    printf("welcome to main function\n");
    welcome();
    printf("a is %d\n",*b);
    printf("after increase_int\n");
    increase_int(b);
    printf("a is %d",*b);
}
```
## Let start use GDB to debug

> `gdb ./filename` 

> 我有裝 plug-in，所以21行一般顯示 gdb，而我是顯示 gef
 
[這邊安裝 gef](https://github.com/hugsy/gef)

```shell=[]=
> gdb ./a.out 
GNU gdb (Ubuntu 12.1-0ubuntu1~22.04.2) 12.1
Copyright (C) 2022 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
Type "show copying" and "show warranty" for details.
This GDB was configured as "x86_64-linux-gnu".
Type "show configuration" for configuration details.
For bug reporting instructions, please see:
<https://www.gnu.org/software/gdb/bugs/>.
Find the GDB manual and other documentation resources online at:
    <http://www.gnu.org/software/gdb/documentation/>.

For help, type "help".
Type "apropos word" to search for commands related to "word"...
GEF for linux ready, type `gef' to start, `gef config' to configure
93 commands loaded and 5 functions added for GDB 12.1 in 0.01ms using Python engine 3.10
Reading symbols from ./a.out...
(No debugging symbols found in ./a.out)
gef➤ 
```

## Run
執行檔案
```shell
gef➤  run
Starting program: /home/ypp/Downloads/gdb_tutorial/a.out 
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
welcome to main function
welcome!
a is 0
after increase_int
a is 1[Inferior 1 (process 3656) exited normally]
gef➤  
```


## Breakpoint
breakpoint，顧名思義就是在程式執行時下斷點，讓程式停在在某個指令(instruction)，好讓我們可以更方便的分析程式行為

* 如果使用 `gcc -g` 編譯(生成)，則可以使用 `b [number]` 在第 `number` 行進行斷點。

* 如果該執行檔被 strip()，則可以先去靜態分析找到 `main` 的地址 然後使用 `b *[address]` 對該地址下斷點


```shell
gef➤  b main
Breakpoint 1 at 0x5555555551e5
gef➤  b *0x555555555223
Breakpoint 7 at 0x555555555223  
```

列出目前的 breakpoint
```shell=[]=
gef➤  i b
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x00005555555551e5 <main+8>
gef➤  
```
* `i b` → info breakpoint
* `d [breaknumber]` → delete breakpoint
> 刪除 breakpoint，注意這邊是使用 breakpoint number
```shell=[]=
gef➤  i b
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x00005555555551e5 <main+8>
gef➤  d 1
gef➤  i b
No breakpoints or watchpoints.
```


## ni & si
* ni means **next** instruction

* si means **step in** instrction

### Differen with `ni` and  `si`

> ni 是執行下一個指令，不步入 `function`，而 si 也是執行下一個指令，但他會步入 `function`

> 以下(表/圖?)為例，我們的 `$rip`，指在 `0x555555555228`，的位置

```sh=[]=
      0x555555555223 <main+0046>      mov    eax, 0x0
rip → 0x555555555228 <main+004b>      call   0x555555555189 <welcome>
      0x55555555522d <main+0050>      mov    rax, QWORD PTR [rbp-0x10]
      0x555555555231 <main+0054>      mov    eax, DWORD PTR [rax]
      0x555555555233 <main+0056>      mov    esi, eax
      0x555555555235 <main+0058>      lea    rax, [rip+0xdea] 
```


> 使用 `ni` 後 `$rip` 會指在 `0x55555555522d`
```sh=[]=
      0x555555555223 <main+0046>      mov    eax, 0x0
rip → 0x555555555228 <main+004b>      call   0x555555555189 <welcome>
      0x55555555522d <main+0050>      mov    rax, QWORD PTR [rbp-0x10]
      0x555555555231 <main+0054>      mov    eax, DWORD PTR [rax]
      0x555555555233 <main+0056>      mov    esi, eax
      0x555555555235 <main+0058>      lea    rax, [rip+0xdea] 
```
```sh=[]=
gef➤  ni
```
```sh=[]=
      0x555555555223 <main+0046>      mov    eax, 0x0
      0x555555555228 <main+004b>      call   0x555555555189 <welcome>
rip → 0x55555555522d <main+0050>      mov    rax, QWORD PTR [rbp-0x10]
      0x555555555231 <main+0054>      mov    eax, DWORD PTR [rax]
      0x555555555233 <main+0056>      mov    esi, eax
      0x555555555235 <main+0058>      lea    rax, [rip+0xdea] 
```


> 如果使用 `si` 後 `$rip` 會指在 `0x555555555189`，也就是會指到 `welcome` 這個 function 的一開始，進入這個 function，慢慢執行這個 function 的每一個指令，這就是步入

```sh=[]=
      0x555555555223 <main+0046>      mov    eax, 0x0
rip→  0x555555555228 <main+004b>      call   0x555555555189 <welcome>
   ↳    0x555555555189 <welcome+0000>   endbr64 
        0x55555555518d <welcome+0004>   push   rbp
        0x55555555518e <welcome+0005>   mov    rbp, rsp
        0x555555555191 <welcome+0008>   lea    rax, [rip+0xe6c]        # 0x555555556004
        0x555555555198 <welcome+000f>   mov    rdi, rax
```
```sh=[]=
gef➤  si
```

```sh=[]=
      0x555555555223 <main+0046>      mov    eax, 0x0
      0x555555555228 <main+004b>      call   0x555555555189 <welcome>
      ↳ rip→  0x555555555189 <welcome+0000>   endbr64 
              0x55555555518d <welcome+0004>   push   rbp
              0x55555555518e <welcome+0005>   mov    rbp, rsp
              0x555555555191 <welcome+0008>   lea    rax, [rip+0xe6c]        # 0x555555556004
              0x555555555198 <welcome+000f>   mov    rdi, rax
```
## continue
> 繼續執行，跟 run 很像，差別在於 run 是從頭開始執行， continue 是從目前的 `$rip` 繼續執行
```sh=[]=
gef➤  c
```

## finish
> Finish current function call

> 舉例來說我在 `main()` call 了 `increase_int()`，然後我在 `increase_int()` 裡面執行到一半，這時候我使用 `finish`，則 GDB 會把 `increase_int()` 執行完(就是執行完 `increate_int()` 的 `ret`)，這時候 `$rip` 會指在 `main()` function call `increase_int` 的下一行指令
```sh=[]=
gef➤  finish
```

## x

> x 指令是可以查看記憶體 value 的 command

x [Address expression]
x /[Format] [Address expression]
x /[Length][Format] [Address expression]

* format
    * o - octal
    * x - hexadecimal
    * d - decimal
    * u - unsigned decimal
    * t - binary
    * f - floating point
    * a - address
    * c - char
    * s - string    
    * i - instruction

* size modifiers
    * b - byte
    * h - halfword (16-bit value)
    * w - word (32-bit value)
    * g - giant word (64-bit value)


> 查看某個地址的數值
```sh=[]=
gef➤  x 0x00007fffffffdeb0
0x7fffffffdeb0:	0x00000001
```
> 查看某個地址接下來的10個單位位置的數值(單位預設為 4bytes)
```sh=[]=
gef➤  x/10 0x00007fffffffdeb0
0x7fffffffdeb0:	0x00000001	0x00000000	0xf7c29d90	0x00007fff
0x7fffffffdec0:	0x00000000	0x00000000	0x555551dd	0x00005555
0x7fffffffded0:	0xffffdfb0	0x00000001
```
> 查看某個地址接下來的10個單位位置的數值(g 指令了單位為 8bytes) 
```sh=[]=
gef➤  x/10g 0x00007fffffffdeb0
0x7fffffffdeb0:	0x0000000000000001	0x00007ffff7c29d90
0x7fffffffdec0:	0x0000000000000000	0x00005555555551dd
0x7fffffffded0:	0x00000001ffffdfb0	0x00007fffffffdfc8
0x7fffffffdee0:	0x0000000000000000	0x46ab07aab525de82
0x7fffffffdef0:	0x00007fffffffdfc8	0x00005555555551dd
```
> 查看某個地址接下來的10個單位位置的數值(g 指令了單位為 8bytes)，並且使用 16 進制
```sh=[]=
gef➤  x/10xg 0x00007fffffffdeb0
0x7fffffffdeb0:	0x0000000000000001	0x00007ffff7c29d90
0x7fffffffdec0:	0x0000000000000000	0x00005555555551dd
0x7fffffffded0:	0x00000001ffffdfb0	0x00007fffffffdfc8
0x7fffffffdee0:	0x0000000000000000	0x46ab07aab525de82
0x7fffffffdef0:	0x00007fffffffdfc8	0x00005555555551dd
```

> x/10i [address] 可以看10個 instruction

## dump

> 把 0x0000555555555000 ~ 0x0000555555557000 的 memory contant 拉下來放進 dump.dmp，然後使用 ida 開 (目前不確定副檔名有沒有差)

```shell=[]=
dump memory dump.dmp 0x0000555555555000 0x0000555555557000
```

## backtrace
> 查看 call stack，Trace Function Call

```shell=[]=
gef➤  backtrace
#0  0x00005555555551bb in increase_int ()
#1  0x0000555555555264 in main ()
gef➤  
```

## attach

> 在 ctf 時如果想要 attach 上自己的 exploit，去觀察 `$register`, `stack` 之類的資訊，可以使用 gdb -p <exploit_pid>


## Ctrl + C
就是 interrupt。

> 可以在執行時使用，他會 interrupt 住整個 process，方便觀察目前 process 的狀態，再使用前面提到的 contiune 就可以讓 process 繼續執行


## handle signal

```c=
handle SIGINT stop print pass
```
當程序接收到 SIGINT 信號時，GDB 會：

* 暫停程序（stop）
* 打印收到信號的消息（print）
* 將信號傳遞給程序（pass）

## Reference

[<u>GDB Tutorial</u>
](https://www.youtube.com/watch?v=svG6OPyKsrw) 
這部教學影片是基於 `gcc -g` 去編譯的可執行檔，所以有更多功能可以使用，我這邊沒有使用，所以缺少符號表、行號之類的東西，所以有些 feature 不能使用