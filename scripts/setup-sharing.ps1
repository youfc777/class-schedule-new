# 双机文件共享配置脚本
Write-Host "=== 配置文件共享 ===" -ForegroundColor Green

# 1. 将直连以太网设为专用网络
$adapter = Get-NetAdapter -Name "*以太网*","*Ethernet*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($adapter) {
    Set-NetConnectionProfile -InterfaceIndex $adapter.InterfaceIndex -NetworkCategory Private
    Write-Host "[OK] 以太网已设为专用网络" -ForegroundColor Green
}

# 2. 创建共享文件夹
$sharePath = "E:\SharedFiles"
if (-not (Test-Path $sharePath)) { New-Item -ItemType Directory -Path $sharePath -Force }
net share SharedFiles="$sharePath" /grant:everyone,FULL 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] 共享文件夹: $sharePath" -ForegroundColor Green
} else {
    Write-Host "[!] 共享可能已存在或创建失败" -ForegroundColor Yellow
}

# 3. 开放防火墙
netsh advfirewall firewall add rule name="SMB直连共享" dir=in protocol=tcp localport=445 remoteip=192.168.1.0/24 action=allow 2>$null
Write-Host "[OK] 防火墙 SMB 规则已添加" -ForegroundColor Green

# 4. 显示共享信息
Write-Host ""
Write-Host "=== 共享信息 ===" -ForegroundColor Cyan
net share
Write-Host ""
Write-Host "对端电脑访问地址: \\192.168.1.10\SharedFiles" -ForegroundColor Cyan
Write-Host "按任意键关闭..."
$null = Read-Host
