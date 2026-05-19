# Script para detener todos los servicios del proyecto INNOVATEC-2025-VZ
# Uso: .\stop-all-services.ps1

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  INNOVATEC-2025-VZ - Deteniendo Servicios" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$ports = @(5000, 5173, 8000)
$stoppedCount = 0

foreach ($port in $ports) {
    Write-Host "Verificando puerto $port..." -NoNewline -ForegroundColor White
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $processes) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host " Deteniendo proceso '$($process.Name)' (PID: $processId)..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                $stoppedCount++
            }
        }
        Write-Host " [OK] Puerto $port liberado." -ForegroundColor Green
    } else {
        Write-Host " Libre." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
if ($stoppedCount -gt 0) {
    Write-Host "  [OK] Se detuvieron $stoppedCount servicios activos." -ForegroundColor Green
} else {
    Write-Host "  No había servicios activos ejecutándose." -ForegroundColor Gray
}
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
