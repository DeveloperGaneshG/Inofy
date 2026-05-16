param([string]$FilePath, [string]$PrinterName)

$source = @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBuf, int cbBuf, out int pcWritten);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DOCINFO {
        [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string pDataType;
    }
    public static bool SendRaw(string printer, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        if (!OpenPrinter(printer, out hPrinter, IntPtr.Zero)) return false;
        try {
            DOCINFO di = new DOCINFO { pDocName = "Receipt", pDataType = "RAW" };
            if (StartDocPrinter(hPrinter, 1, ref di) == 0) return false;
            if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); return false; }
            int written = 0;
            WritePrinter(hPrinter, data, data.Length, out written);
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            return written > 0;
        } finally {
            ClosePrinter(hPrinter);
        }
    }
}
"@

Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$ok = [RawPrint]::SendRaw($PrinterName, $bytes)
if ($ok) { Write-Output "OK" } else { Write-Error "FAILED"; exit 1 }
