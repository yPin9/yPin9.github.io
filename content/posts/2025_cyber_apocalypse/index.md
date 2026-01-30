---
title: Cyber Apocalypse CTF 2025 
date: 2025-05-27
tags: CTF
slug: 2025-cyber-apocalypse-ctf
---

---

## Blessing


---


```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  size_t size; // [rsp+8h] [rbp-28h] BYREF
  unsigned __int64 i; // [rsp+10h] [rbp-20h]
  _QWORD *v6; // [rsp+18h] [rbp-18h]
  void *buf; // [rsp+20h] [rbp-10h]
  unsigned __int64 v8; // [rsp+28h] [rbp-8h]

  v8 = __readfsqword(0x28u);
  setup(argc, argv, envp);
  banner();
  size = 0LL;
  v6 = malloc(0x30000uLL);
  *v6 = 1LL;
  printstr(
    "In the ancient realm of Eldoria, a roaming bard grants you good luck and offers you a gift!\n"
    "\n"
    "Please accept this: ");
  printf("%p", v6);
  sleep(1u);
  for ( i = 0LL; i <= 0xD; ++i )
  {
    printf("\b \b");
    usleep(0xEA60u);
  }
  puts("\n");
  printf(
    "%s[%sBard%s]: Now, I want something in return...\n\nHow about a song?\n\nGive me the song's length: ",
    "\x1B[1;34m",
    "\x1B[1;32m",
    "\x1B[1;34m");
  __isoc99_scanf("%lu", &size);
  buf = malloc(size);
  printf("\n%s[%sBard%s]: Excellent! Now tell me the song: ", "\x1B[1;34m", "\x1B[1;32m", "\x1B[1;34m");
  read(0, buf, size);
  *(_QWORD *)((char *)buf + size - 1) = 0LL;
  write(1, buf, size);
  if ( *v6 )
    printf("\n%s[%sBard%s]: Your song was not as good as expected...\n\n", "\x1B[1;31m", "\x1B[1;32m", "\x1B[1;31m");
  else
    read_flag();
  return 0;
}
```

### Key idea

* 這邊會給剛剛 `malloc` 出來的 space 的 address

```C
  printstr(
    "In the ancient realm of Eldoria, a roaming bard grants you good luck and offers you a gift!\n"
    "\n"
    "Please accept this: ");
  printf("%p", v6);
  sleep(1u);
  for ( i = 0LL; i <= 0xD; ++i )
  {
    printf("\b \b");
    usleep(0xEA60u);
  }
```

這邊會給剛剛 `malloc` 出來的 space 的 address


```C
    __isoc99_scanf("%lu", &size);
  buf = malloc(size);
  printf("\n%s[%sBard%s]: Excellent! Now tell me the song: ", "\x1B[1;34m", "\x1B[1;32m", "\x1B[1;34m");
  read(0, buf, size);
  *(_QWORD *)((char *)buf + size - 1) = 0LL;
  ```
這邊 size 填很大，導致 `malloc` 失敗，所以這邊 buf 是 `0`

但他沒檢查，所以下面 `read(0, buf, size);`會變成這樣 `*(buf + size) = input()`
```C
    if ( *v6 )
    printf("\n%s[%sBard%s]: Your song was not as good as expected...\n\n", "\x1B[1;31m", "\x1B[1;32m", "\x1B[1;31m");
else
    read_flag();
```
  
所以這邊的 size 就填剛剛 leak 出來的 space address，` *(_QWORD *)((char *)buf + size - 1) = 0LL;` 這行就會把 `v6` 改成 0，就會執行 `read_flag()`



## laconic


> SROP

### Decompile

```C
public _start
_start proc near
mov     rdi, 0          ; Alternative name is '_start'
                        ; __start
mov     rsi, rsp
sub     rsi, 8
mov     rdx, 106h
syscall                 ; LINUX -
retn
_start endp
```


### Key idea

* 經典題，就那樣
* 放好 fake stack 踩 `mov rax,0xf;syscall`
* `bin/sh` 藏在整份 binary 的尾巴

## crossbow


> ROP

### Decompile

```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  setvbuf(&_stdin_FILE, 0LL, 2LL, 0LL);
  setvbuf(&_stdout_FILE, 0LL, 2LL, 0LL);
  alarm(4882LL);
  banner();
  training();
  return 0;
}
```

```C
__int64 __fastcall training(__int64 a1, __int64 a2, __int64 a3, __int64 a4, int a5, int a6)
{
  int v6; // r8d
  int v7; // r9d
  char v9[32]; // [rsp+0h] [rbp-20h] BYREF

  printf(
    (unsigned int)"%s\n[%sSir Alaric%s]: You only have 1 shot, don't miss!!\n",
    (unsigned int)"\x1B[1;34m",
    (unsigned int)"\x1B[1;33m",
    (unsigned int)"\x1B[1;34m",
    a5,
    a6,
    v9[0]);
  target_dummy(v9);
  return printf(
           (unsigned int)"%s\n[%sSir Alaric%s]: That was quite a shot!!\n\n",
           (unsigned int)"\x1B[1;34m",
           (unsigned int)"\x1B[1;33m",
           (unsigned int)"\x1B[1;34m",
           v6,
           v7,
           v9[0]);
}
```

```C
__int64 __fastcall target_dummy(__int64 a1, __int64 a2, __int64 a3, __int64 a4, int a5, int a6)
{
  int v6; // edx
  int v7; // ecx
  int v8; // r8d
  int v9; // r9d
  int v10; // r8d
  int v11; // r9d
  _QWORD *v12; // rbx
  int v13; // r8d
  int v14; // r9d
  __int64 result; // rax
  int v16; // r8d
  int v17; // r9d
  int v18; // [rsp+1Ch] [rbp-14h] BYREF

  printf(
    (unsigned int)"%s\n[%sSir Alaric%s]: Select target to shoot: ",
    (unsigned int)"\x1B[1;34m",
    (unsigned int)"\x1B[1;33m",
    (unsigned int)"\x1B[1;34m",
    a5,
    a6);
  if ( (unsigned int)scanf((unsigned int)"%d%*c", (unsigned int)&v18, v6, v7, v8, v9) != 1 )
  {
    printf(
      (unsigned int)"%s\n[%sSir Alaric%s]: Are you aiming for the birds or the target kid?!\n\n",
      (unsigned int)"\x1B[1;31m",
      (unsigned int)"\x1B[1;33m",
      (unsigned int)"\x1B[1;31m",
      v10,
      v11);
    exit(1312LL);
  }
  v12 = (_QWORD *)(8LL * v18 + a1);
  *v12 = calloc(1LL, 128LL);
  if ( !*v12 )
  {
    printf(
      (unsigned int)"%s\n[%sSir Alaric%s]: We do not want cowards here!!\n\n",
      (unsigned int)"\x1B[1;31m",
      (unsigned int)"\x1B[1;33m",
      (unsigned int)"\x1B[1;31m",
      v13,
      v14);
    exit(6969LL);
  }
  printf(
    (unsigned int)"%s\n[%sSir Alaric%s]: Give me your best warcry!!\n\n> ",
    (unsigned int)"\x1B[1;34m",
    (unsigned int)"\x1B[1;33m",
    (unsigned int)"\x1B[1;34m",
    v13,
    v14);
  result = fgets_unlocked(*(_QWORD *)(8LL * v18 + a1), 128LL, &_stdin_FILE);
  if ( !result )
  {
    printf(
      (unsigned int)"%s\n[%sSir Alaric%s]: Is this the best you have?!\n\n",
      (unsigned int)"\x1B[1;31m",
      (unsigned int)"\x1B[1;33m",
      (unsigned int)"\x1B[1;31m",
      v16,
      v17);
    exit(69LL);
  }
  return result;
}
```

### Key idea

```C
  v12 = (_QWORD *)(8LL * v18 + a1);
  *v12 = calloc(1LL, 128LL);
```

把 `v12` 控到 `old rbp`，然後在這個空間塞 ROP (return 的時候會 `leave;ret;`，會讓 rsp 設過去這邊開好的空間)，就是 stack pivot，只是要知道要 pivot 到哪裡，這邊也是一步步 gdb 去 trace 的

> **leave == pop rbp;mov rsp,rbp**

```C
  result = fgets_unlocked(*(_QWORD *)(8LL * v18 + a1), 128LL, &_stdin_FILE);

```

這邊塞 ROP，沒啥問題


## quack_quack


```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  duckling(argc, argv, envp);
  return 0;
}
```

```C
unsigned __int64 duckling()
{
  char *v1; // [rsp+8h] [rbp-88h]
  __int64 buf[4]; // [rsp+10h] [rbp-80h] BYREF
  __int64 v3[11]; // [rsp+30h] [rbp-60h] BYREF
  unsigned __int64 v4; // [rsp+88h] [rbp-8h]

  v4 = __readfsqword(0x28u);
  memset(buf, 0, sizeof(buf));
  memset(v3, 0, 80);
  printf("Quack the Duck!\n\n> ");
  fflush(_bss_start);
  read(0, buf, 0x66uLL);
  v1 = strstr((const char *)buf, "Quack Quack ");
  if ( !v1 )
  {
    error("Where are your Quack Manners?!\n");
    exit(1312);
  }
  printf("Quack Quack %s, ready to fight the Duck?\n\n> ", v1 + 32);
  read(0, v3, 0x6AuLL);
  puts("Did you really expect to win a fight against a Duck?!\n");
  return v4 - __readfsqword(0x28u);
}
```
```C
unsigned __int64 duck_attack()
{
  char buf; // [rsp+3h] [rbp-Dh] BYREF
  int fd; // [rsp+4h] [rbp-Ch]
  unsigned __int64 v3; // [rsp+8h] [rbp-8h]

  v3 = __readfsqword(0x28u);
  fd = open("./flag.txt", 0);
  if ( fd < 0 )
  {
    perror("\nError opening flag.txt, please contact an Administrator\n");
    exit(1);
  }
  while ( read(fd, &buf, 1uLL) > 0 )
    fputc(buf, _bss_start);
  close(fd);
  return v3 - __readfsqword(0x28u);
}

```


### Key idea

```C
  v1 = strstr((const char *)buf, "Quack Quack ");
  if ( !v1 )
  {
    error("Where are your Quack Manners?!\n");
    exit(1312);
  }
  printf("Quack Quack %s, ready to fight the Duck?\n\n> ", v1 + 32);
  read(0, v3, 0x6AuLL);
```
這邊去控 `strstr` 的回傳值，把它控成 `v1+32 == return address` 然後 `  read(0, v3, 0x6AuLL);` 這邊填入 `duck_attack address`，就可以 `print flag` 了

## strategist

> Heap chunk's size overwrite


```C
int __fastcall __noreturn main(int argc, const char **argv, const char **envp)
{
  unsigned __int64 v3; // rax
  char s[808]; // [rsp+0h] [rbp-330h] BYREF
  unsigned __int64 v5; // [rsp+328h] [rbp-8h]

  v5 = __readfsqword(0x28u);
  memset(s, 0, 0x320uLL);
  banner();
  while ( 1 )
  {
    while ( 1 )
    {
      while ( 1 )
      {
        v3 = menu();
        if ( v3 != 2 )
          break;
        show_plan(s);
      }
      if ( v3 > 2 )
        break;
      if ( v3 != 1 )
        goto LABEL_13;
      create_plan(s);
    }
    if ( v3 == 3 )
    {
      edit_plan(s);
    }
    else
    {
      if ( v3 != 4 )
      {
LABEL_13:
        printf("%s\n[%sSir Alaric%s]: This plan will lead us to defeat!\n\n", "\x1B[1;31m", "\x1B[1;33m", "\x1B[1;31m");
        exit(1312);
      }
      delete_plan(s);
    }
  }
}
```

```C
unsigned __int64 __fastcall delete_plan(__int64 a1)
{
  unsigned int v2; // [rsp+14h] [rbp-Ch] BYREF
  unsigned __int64 v3; // [rsp+18h] [rbp-8h]

  v3 = __readfsqword(0x28u);
  printf("%s\n[%sSir Alaric%s]: Which plan you want to delete?\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  v2 = 0;
  __isoc99_scanf("%d", &v2);
  if ( v2 > 0x63 || !*(_QWORD *)(8LL * (int)v2 + a1) )
  {
    printf("%s\n[%sSir Alaric%s]: There is no such plan!\n\n", "\x1B[1;31m", "\x1B[1;33m", "\x1B[1;31m");
    exit(1312);
  }
  free(*(void **)(8LL * (int)v2 + a1));
  *(_QWORD *)(8LL * (int)v2 + a1) = 0LL;
  printf("%s\n[%sSir Alaric%s]: We will remove this plan!\n\n", "\x1B[1;32m", "\x1B[1;33m", "\x1B[1;32m");
  return __readfsqword(0x28u) ^ v3;
}
```

```C
unsigned __int64 __fastcall delete_plan(void **ptr)
{
  unsigned int index; // [rsp+14h] [rbp-Ch] BYREF
  unsigned __int64 v3; // [rsp+18h] [rbp-8h]

  v3 = __readfsqword(0x28u);
  printf("%s\n[%sSir Alaric%s]: Which plan you want to delete?\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  index = 0;
  __isoc99_scanf("%d", &index);
  if ( index > 0x63 || !ptr[index] )
  {
    printf("%s\n[%sSir Alaric%s]: There is no such plan!\n\n", "\x1B[1;31m", "\x1B[1;33m", "\x1B[1;31m");
    exit(1312);
  }
  free(ptr[index]);
  ptr[index] = 0LL;
  printf("%s\n[%sSir Alaric%s]: We will remove this plan!\n\n", "\x1B[1;32m", "\x1B[1;33m", "\x1B[1;32m");
  return __readfsqword(0x28u) ^ v3;
}
```




本來以為會是什麼 UAF 的問題，但看到他這邊有乖乖清掉



## key idea

```C
unsigned __int64 __fastcall edit_plan(__int64 a1)
{
  size_t v1; // rax
  unsigned int v3; // [rsp+14h] [rbp-Ch] BYREF
  unsigned __int64 v4; // [rsp+18h] [rbp-8h]

  v4 = __readfsqword(0x28u);
  printf("%s\n[%sSir Alaric%s]: Which plan you want to change?\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  v3 = 0;
  __isoc99_scanf("%d", &v3);
  if ( v3 > 0x63 || !*(_QWORD *)(8LL * (int)v3 + a1) )
  {
    printf("%s\n[%sSir Alaric%s]: There is no such plan!\n\n", "\x1B[1;31m", "\x1B[1;33m", "\x1B[1;31m");
    exit(1312);
  }
  printf("%s\n[%sSir Alaric%s]: Please elaborate on your new plan.\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  v1 = strlen(*(const char **)(8LL * (int)v3 + a1));
  read(0, *(void **)(8LL * (int)v3 + a1), v1);
  putchar(10);
  return __readfsqword(0x28u) ^ v4;
}
```
```c
unsigned __int64 __fastcall edit_plan(void **ptr)
{
  size_t length; // rax
  unsigned int index; // [rsp+14h] [rbp-Ch] BYREF
  unsigned __int64 v4; // [rsp+18h] [rbp-8h]

  v4 = __readfsqword(0x28u);
  printf("%s\n[%sSir Alaric%s]: Which plan you want to change?\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  index = 0;
  __isoc99_scanf("%d", &index);
  if ( index > 99 || !ptr[index] )
  {
    printf("%s\n[%sSir Alaric%s]: There is no such plan!\n\n", "\x1B[1;31m", "\x1B[1;33m", "\x1B[1;31m");
    exit(1312);
  }
  printf("%s\n[%sSir Alaric%s]: Please elaborate on your new plan.\n\n> ", "\x1B[1;34m", "\x1B[1;33m", "\x1B[1;34m");
  length = strlen((const char *)ptr[index]);
  read(0, ptr[index], length);
  putchar(10);
  return __readfsqword(0x28u) ^ v4;
}
```



這邊修改是直接去讀 data 的長度，但我們知道一塊 chunk 最後的資料會放在下一塊 chunk 的首八個 bytes，剛好這8bytes會緊鄰下一塊 chunk header 紀錄 chunk size 的地方，所以他這邊回傳的 length 會包含這個 chunk size()，`strlen()` 的回傳值就會是原本的大小加上 4bytes，而這多的 4bytes 就可以 overflow，後面的 trick 就很一般，`free_hook` 覆寫 `call free()`

> 值得一提的是，這是我第一次排 heap ，挺有成就感的

```

+------------------------------+
|            8bytes            |
+---------------+--------------+
| pre data/size |     size     | 
--------------------------------
|                              |
|             data             |
|                              |
+--------------+---------------+
 pre data/size |     size      |
       ^
       |______ padding here 我們 strlen 的回傳值就會是 chunk size + 4 bytes(這就是右邊那邊的 size 的地方)_
 

```

對了 要知道 libc address 就用 unsortbin 那招就可以了 

把 chunk 送進 unsortbin，然後要出來，這時候這塊 chunk 的頭就是 `&main_arena` 然後 `show()`，拿到 `&main_arena`，扣掉 offset，就是 libc base address 了，這個 offset 直接 gdb 裡面用 vmmap 看就可以了




> https://github.com/yPin9/CTF-Writeup/tree/main/Cyber_Apocalypse_CTF_2025_Tales_from_Eldoria