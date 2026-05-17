import { Injectable, Logger } from '@nestjs/common';
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface PrintBillDto {
  billNumber: string;
  createdAt: string;
  cashier: string;
  customer?: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  savedAmount?: number;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeGstin?: string;
}

// C# source compiled once; exposes GetPaths() (SetupDi) and Write() (Win32 CreateFile)
const CS_SRC = `
using System; using System.Runtime.InteropServices; using System.Collections.Generic;
public class InvofyUsbPrint {
  const int DIGCF_PRESENT=2,DIGCF_DEVICEINTERFACE=16;
  const uint GENERIC_WRITE=0x40000000u,FILE_SHARE_RW=3u,OPEN_EXISTING=3u,FILE_ATTR_NORMAL=0x80u;

  [DllImport("setupapi.dll",SetLastError=true)]
  static extern IntPtr SetupDiGetClassDevs(ref Guid g,IntPtr e,IntPtr w,int f);
  [DllImport("setupapi.dll",SetLastError=true)]
  static extern bool SetupDiEnumDeviceInterfaces(IntPtr s,IntPtr dd,ref Guid g,int i,ref SIF id);
  [DllImport("setupapi.dll",SetLastError=true,CharSet=CharSet.Auto)]
  static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr s,ref SIF id,IntPtr dd,int sz,out int r,IntPtr di);
  [DllImport("setupapi.dll",SetLastError=true,CharSet=CharSet.Auto)]
  static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr s,ref SIF id,ref SDD dd,int sz,out int r,IntPtr di);
  [DllImport("setupapi.dll")] static extern bool SetupDiDestroyDeviceInfoList(IntPtr s);
  [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Auto)]
  static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr p,uint c,uint fl,IntPtr t);
  [DllImport("kernel32.dll",SetLastError=true)]
  static extern bool WriteFile(IntPtr h,byte[] b,uint n,out uint w,IntPtr o);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);

  [StructLayout(LayoutKind.Sequential)] struct SIF{public int sz;public Guid g;public int f;public IntPtr r;}
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Auto)]
  struct SDD{public int sz;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=512)]public string p;}

  public static string[] GetPaths(){
    var res=new List<string>();
    var g=new Guid("{28D78FAD-5A12-11D1-AE5B-0000F803A8C2}");
    var h=SetupDiGetClassDevs(ref g,IntPtr.Zero,IntPtr.Zero,DIGCF_PRESENT|DIGCF_DEVICEINTERFACE);
    if(h==(IntPtr)(-1)) return res.ToArray();
    try{
      var id=new SIF(); id.sz=Marshal.SizeOf(id); int i=0;
      while(SetupDiEnumDeviceInterfaces(h,IntPtr.Zero,ref g,i++,ref id)){
        int r; SetupDiGetDeviceInterfaceDetail(h,ref id,IntPtr.Zero,0,out r,IntPtr.Zero);
        var d=new SDD(); d.sz=IntPtr.Size==8?8:6;
        if(SetupDiGetDeviceInterfaceDetail(h,ref id,ref d,r,out r,IntPtr.Zero)) res.Add(d.p);
      }
    } finally { SetupDiDestroyDeviceInfoList(h); }
    return res.ToArray();
  }

  public static bool Write(string path, byte[] data){
    var h=CreateFile(path,GENERIC_WRITE,FILE_SHARE_RW,IntPtr.Zero,OPEN_EXISTING,FILE_ATTR_NORMAL,IntPtr.Zero);
    if(h==(IntPtr)(-1)) return false;
    try { uint w; return WriteFile(h,data,(uint)data.Length,out w,IntPtr.Zero)&&w>0; }
    finally { CloseHandle(h); }
  }
}
`.trim();

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);
  private cachedDevicePath: string | null = null;
  private readonly DLL_PATH = join(tmpdir(), 'invofy_usbprint.dll');

  private line(s = ''): Buffer { return Buffer.from(s + '\n', 'ascii'); }
  private esc(cmd: number[]): Buffer { return Buffer.from(cmd); }
  private formatCurrency(n: number): string { return `Rs.${n.toFixed(2)}`; }

  private padRow(left: string, right: string, width = 42): string {
    const maxLeft = width - right.length - 1;
    const l = left.length > maxLeft ? left.substring(0, maxLeft) : left;
    return l + ' '.repeat(Math.max(1, width - l.length - right.length)) + right;
  }

  buildEscPos(dto: PrintBillDto): Buffer {
    const INIT    = [0x1b, 0x40];
    const CENTER  = [0x1b, 0x61, 0x01];
    const LEFT    = [0x1b, 0x61, 0x00];
    const BOLD_ON = [0x1b, 0x45, 0x01];
    const BOLD_OFF= [0x1b, 0x45, 0x00];
    const DBL_H   = [0x1d, 0x21, 0x01]; // double-height only (no width change)
    const NORMAL  = [0x1d, 0x21, 0x00];
    const CUT     = [0x1d, 0x56, 0x41, 0x50]; // Feed 80 dots (~10mm) then full cut

    const parts: Buffer[] = [];
    const add = (...b: Buffer[]) => parts.push(...b);
    const sep  = () => add(this.line('=========================================='));
    const dash = () => add(this.line('------------------------------------------'));

    add(this.esc(INIT));
    add(this.esc([0x1d, 0x4c, 0x00, 0x00])); // GS L 0 0 — left margin = 0 dots
    add(this.esc([0x1d, 0x57, 0x40, 0x02])); // GS W 576 — print area = full 72mm (576 dots @ 203dpi)
    add(this.esc([0x1b, 0x4d, 0x00]));        // ESC M 0 — font A
    add(this.esc([0x1d, 0x28, 0x4b, 0x02, 0x00, 0x30, 0x08])); // GS ( K fn=48 pm=8 — max density

    // ── Store header (centered) ──────────────────────────
    add(this.esc(CENTER));
    add(this.esc(BOLD_ON), this.esc(DBL_H));
    add(this.line(dto.storeName.substring(0, 42)));
    add(this.esc(NORMAL), this.esc(BOLD_OFF));
    add(this.line(dto.storeAddress.substring(0, 42)));
    add(this.line(`Tel: ${dto.storePhone}`.substring(0, 42)));
    if (dto.storeGstin) add(this.line(`GSTIN: ${dto.storeGstin}`.substring(0, 42)));
    sep();
    add(this.esc(BOLD_ON), this.line('TAX RECEIPT'), this.esc(BOLD_OFF));
    sep();

    // ── Bill info (left) ────────────────────────────────
    add(this.esc(LEFT));
    const d = new Date(dto.createdAt);
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    add(this.line(`Bill No : ${dto.billNumber}`));
    add(this.line(`Date    : ${dateStr}`));
    add(this.line(`Cashier : ${dto.cashier}`));
    if (dto.customer) add(this.line(`Customer: ${dto.customer}`));
    add(this.line(`Payment : ${dto.paymentMethod}`));
    dash();

    // ── Items header ────────────────────────────────────
    add(this.esc(BOLD_ON));
    add(this.line(this.padRow('ITEM NAME', 'AMOUNT')));
    add(this.esc(BOLD_OFF));
    dash();

    // ── Line items ──────────────────────────────────────
    dto.items.forEach((item, i) => {
      add(this.line(`${(i + 1).toString().padStart(2)}. ${item.name.substring(0, 38)}`));
      add(this.line(this.padRow(
        `    ${item.quantity} x ${this.formatCurrency(item.unitPrice)}`,
        this.formatCurrency(item.totalPrice),
      )));
    });

    // ── Totals ──────────────────────────────────────────
    dash();
    add(this.line(this.padRow('Subtotal', this.formatCurrency(dto.subtotal))));
    add(this.line(this.padRow('GST (18%)', this.formatCurrency(dto.taxAmount))));
    if (dto.discountAmount > 0) {
      add(this.line(this.padRow('Discount', `- ${this.formatCurrency(dto.discountAmount)}`)));
    }
    sep();
    add(this.esc(BOLD_ON));
    add(this.line(this.padRow('TOTAL', this.formatCurrency(dto.totalAmount))));
    add(this.esc(BOLD_OFF));
    sep();

    if (dto.savedAmount && dto.savedAmount > 0) {
      add(this.esc(CENTER), this.esc(BOLD_ON));
      add(this.line(`** You saved ${this.formatCurrency(dto.savedAmount)} on this bill! **`));
      add(this.esc(BOLD_OFF));
      add(this.line(''));
    }

    // ── Barcode ─────────────────────────────────────────
    add(this.esc(CENTER));
    add(this.esc([0x1d, 0x48, 0x02]));        // GS H 2 — HRI text printed below barcode
    add(this.esc([0x1d, 0x68, 0x50]));        // GS h 80 — barcode height 80 dots
    add(this.esc([0x1d, 0x77, 0x02]));        // GS w 2 — bar width (narrow, fits 80mm)
    // CODE39 old format (GS k 4 ... NUL): universally supported, NUL-terminated.
    // Bill numbers (A-Z, 0-9, hyphen) are all valid CODE39 characters.
    const barcodeData = Buffer.from(dto.billNumber, 'ascii');
    add(Buffer.from([0x1d, 0x6b, 0x04]), barcodeData, Buffer.from([0x00]));
    add(this.line(''));

    // ── Footer ──────────────────────────────────────────
    add(this.esc(CENTER));
    add(this.line(''));
    add(this.esc(BOLD_ON), this.line('** Thank you for shopping! **'), this.esc(BOLD_OFF));
    add(this.line('Please visit us again'));
    add(this.line(''), this.line(''), this.line(''), this.line(''), this.line(''));
    add(this.esc(CUT));

    return Buffer.concat(parts);
  }

  // First print: compile C# (~10s), discover USB device path, write, cache DLL + path
  private buildFirstRunScript(binPath: string): string {
    const eBin = binPath.replace(/\\/g, '\\\\');
    const eDll = this.DLL_PATH.replace(/\\/g, '\\\\');
    return `
$src = @'
${CS_SRC}
'@
$types = Add-Type -TypeDefinition $src -Language CSharp -PassThru -ErrorAction Stop
try { Copy-Item $types[0].Assembly.Location '${eDll}' -Force -ErrorAction SilentlyContinue } catch {}

$bytes = [System.IO.File]::ReadAllBytes('${eBin}')
$paths = [InvofyUsbPrint]::GetPaths()
Write-Host "PATHS:$([string]::Join(';',$paths))"
if ($paths.Count -eq 0) { Write-Error 'FAILED:nopaths'; exit 1 }

$wasRunning = (Get-Service Spooler).Status -eq 'Running'
if ($wasRunning) { Stop-Service Spooler -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 1000 }
try {
  foreach ($p in $paths) {
    if ([InvofyUsbPrint]::Write($p,$bytes)) { Write-Output "OK:$p"; exit 0 }
  }
  Write-Error 'FAILED:write'; exit 1
} finally {
  if ($wasRunning) { Start-Service Spooler -ErrorAction SilentlyContinue }
}
`.trim();
  }

  // Subsequent prints: load precompiled DLL (~ms), write
  private buildFastWriteScript(binPath: string, devicePath: string): string {
    const eBin = binPath.replace(/\\/g, '\\\\');
    const eDll = this.DLL_PATH.replace(/\\/g, '\\\\');
    return `
if (-not (Test-Path '${eDll}')) { Write-Error 'DLL_MISSING'; exit 2 }
Add-Type -Path '${eDll}'
$bytes = [System.IO.File]::ReadAllBytes('${eBin}')
$wasRunning = (Get-Service Spooler).Status -eq 'Running'
if ($wasRunning) { Stop-Service Spooler -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 1000 }
try {
  if ([InvofyUsbPrint]::Write('${devicePath}',$bytes)) { Write-Output 'OK'; exit 0 }
  Write-Error 'FAILED:write'; exit 1
} finally {
  if ($wasRunning) { Start-Service Spooler -ErrorAction SilentlyContinue }
}
`.trim();
  }

  private runPs(script: string, timeoutMs = 35000): { out: string; err: string } {
    const tmp = join(tmpdir(), `rtp80_${Date.now()}.ps1`);
    try {
      writeFileSync(tmp, script, 'utf8');
      const r = spawnSync('powershell', ['-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmp], {
        timeout: timeoutMs, encoding: 'utf8',
      });
      return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
    } finally {
      if (existsSync(tmp)) unlinkSync(tmp);
    }
  }

  private async writeBuffer(data: Buffer): Promise<{ success: boolean; message: string }> {
    const tmpBin = join(tmpdir(), `receipt_${Date.now()}.bin`);
    try {
      writeFileSync(tmpBin, data);

      if (!this.cachedDevicePath || !existsSync(this.DLL_PATH)) {
        this.logger.log('First print — compiling C# and discovering USB device (~10s)…');
        const { out, err } = this.runPs(this.buildFirstRunScript(tmpBin), 40000);
        this.logger.log(`First-run: ${out}`);
        if (err) this.logger.warn(`First-run stderr: ${err.substring(0, 300)}`);

        const pathsLine = out.split('\n').find(l => l.startsWith('PATHS:'));
        if (pathsLine) {
          const paths = pathsLine.replace('PATHS:', '').split(';').filter(Boolean);
          if (paths.length > 0) this.cachedDevicePath = paths[0].trim();
        }

        const success = out.includes('OK:');
        const msg = out.split('\n').find(l => l.startsWith('OK:')) ?? err.substring(0, 300) ?? out;
        return { success, message: msg };
      }

      const { out, err } = this.runPs(this.buildFastWriteScript(tmpBin, this.cachedDevicePath));
      this.logger.log(`Fast write: ${out}`);
      if (err) this.logger.warn(`Fast write stderr: ${err.substring(0, 200)}`);

      if (out === 'OK') return { success: true, message: 'OK' };

      this.cachedDevicePath = null;
      return { success: false, message: err.substring(0, 300) || out };
    } finally {
      if (existsSync(tmpBin)) unlinkSync(tmpBin);
    }
  }

  async print(dto: PrintBillDto): Promise<{ success: boolean; message: string }> {
    return this.writeBuffer(this.buildEscPos(dto));
  }

  buildRuler(): Buffer {
    const parts: Buffer[] = [];
    const add = (...b: Buffer[]) => parts.push(...b);
    add(this.esc([0x1b, 0x40]));             // INIT
    add(this.esc([0x1d, 0x4c, 0x00, 0x00])); // GS L 0
    add(this.esc([0x1d, 0x57, 0x40, 0x02])); // GS W 576
    add(this.esc([0x1b, 0x4d, 0x00]));       // Font A
    add(this.line('=== ALIGNMENT RULER ==='));
    add(this.line('         1111111111222222222233333333334444'));
    add(this.line('1234567890123456789012345678901234567890XX'));
    add(this.line('|    5    |   15    |   25    |   35  42|'));
    add(this.line(''));
    add(this.line('NOTE LEFTMOST VISIBLE NUMBER'));
    add(this.line(''));
    add(this.esc([0x1d, 0x56, 0x42, 0x10])); // CUT
    return Buffer.concat(parts);
  }

  async printTest(): Promise<{ success: boolean; message: string }> {
    return this.writeBuffer(this.buildRuler());
  }
}
